# Desenvolvimento

Monorepo TypeScript com pnpm e Turborepo, no mesmo padrão do Zovix.

## Requisitos

- Node 24 (`.nvmrc`)
- pnpm 10 (`corepack enable` instala a versão de `packageManager`)

```bash
pnpm install
pnpm verify          # formatação, tipos, testes e catalog:check
```

## Estrutura

| Pasta | O que é | Spec |
|---|---|---|
| `apps/web` | App Nuxt 4 (SPA estática): mapa Leaflet com tiles próprios, pinos agrupados, detalhe, busca, filtros, progresso, próximos passos e perdíveis do motor num Web Worker | 004 |
| `tooling/tiles` | Gera a pirâmide de tiles a partir do pôster oficial (`pnpm tiles:gerar`) | 004 |
| `packages/catalog-schema` | Esquema zod do catálogo (nós, condições, categorias, mapa) e tipos compilados | 001 |
| `packages/catalog-build` | CLI `check`, `build` e `report`: carrega `data/`, valida o grafo, compila e pré-calcula | 001 |
| `packages/engine` | Motor de recomendação: status, risco, pontuação, motivos e consultas ([README](packages/engine/README.md)) | 008 |
| `tooling/importers` | Importadores das fontes abertas e pontos de controle da transformação afim | 002 |
| `data/` | O catálogo em YAML (fonte da verdade) e `FONTES.md` com créditos | 001, 002 |
| `golden/catalogo/` | Cenários-ouro do catálogo: `data/` + `esperado.yaml`; também servem de catálogos de teste do motor | 001 |
| `golden/motor/` | Cenários-ouro do motor: catálogo de teste ou o catálogo real (`real-*.yaml`) + estado + asserções | 008 |

## App web

```bash
pnpm --filter @vice-route/web dev       # compila o catálogo e sobe o Nuxt em http://localhost:3000
pnpm --filter @vice-route/web build     # site estático em apps/web/.output/public (Vercel)
```

O progresso fica no `localStorage` do navegador até a spec 003 (contas). O motor roda num Web Worker (`app/workers/motor.worker.ts`).

## Tiles do mapa

```bash
pnpm tiles:gerar caminho/do/poster.jpg
```

Usa `data/mapa.yaml` (edição, recorte, tamanho do tile), grava `apps/web/public/tiles/<edicao>/{z}/{x}/{y}.webp` e atualiza `zoom_nativo_max` conforme a resolução da imagem: o pôster web da Rockstar (2805 × 3840) vai até z3; o imprimível oficial (`Leonida_Map_Poster_Printable.zip`, 45 MB, 5775 × 7900) vai até z4.

## Catálogo

O Turborepo inclui `data/` e `golden/` no hash das tarefas (`globalDependencies`): mudar um dado invalida o cache dos testes.

```bash
pnpm catalog:check   # valida e roda os cenários-ouro; é o mesmo passo do CI
pnpm catalog:report  # cobertura por categoria, regra de 100% e contagens
pnpm catalog:build   # grava apps/web/public/catalog/<versao>/ e manifest.json (deploy)
```

Códigos de erro e aviso estão em `packages/catalog-build/src/problemas.ts`. Erros param o CI; avisos (cobertura incompleta, item sem conjunto, total excedido) aparecem no relatório.

## Importadores

```bash
pnpm import:limiares                 # categorias.yaml e capitulos.yaml (GTA6Maps, CC BY 4.0)
pnpm import:controle                 # recalcula os pontos de controle da transformação afim
pnpm import:open-gta6-map --dry-run  # simula e mostra o relatório
pnpm import:open-gta6-map            # grava data/itens/*.yaml e o relatório
pnpm levantamento:missoes            # primeira passada de missões, gatilhos e janelas (não sobrescreve sem --forcar)
```

- As fontes são baixadas num commit fixado e guardadas em `tooling/importers/cache/` (fora do git). `FONTE_COMMIT=<sha>` fixa a versão manualmente.
- Re-importar preserva IDs (casamento por `ids_fonte`) e campos de curadoria (nome traduzido, dicas, requisitos, janelas, status confirmado, posição verificada). Itens que somem da fonte nunca são apagados: aparecem no relatório.
- Relatórios de cada execução ficam em `tooling/importers/relatorios/`.
- O mapeamento de tipos das fontes para categorias do Vice Route está em `tooling/importers/src/categorias.ts`.
- `LIMITE_RESIDUO_PX` (padrão 100) define o resíduo médio máximo da transformação afim; acima disso a importação falha sem escrever nada.
