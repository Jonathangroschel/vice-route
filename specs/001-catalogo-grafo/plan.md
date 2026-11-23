# Plano técnico 001: Catálogo e grafo de progressão

- **Spec:** [spec.md](spec.md)
- **Status:** rascunho

## 1. Resumo da abordagem

O catálogo vive em YAML em `data/`. Um pacote de esquema (`packages/catalog-schema`) define os tipos com zod e exporta tanto os validadores quanto os tipos TypeScript. Um CLI (`packages/catalog-build`) carrega os arquivos, valida o esquema, resolve referências, roda as validações de grafo, compila os artefatos estáticos e o pré-cálculo, e compara com a versão publicada anterior. O mesmo CLI roda localmente (`pnpm catalog:check`) e no CI. A saída vai para `apps/web/public/catalog/`, servida pela CDN da Vercel. Escolhemos arquivos estáticos em vez de banco porque o catálogo é igual para todos, muda poucas vezes por dia e precisa de revisão humana por PR (princípios 5 e 13).

## 2. Módulos afetados

| Módulo | Mudança |
|---|---|
| `packages/catalog-schema` | Novo. Esquemas zod: `ImagemBase`, `Categoria` (com `RegraCem`, `Conjunto`), `Regiao`, `Capitulo`, `Variavel`, `No`, `Condicao`, `CondicaoMomento`, `Janela`, `Fonte`; tipos compilados `CatalogoCompilado`, `PreCalculo`, `Manifest` |
| `packages/catalog-build` | Novo. CLI com comandos `check`, `build`, `report`, `notes` |
| `data/` | Novo. Arquivos de exemplo mínimos (fixture realista com a cadeia de docs/04 §7) até a spec 002 povoar |
| `golden/catalogo/` | Novo. Catálogos de fixture e asserções CO-001-* |
| `apps/web/public/catalog/` | Saída do build (ignorada no git, gerada no deploy) |
| `.github/workflows/ci.yml` | Passo `pnpm catalog:check` e comentário de relatório no PR |
| `package.json` (raiz) | Scripts `catalog:check`, `catalog:build`, `catalog:report` |

## 3. Contratos

- Esquema do catálogo: `packages/catalog-schema/src/*.ts` (zod). Exporta `parseNo`, `parseCatalogoFonte`, tipos inferidos.
- Formato compilado (consumido pelo app e pelo motor):

```ts
interface Manifest { versao: string; gerado_em: string; arquivos: Record<string, { caminho: string; sha256: string; bytes: number }>; }

interface CatalogoCompilado {
  versao: string;
  categorias: Categoria[]; regioes: Regiao[]; capitulos: Capitulo[]; variaveis: Variavel[];
  nos: NoCompilado[];             // ordenados por id; sem fontes[].obs
  aliases: Record<string, string>; // alias -> id final (cadeias resolvidas)
}

interface PreCalculo {
  ordem_principais: { id: string; indice: number }[];
  descendentes: Record<string, string[]>;
  valor_desbloqueio: Record<string, { total: number; conta_100: number; perdiveis: number }>;
  perdiveis_por_missao: Record<string, { inicio: string[]; conclusao: string[] }>;
  clusters: { regiao: string; centro: { x: number; y: number }; nos: string[] }[];
}
```

- Códigos de erro de validação (estáveis, usados pelos cenários-ouro): `ESQUEMA`, `ID_DUPLICADO`, `REF_QUEBRADA`, `CICLO`, `JANELA_INVERTIDA`, `NASCE_PERDIDO`, `TOTAL_CATEGORIA`, `ID_REMOVIDO`, `ALIAS_DUPLICADO`, `ALIAS_CICLO`, `SPOILER_MINIMO`, `FORA_DO_MAPA`, `DEPRECIADO_REFERENCIADO`. Avisos: `VARIAVEL_NAO_USADA`, `MARCO_INALCANCAVEL`, `SEM_POSICAO`, `SEM_DURACAO`.

## 4. Modelo de dados

Arquivos em `data/` (fonte da verdade):

| Arquivo | Conteúdo |
|---|---|
| `mapa.yaml` | `ImagemBase`: edição, origem, tamanho, recorte, tiles, escala, transformação da edição anterior (ADR 003) |
| `categorias.yaml` | lista de `Categoria`, com `total`, `regra_100` e conjuntos (quando houver) |
| `regioes.yaml` | lista de `Regiao` e limites globais do mapa |
| `capitulos.yaml` | lista de `Capitulo` |
| `variaveis.yaml` | lista de `Variavel` |
| `gatilhos.yaml` | nós `gatilho` e `marco` |
| `itens/<categoria>.yaml` | nós `item` de uma categoria |
| `missoes/principais.yaml` | nós `missao` subtipo `principal`, em ordem |
| `missoes/secundarias.yaml`, `missoes/ocultas.yaml` | demais missões |

Nenhuma tabela no Supabase. A versão publicada anterior é obtida baixando `https://<dominio>/catalog/manifest.json` e o `catalog.json` correspondente; em PRs, a do último deploy de produção. Reversão: reverter o commit de dados; o build seguinte publica nova versão (versões não são reescritas).

## 5. Fluxos

```
pnpm catalog:check
  carregar YAML (yaml, com posição de linha)
  → validar esquema (zod) por arquivo
  → indexar ids e aliases
  → resolver referências
  → grafo de requer: detectar ciclos (Tarjan)
  → ordem topológica das principais
  → validar janelas e alcançabilidade (NASCE_PERDIDO)
  → totais por categoria
  → comparar com versão publicada (ID_REMOVIDO)
  → compilar em memória + pré-cálculo
  → rodar golden/ (motor da spec 008 quando existir; antes, só asserções de pré-cálculo)
  → imprimir erros agrupados por arquivo; sair com código 1 se houver erro

pnpm catalog:build (deploy)
  check → gravar artefatos com versão → manifest.json → notas de versão
```

**Alcançabilidade (NASCE_PERDIDO):** para cada nó com `perdivel_apos`, calcular o menor índice de campanha em que `requer` pode ser satisfeito, assumindo que todo nó alcançável é concluído assim que entra na janela. Para `concluido: X`, usa-se o índice mais cedo de X; `todos` pega o máximo; `qualquer` o mínimo; `pelo_menos n` o n-ésimo menor; `nao` e `variavel` são tratados como satisfazíveis desde o `disponivel_desde` da variável. Se o índice resultante ≥ índice do `perdivel_apos`, erro.

**Clusters:** DBSCAN simples por região com raio configurável (padrão 150 px da imagem-base), só para nós com posição e não depreciados.

## 6. Decisões e alternativas descartadas

| Decisão | Alternativa | Por que não |
|---|---|---|
| YAML no repositório | Tabelas no Supabase com painel admin | Exige moderação no app (fora do escopo), perde revisão por PR, gasta banco |
| YAML | JSON | YAML aceita comentários e é mais legível em diff para contribuidores |
| zod | JSON Schema puro | Um único lugar para tipos TS e validação; JSON Schema pode ser gerado do zod para editores |
| Arestas derivadas de `requer` | Arquivo de arestas separado | Duplicaria informação e permitiria divergência |
| Saída determinística | Ordem natural de leitura | Hash estável é necessário para cache e para diff entre versões |
| Um `catalog.json` único no MVP | Divisão por região | Tamanho estimado cabe na meta; dividir depois se medir acima |

## 7. Estratégia de teste

- Unitário: cada validador com fixture válida e inválida (código de erro esperado); avaliação de alcançabilidade com casos de `todos`, `qualquer`, `pelo_menos`, `nao`.
- Integração: catálogo de fixture completo em `golden/catalogo/` compilado de ponta a ponta; snapshot dos artefatos.
- Determinismo: build duas vezes, comparar bytes.
- Cenários-ouro do motor (CO-001-*): asserções sobre `precomputed.json` e códigos de erro.
- Desempenho: catálogo sintético de 5 mil nós gerado em teste; `check` < 60 s e tamanhos dentro de RNF-001-02/03.

## 8. Observabilidade e operação

- Saída do CLI legível em terminal e em formato de anotação do GitHub Actions (`::error file=...,line=...`).
- Relatório de cobertura como comentário no PR (atualiza o mesmo comentário).
- Limites do plano gratuito afetados: transferência da Vercel; mitigado por cache imutável e gzip/brotli.

## 9. Segurança e privacidade

- Nenhum dado pessoal no catálogo. Crédito a contribuidores fica nas notas de versão por apelido (spec 010).
- Campos de texto (nome, dicas) são renderizados como texto puro no app; o esquema limita tamanho (nome ≤ 120, dica ≤ 280 caracteres) e rejeita HTML.
- URLs em `fontes` validadas como `https`.

## 10. Implantação

- Sem feature flag: é fundação.
- Ordem: `catalog-schema` → `catalog-build` → CI → deploy gerando `public/catalog/`.
- Rollback: reverter commit de dados; nova versão é publicada.

## 11. Checagem contra a constituição

Nenhum princípio violado. Princípios 5, 6, 7, 13 e 21 atendidos diretamente.
