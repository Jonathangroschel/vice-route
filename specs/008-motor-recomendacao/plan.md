# Plano técnico 008: Motor de recomendação

- **Spec:** [spec.md](spec.md)
- **Status:** rascunho

## 1. Resumo da abordagem

O motor é o pacote `packages/engine`, TypeScript puro, sem dependências de execução além dos tipos de `packages/catalog-schema`. Ele recebe o catálogo compilado, os artefatos pré-calculados (`precomputed.json`) e o estado da jogada, e devolve um `Resultado` imutável. No app, roda num Web Worker exposto por Comlink; em Node, roda nos testes, nos cenários-ouro e no `catalog-build` (pré-cálculo e rota de referência por capítulo). Tudo que depende só do catálogo é calculado no build, para que o trabalho por jogador seja linear e barato. A ordem de todas as listas é estável e desempatada por ID, garantindo determinismo.

## 2. Módulos afetados

| Módulo | Mudança |
|---|---|
| `packages/engine` | Novo: normalização, avaliador de `requer`, classificação, risco, pontuação, consultas, templates de motivos |
| `packages/catalog-schema` | Tipos `Condicao`, `Atomo`, `Janela` exportados para o motor; tipo `Precomputed` |
| `packages/catalog-build` | Gera `precomputed.json` usando funções puras do motor (`ordemTopologica`, `descendentes`, `perdiveisPorMissao`, `clusters`) |
| `apps/web` | Worker `engine.worker.ts`, composable `useMotor()`, store Pinia que dispara recálculo com debounce |
| `golden/` | Formato de cenário e runner |
| `.github/workflows/ci.yml` | Job `golden` disparado por mudanças em `packages/engine/**` ou `data/**` |

## 3. Contratos

API pública de `packages/engine` (assinaturas; nomes finais em pt-BR, como no restante do código de domínio):

```ts
export type Perfil = 'cacador100' | 'equilibrio' | 'historiaPrimeiro';

export interface EstadoJogada {
  versaoCatalogo: string;
  concluidos: ReadonlyArray<string>;          // IDs, podem conter aliases
  ultimaPrincipal: string | null;              // id da última missão principal concluída
  principalEmAndamento?: string | null;        // iniciada e não concluída (momento: inicio)
  personagem: 'jason' | 'lucia' | null;
  variaveis: Readonly<Record<string, string | number | boolean>>;
  posicao?: { x: number; y: number } | null;
  perfil: Perfil;
  categoriasFavoritas: ReadonlyArray<string>;
  categoriasIgnoradas: ReadonlyArray<string>;
  tetoSpoiler: 0 | 1 | 2 | 3;
  revelados: ReadonlyArray<string>;            // nós revelados individualmente (spec 009)
}

export interface Parametros {
  kRisco?: number;            // padrão 2
  n?: number;                 // padrão 10
  raio?: number;              // pixels da imagem-base
  pesos?: Partial<Pesos>;
  priors?: Priors | null;     // spec 014
}

export type Status = 'concluido' | 'perdido' | 'futuro' | 'bloqueado' | 'disponivel';

export interface ResultadoNo {
  id: string;
  status: Status;
  emRisco: boolean;
  missoesAtePerder: number | null;
  faltantes: ReadonlyArray<AtomoFaltante>;
  instrucoes: ReadonlyArray<CondicaoMomento>;
  pontuacao: number;
  motivos: ReadonlyArray<Motivo>;
}

export interface Motivo { codigo: CodigoMotivo; params: Record<string, string | number>; frase: string; }

export interface Resultado {
  versaoCatalogo: string;
  nos: ReadonlyMap<string, ResultadoNo>;
  proximos: ReadonlyArray<string>;
  perdiveisPorMissao: ReadonlyArray<{ missao: string; momento: 'inicio' | 'conclusao'; nos: string[] }>;
  avisos: ReadonlyArray<Aviso>;
}

export function recomendar(c: Catalogo, p: Precomputed, e: EstadoJogada, prm?: Parametros): Resultado;
export function proximosPassos(r: Resultado, n?: number): ResultadoNo[];
export function perdiveis(r: Resultado): Resultado['perdiveisPorMissao'];
export function antesDeAvancar(c: Catalogo, p: Precomputed, r: Resultado, missao: string): { aoIniciar: string[]; aoConcluir: string[] };
export function checklistCapitulo(c: Catalogo, r: Resultado, capitulo: number): ChecklistCapitulo;
export function oQueFalta(c: Catalogo, r: Resultado, id: string, opts?: { recursivo?: boolean }): AtomoFaltante[];
export function pertoDeMim(c: Catalogo, r: Resultado, pos: Ponto, raio: number): Array<ResultadoNo & { distancia: number }>;
export function planoSessao(...args: unknown[]): { erro: 'nao_implementado' }; // spec 011

// usadas no build (catalog-build) e reexportadas para testes
export function ordemTopologica(c: Catalogo): string[];
export function descendentes(c: Catalogo): Map<string, Set<string>>;
export function perdiveisPorMissaoBuild(c: Catalogo): PerdiveisIndex;
export function clusters(c: Catalogo, raio: number): ClusterIndex;
```

Worker (Comlink): expõe `carregar(catalogo, precomputed)`, `calcular(estado, parametros)` e as consultas, trafegando objetos serializáveis (arrays em vez de `Map` na fronteira).

Nada incompatível: é contrato novo.

## 4. Modelo de dados

Sem tabelas. Arquivos envolvidos:

- Lê: `catalog.json` e `precomputed.json` (spec 001), `priors.json` opcional (spec 014).
- `precomputed.json` ganha, por esta spec: `ordemPrincipais` (id → índice), `descendentes` (id → ids, só para nós com descendentes), `valorDesbloqueio` (id → {total, conta100, perdiveis}), `perdiveisPorMissao` (missão + momento → ids), `clusters` (id → idCluster, densidade base).
- `categorias.yaml` ganha `duracao_padrao_min` [A ESCLARECER na spec 001].

Estruturas internas por cálculo: arrays indexados por inteiro (o build atribui um índice denso a cada ID) para evitar alocação de `Map` no caminho quente.

## 5. Fluxos

**Recalcular após marcar um item**

```
UI marca item ─► store progresso (IndexedDB, fila sync) ─► debounce 150 ms
   ─► worker.calcular(estado) ─► recomendar() ─► Resultado serializado
   ─► store motor ─► telas reativas (mapa, próximos, capítulo)
```

**Pipeline interno de `recomendar`**

```
normalizar(estado)          aliases → fecho implícito das principais → pré-requisitos de concluídos
posicaoCampanha()           índice da última principal, principal em andamento, capítulo
para cada nó (ordem do índice):
   janela → futuro | perdido
   avaliar(requer) → satisfeito? faltantes mínimos
   personagem
   status base
riscos()                    missoesAtePerder; em_risco se ≤ K; propagação reversa pelos faltantes
pontuar()                   fórmula §3.5 com pesos do perfil ⊕ sobrescritas ⊕ priors
ordenar()                   regra fixa (perdível na próxima) > pontuação desc > id asc
explicar()                  motivos → templates pt-BR → spoiler aplicado
```

**Avaliador de `requer`**: recursivo, devolve `{ ok: boolean, faltantes: Atomo[], custo: number }`. `todos` une faltantes; `qualquer` escolhe a alternativa com menor `custo` (soma de durações dos faltantes), desempate por ID; `pelo_menos` ordena alternativas não satisfeitas por custo e pega as `n - satisfeitas` mais baratas; `nao` devolve faltante especial `CAMINHO_EXCLUIDO` quando o interno está satisfeito por nó concluído.

**Propagação de risco**: para cada nó `em_risco` ou perdível bloqueado, percorre os faltantes do tipo `concluido` e atribui `urgenciaHerdada = max(atual, urgência do dependente)`; um passo de cada vez até estabilizar (o grafo é acíclico, então termina em profundidade máxima da cadeia).

## 6. Decisões e alternativas descartadas

| Decisão | Alternativa | Por que não |
|---|---|---|
| Função pura com recálculo completo | Motor incremental com invalidação fina | Recalcular 2 mil nós custa poucos ms; incremental complica e arrisca inconsistência. Reavaliar se RNF-008-02 falhar |
| Pré-cálculo no build | Calcular descendentes e ordem no cliente | Igual para todos; desperdiça CPU do celular e atrasa a primeira tela |
| Índices inteiros densos | `Map<string, ...>` em todo lugar | Desempenho e memória no caminho quente |
| Comlink no Worker | `postMessage` manual | Menos código, tipagem preservada; custo de bundle pequeno (~1 KB) |
| Templates de texto no motor | Templates na UI | Mantém spoiler e frases testáveis nos cenários-ouro; a UI só renderiza |
| Desempate por ID | Desempate aleatório ou por inserção | Determinismo (princípio 11) |
| Pesos constantes por perfil | Aprendidos desde o início | Sem dados para aprender; calibração na spec 014 |

## 7. Estratégia de teste

- **Unitário (Vitest)**: avaliador de `requer` com tabela de casos para cada operador e átomo; janelas com `momento` início e conclusão; normalização (aliases, fecho implícito); propagação de risco; templates com e sem spoiler.
- **Propriedade (fast-check)**: grafos acíclicos aleatórios: nenhum nó em dois status; `concluido` nunca aparece em `proximos`; todo nó de `proximos` é `disponivel` ou `em_risco` ou destrava perdível; determinismo (mesma entrada, mesmo hash).
- **Cenários-ouro (CO-008-*)**: arquivos `golden/motor/*.yaml` com `catalogo` (fixture mínima ou `real`), `estado`, `parametros` e `espera` (asserções declarativas: `status`, `posicao_em_proximos`, `contem_em_antes_de_avancar`, `texto_nao_contem`). Runner em `packages/engine/test/golden.test.ts`.
- **Desempenho**: benchmark Vitest (`bench`) com o catálogo real; limite de regressão de 20% no CI; medição manual em celular intermediário antes de cada release.
- **Integração no app**: teste com Worker real (Vitest browser mode ou Playwright) carregando o catálogo e calculando um estado.

## 8. Observabilidade e operação

- No app, em modo desenvolvimento: tempo de cada `calcular` no console e painel de depuração com status de um nó e seus faltantes.
- Em produção, amostragem anônima opcional do tempo de cálculo (p50/p95), sem estado do jogador. [A ESCLARECER: guardar onde? Proposta: não guardar na fase MVP.]
- Sem impacto nos limites do plano gratuito.

## 9. Segurança e privacidade

- O motor não faz rede nem lê armazenamento; recebe tudo por parâmetro.
- Textos de dicas vindos da comunidade são tratados como texto puro; o motor nunca os interpreta.
- Nenhum dado pessoal sai do dispositivo por causa do motor.

## 10. Implantação

- Entra junto com o catálogo inicial; sem feature flag (o app depende dele).
- Versão do motor exposta em `ENGINE_VERSION`; `precomputed.json` registra a versão do motor que o gerou. Incompatibilidade de versão força recarga do catálogo.
- Rollback: reverter o deploy da Vercel; nada a migrar.

## 11. Checagem contra a constituição

Nenhum princípio violado. Princípios 2, 3, 4, 9, 11, 12, 21 e 22 são atendidos diretamente por este desenho.
