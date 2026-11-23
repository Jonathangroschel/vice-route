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
| `packages/catalog-schema` | Esquema zod do catálogo (nós, condições, categorias, mapa) e tipos compilados | 001 |
| `packages/catalog-build` | CLI `check`, `build` e `report`: carrega `data/`, valida o grafo, compila e pré-calcula | 001 |
| `packages/engine` | Motor de recomendação: status, risco, pontuação, motivos e consultas ([README](packages/engine/README.md)) | 008 |
| `tooling/importers` | Importadores das fontes abertas e pontos de controle da transformação afim | 002 |
| `data/` | O catálogo em YAML (fonte da verdade) e `FONTES.md` com créditos | 001, 002 |
| `golden/catalogo/` | Cenários-ouro do catálogo: `data/` + `esperado.yaml`; também servem de catálogos de teste do motor | 001 |
| `golden/motor/` | Cenários-ouro do motor: catálogo + estado + asserções | 008 |

## Catálogo

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
```

- As fontes são baixadas num commit fixado e guardadas em `tooling/importers/cache/` (fora do git). `FONTE_COMMIT=<sha>` fixa a versão manualmente.
- Re-importar preserva IDs (casamento por `ids_fonte`) e campos de curadoria (nome traduzido, dicas, requisitos, janelas, status confirmado, posição verificada). Itens que somem da fonte nunca são apagados: aparecem no relatório.
- Relatórios de cada execução ficam em `tooling/importers/relatorios/`.
- O mapeamento de tipos das fontes para categorias do Vice Route está em `tooling/importers/src/categorias.ts`.
- `LIMITE_RESIDUO_PX` (padrão 100) define o resíduo médio máximo da transformação afim; acima disso a importação falha sem escrever nada.
