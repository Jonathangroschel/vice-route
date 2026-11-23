# Plano técnico 002: Levantamento e importação de dados

- **Spec:** [spec.md](spec.md)
- **Status:** rascunho

## 1. Resumo da abordagem

Um pacote de ferramentas em `tooling/importers/` com um núcleo comum (casamento, mesclagem, relatório, escrita atômica de YAML) e um adaptador por fonte. O primeiro adaptador lê o JSON estático do Vice Atlas (`map-data/leonida.json`, Map Data Schema v1); o adaptador é a única parte que conhece a fonte e o resto trabalha com um formato intermediário normalizado. Como as posições já estão em pixels da mesma imagem-base (ADR 003), a transformação de coordenadas é a identidade, só conferida pelo `basemap.id`. A mesclagem segue uma regra simples: campos "de fonte" podem ser sobrescritos pela importação; todos os outros pertencem à curadoria e são preservados. O levantamento manual de missões, gatilhos e janelas não tem importador: é guiado por documento, template de PR e pelas validações da spec 001.

## 2. Módulos afetados

| Módulo | Mudança |
|---|---|
| `tooling/importers/core` | Novo. Tipos normalizados, casamento, mesclagem, relatório, escrita atômica |
| `tooling/importers/vice-atlas` | Novo. Adaptador `FonteAdapter` do Map Data Schema v1, checagem do `basemap.id`, cache bruto |
| `tooling/importers/open-gta6-map` | Novo. Adaptador do `locations.json` (CC BY 4.0), `controle.yaml` com pontos de controle, respeito a `removed.json` |
| `tooling/importers/limiares` | Novo. Leitor do `completion-100-thresholds.json` do GTA6Maps para `categorias.yaml` e `capitulos.yaml` |
| `tooling/importers/core/afim.ts` | Novo. Ajuste afim por mínimos quadrados, aplicação e resíduos |
| `tooling/importers/duracoes` | Novo. Preenchimento de `duracao_min` padrão |
| `packages/catalog-schema` | Usa os esquemas da spec 001; acrescenta tabela `duracao_padrao_min` em `Categoria` |
| `data/` | Povoado pela importação e pelo levantamento |
| `.github/PULL_REQUEST_TEMPLATE/dados.md` | Novo. Checklist de fontes, spoiler, janelas, decisões de importação |
| `CONTRIBUTING.md` | Seção "Levantamento de missões e gatilhos" |
| `package.json` (raiz) | Scripts `import:vice-atlas`, `import:duracoes` |

## 3. Contratos

```ts
interface ItemFonte {
  id_fonte: string;
  categoria_fonte: string;
  nome: string;
  nome_original?: string;
  posicao: { x: number; y: number; qualidade: 'verificada'|'aproximada'; representa: string }; // pixels da imagem-base
  url?: string;
  extras?: Record<string, unknown>;    // descrição, dica, imagem (não persistida)
}

interface CategoriaFonte { id_fonte: string; nome: string; total_declarado?: number; icone_url?: string; cor?: string; }

interface FonteAdapter {
  nome: string;                         // "vice-atlas"
  urlBase: string;
  listarCategorias(): Promise<CategoriaFonte[]>;
  listarItens(): Promise<ItemFonte[]>;
  mapaCategorias: Record<string, string>; // id_fonte -> id de categoria do catálogo
}

type TipoCasamento = 'mantido' | 'movido' | 'renomeado' | 'novo' | 'ambiguo' | 'ausente';
```

Mapeamento do Open GTA 6 Map (`public/data/locations.json`) para o catálogo:

| Open GTA 6 Map | Vice Route | Observação |
|---|---|---|
| `id` | `id_fonte`; ID do nó `item:<categoria>-<id>` na primeira importação | Estável na fonte (removidos ficam em `removed.json`) |
| `kind` / `type` | `categoria` (via `mapaCategorias`) / `subtipo`; para cartas, `type` define o `conjunto` | Ex.: `bridge` → `sob-a-ponte`, `card` + "Jack Of Hearts card" → `cartas`, conjunto `jack-of-hearts` |
| `x`, `y` | `posicao.x`, `posicao.y` após `afim.aplicar` | Unidades do mapa → pixels da imagem-base |
| `name` | `nome_original`; `nome` até tradução | |
| `description` | `dicas[0]` com `spoiler: 1`, se não vazio | |
| `area`, `region` | `regiao` (via `mapaRegioes`), conferido pelos limites de `regioes.yaml` | |
| `confidence` | `status`: `community` → `referencia`; vazio → `nao_confirmado` | |
| `screenshot` | Não copiado; link em `fontes[]` | NÃO DEVE baixar imagens (RF-002-12) |

Pontos de controle (`controle.yaml`): pares `{ nome, fonte: {x, y}, base: {x, y} }` com marcos visíveis nas duas bases. O ajuste afim usa no mínimo 6 pares; o relatório traz resíduo médio, máximo e o par pior ajustado.

Mapeamento do Vice Atlas (Map Data Schema v1) para o catálogo:

| Vice Atlas | Vice Route | Observação |
|---|---|---|
| `key` | `id_fonte`; ID do nó `item:<categoria>-<key>` na primeira importação | Chave estável usada para casar nas re-importações |
| `name` | `nome_original`; `nome` igual até tradução | |
| `category` / `subcategory` | `categoria` (via `mapaCategorias`) / `subtipo` | `vehicles` → `veiculos`, `weapons` → `armas`, `places` → `lugares` |
| `position.x`, `position.y` | `posicao.x`, `posicao.y` | Só se `basemap.id` for igual ao de `data/mapa.yaml`; senão, falha |
| `position.quality` | `posicao.qualidade` | `verified` → `verificada`, `approximate` → `aproximada` |
| `position.represents` | `posicao.representa` | `point`, `entrance`, `search_area` |
| `directions` | `dicas[0]` com `spoiler: 1` | |
| `conditions.prerequisites[]` | `obs` para o curador transformar em `requer` | Texto livre, não vira condição automaticamente |
| `availability` | `obs` | `conditional` sinaliza revisão |
| `spoiler_level` | `spoiler` (mapa `none` → 1, demais a revisar) | |
| `evidence.confirmation`, `evidence.source` | `fontes[]` (`tipo: referencia`, URL do `hub`) e `status` | `rockstar` → `oficial` |
| `retired[]` | candidatos a `depreciado` no relatório | Nunca remove ID |

Campos de fonte (sobrescrevíveis): `nome_original`, `posicao` (só se o nó não estiver `confirmado`), `fontes[]` da própria fonte. Campo `nome` só é sobrescrito se ainda for igual ao `nome_original` anterior (não traduzido à mão). Todos os demais campos são da curadoria.

## 4. Modelo de dados

- Saída: arquivos de `data/` no formato da spec 001. Nenhuma tabela no Supabase.
- `tooling/importers/vice-atlas/cache/` (no `.gitignore`): resposta bruta da última execução.
- `tooling/importers/vice-atlas/relatorios/*.md` (versionado): um relatório por execução real.
- Reversão: reverter o commit da importação.

## 5. Fluxos

```
pnpm import:vice-atlas [--dry-run] [--usar-cache]
  adaptador.listarCategorias/listarItens (ou cache)
  → normalizar e conferir basemap.id (sem conversão de coordenadas)
  → carregar catálogo atual (loader da spec 001)
  → casar por categoria:
       0. mesma chave de fonte (key) → mantido (ou movido, se a posição mudou)
       1. distância ≤ tol_exata (5 px) e mesma categoria → mantido
       2. distância ≤ tol_movido (50) e nome similar (≥ 0,85) → movido
       3. mesmo nome, distância maior, único candidato → renomeado/movido para revisão
       4. mais de um candidato no mesmo critério → ambíguo
       5. sem par na fonte → ausente; sem par no catálogo → novo
  → mesclar (regra de campos de fonte)
  → alocar IDs novos: maior NNN já usado na categoria (inclusive depreciados e aliases) + 1
  → validar em memória com catalog:check (spec 001)
  → dry-run: imprimir relatório; real: gravar todos os arquivos em diretório temporário, trocar de uma vez, salvar relatório
```

Casamento global ótimo: dentro de cada categoria, emparelhamento por menor distância (algoritmo húngaro ou guloso ordenado por distância), para não casar dois itens da fonte com o mesmo nó.

Levantamento manual:
```
curador ou agente de codificação pesquisa fonte pública
  → transcreve para data/missoes/*.yaml, gatilhos.yaml (com fontes[].url)
  → pnpm catalog:check (referências, janelas, NASCE_PERDIDO)
  → PR com template de dados → preview → revisão → merge
```

## 6. Decisões e alternativas descartadas

| Decisão | Alternativa | Por que não |
|---|---|---|
| Open GTA 6 Map como fonte principal de pinos, convertido para a imagem-base | Adotar as unidades e os tiles do Open GTA 6 Map como sistema próprio | Tiles deles têm ~200 MB; a imagem-base oficial já é a nossa e o contorno deles foi traçado sobre ela, então uma afim resolve |
| Adaptador por fonte | Script único acoplado ao Vice Atlas | Formato da fonte é incerto e pode mudar; outras fontes virão |
| Nunca remover no import | Remover ausentes | Viola princípio 7; referência pode ter erro temporário |
| Casamento por posição + nome | Usar `id_fonte` como chave | IDs da fonte podem mudar e não queremos depender deles; `id_fonte` é guardado em `fontes[].ref` só como pista |
| Escrita atômica por diretório temporário | Escrever arquivo a arquivo | Falha no meio deixaria catálogo parcial |
| Levantamento manual guiado | Raspador de wikis | Wikis têm formatos heterogêneos; transcrição revisada dá dado mais confiável e registra origem |

## 7. Estratégia de teste

- Unitário: casamento (cada tipo), mesclagem (campos preservados e sobrescritos), alocação de IDs (ignora depreciados e aliases), transformação de coordenadas.
- Integração: adaptador falso com fixture JSON; ciclo completo vazio → importado → re-importado.
- Cenários-ouro do motor (CO-002-*): rodam com o adaptador falso no CI.
- Contrato do adaptador real: teste manual (não roda no CI para não depender da fonte), com `--usar-cache` em CI para reprocessar a última resposta bruta, se versionada como fixture anonimizada.
- Desempenho: fixture sintética de 2 mil itens; RNF-002-01.

## 8. Observabilidade e operação

- Relatório em Markdown no terminal e em arquivo.
- Código de saída diferente para "fonte indisponível" (2) e "validação falhou" (1).
- Runbook curto no README do importador: como rodar, como decidir ausentes e ambíguos.

## 9. Segurança e privacidade

- Nenhum dado pessoal.
- Requisições à fonte com intervalo, user agent genérico do projeto e cache local, para não sobrecarregar o site de referência.
- Conteúdo da fonte tratado como dado: texto limitado e sem HTML, validado pelo esquema.

## 10. Implantação

- Sem feature flag. Importação inicial vira um PR grande revisado por categoria (um commit por categoria).
- Ordem: core → afim e pontos de controle → limiares (GTA6Maps) → adaptador Open GTA 6 Map → adaptador Vice Atlas (conferência) → primeira importação → durações padrão → levantamento das principais → secundárias e ocultas → gatilhos e janelas.

## 11. Checagem contra a constituição

Nenhum princípio violado. Princípios 6, 7 e 8 atendidos diretamente.
