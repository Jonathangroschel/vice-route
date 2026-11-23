# Plano técnico 004: Mapa interativo

- **Spec:** [spec.md](spec.md)
- **Status:** rascunho

## 1. Resumo da abordagem

Leaflet com `CRS.Simple` exibe a pirâmide de tiles da imagem-base oficial; as posições do catálogo já estão em pixels dessa imagem (ADR 003), e `mapa.yaml` declara edição, tamanho, recorte, níveis de zoom e escala estimada pixel → metro. Os marcadores não são camadas Leaflet individuais: o Supercluster agrupa os nós visíveis num Web Worker e o mapa desenha só os agrupamentos e nós do enquadramento atual, numa camada de canvas própria (um `L.Layer` que pinta círculos, anéis e ícones), o que mantém 60 fps com ~2 mil nós. O status de cada nó vem do motor (spec 008) e o progresso da store da spec 003. Busca usa o `search-index.json` pré-compilado com MiniSearch. O detalhe do nó é um componente Vue que lê catálogo, status e `oQueFalta`.

## 2. Módulos afetados

| Módulo | Mudança |
|---|---|
| `apps/web/components/mapa/` | `MapaLeonida.vue`, `CamadaMarcadores.ts` (canvas), `BotaoTema.vue`, `MarcadorPosicao.ts` |
| `apps/web/components/no/` | `DetalheNo.vue` (folha inferior/painel), `SeloConfianca.vue` |
| `apps/web/components/filtros/` | `PainelCamadas.vue` (olho), store `filtros` por jogada |
| `apps/web/components/busca/` | `CampoBusca.vue`, `useBusca` com MiniSearch |
| `apps/web/workers/cluster.worker.ts` | Supercluster: indexar, `getClusters(bbox, zoom)`, agregação por categoria |
| `apps/web/pages/no/[id].vue` | Link direto com resolução de aliases |
| `packages/catalog-schema` | Esquema de `mapa.yaml` (limites, zoom, transformação, URL base dos tiles) |
| `packages/catalog-build` | Ícones de categoria em sprite único (SVG → atlas PNG/WebP para o canvas) |

## 3. Contratos

- `mapa.yaml` (catálogo): `{ edicao: leonida-poster-2026-11-19, origem: {url, credito, publicada}, tamanho: {largura: 5775, altura: 7900}, recorte: {x: 200, y: 200, largura: 5376, altura: 7500}, tiles: {url: /tiles/{edicao}/{z}/{x}/{y}.webp, tamanho: 512, zoom_nativo_max: 4, zoom_max: 5}, escala_m_por_px?: number, transformacao_da_edicao_anterior?: {a, b, c, d, e, f} }`.
- Worker de agrupamento:
  ```ts
  interface ClusterWorker {
    indexar(nos: { id: string; x: number; y: number; categoria: string | null; tipo: string }[]): void;
    agrupamentos(bbox: [number, number, number, number], zoom: number):
      ({ tipo: 'grupo'; id: number; x: number; y: number; total: number; porCategoria: Record<string, number> }
     | { tipo: 'no'; id: string; x: number; y: number })[];
    expandir(grupoId: number): { zoom: number; centro: [number, number] };
  }
  ```
- Consumo do motor (spec 008): `statusDe(ids)`, `oQueFalta(id)`, `pertoDeMim(pos, raio)`.
- Consumo do progresso (spec 003): `marcar(id, origem)`, `desmarcar(id)`, `desfazer()`, `definirPosicao(pos)`.
- Consumo do spoiler (spec 009): `rotuloVisivel(no)`, `podeMostrar(no, campo)`.

## 4. Modelo de dados

Nenhuma tabela nova. Filtros e câmera ficam no IndexedDB por jogada (`filtros:<jogada_id>`, `camera:<jogada_id>`). A posição do jogador é campo de `estado_jogada` (spec 003). Tiles e sprite de ícones são estáticos versionados com o catálogo.

## 5. Fluxos

**Carga inicial**
```
rota / ─► shell Nuxt (SSR mínimo, CSS crítico) ─► manifest.json
       ─► catalog.json (cache IndexedDB se hash igual) ─► cluster.worker.indexar()
       ─► Leaflet inicia tiles em paralelo ─► camada canvas pinta agrupamentos do enquadramento
       ─► motor calcula status (spec 008) ─► repinta com status
```

**Mover ou dar zoom**: evento `moveend` (com throttle de 16 ms durante o gesto) → `agrupamentos(bbox, zoom)` no worker → camada repinta. Filtros são aplicados antes de indexar: mudar filtro reindexa só o conjunto filtrado (< 50 ms para 2 mil pontos).

**Toque longo**: `pointerdown` inicia timer de 500 ms; `pointermove` acima de 10 px cancela; ao disparar, faz hit test na camada canvas, chama `marcar` e mostra o aviso de desfazer.

**Link direto `/no/<id>`**: resolve alias pelo catálogo → `setView` no nó com zoom máximo do agrupamento → abre `DetalheNo`.

## 6. Decisões e alternativas descartadas

| Decisão | Alternativa | Por que não |
|---|---|---|
| Leaflet + `CRS.Simple` | MapLibre GL | MapLibre exige projeção Mercator; adaptar pixels de imagem é possível mas mais frágil; Leaflet atende ao volume com canvas. Reavaliar se o desempenho não atingir RNF-004-03. |
| Camada canvas própria | Um `L.Marker` por nó | Milhares de elementos DOM derrubam o fps no celular. |
| Supercluster em worker | `Leaflet.markercluster` | markercluster opera em DOM e não permite o anel por categoria com bom desempenho. |
| MiniSearch sobre índice pré-compilado | Busca no Supabase | Busca precisa funcionar offline e sem custo de banco. |
| Sprite único de ícones | SVG por marcador | Desenho em canvas com atlas é muito mais rápido. |

## 7. Estratégia de teste

- Unitário: transformação de coordenadas jogo ↔ Leaflet; cálculo do anel segmentado (CO-004-02); filtros; normalização de busca (acentos, caixa).
- Componente (Vitest + Vue Test Utils): `DetalheNo` por status; spoiler sem nome no DOM nem no `aria-label` (CO-004-01).
- E2E (Playwright, viewport de celular): carga, busca, toque longo com desfazer, ocultar concluídos (CO-004-04), link direto com alias (CO-004-03), offline com tiles em cache.
- Desempenho: Lighthouse CI na rota `/` com perfil móvel 4G (RNF-004-01, RNF-004-05); teste de fps com 2 mil nós sintéticos via `performance.now()` em gestos simulados (RNF-004-03).

## 8. Observabilidade e operação

- Web Vitals (LCP, INP, CLS) coletados pelo Vercel Speed Insights no plano gratuito, se couber; senão, só Lighthouse CI.
- Contador local de buscas sem resultado, enviado agregado junto com a sincronização? `[A ESCLARECER: coletar buscas sem resultado exige consentimento e uma tabela nova; manter fora do MVP?]`
- Transferência de tiles acompanhada no painel da Vercel contra a cota gratuita.

## 9. Segurança e privacidade

- Nenhum dado pessoal novo; a posição do jogador no mapa fica só no dispositivo (spec 003).
- Textos de nós (incluindo os vindos da comunidade) renderizados como texto, nunca `v-html`.
- Tiles servidos com cabeçalhos de cache longo e sem cookies.

## 10. Implantação

- Service worker (via `@vite-pwa/nuxt`) com cache dos tiles visitados (estratégia "cache primeiro", limite de 300 MB, expiração por versão do mapa) e do shell.
- Tiles publicados no destino escolhido antes do deploy do app que aponta para eles (`tiles_url` versionado).
- Tiles gerados por `tooling/tiles` (sharp/libvips) a partir da imagem oficial e versionados em `apps/web/public/tiles/<edicao>/`; publicados no mesmo deploy do app (ADR 003).
- Rollback: reverter deploy; `tiles_url` antigo continua publicado.

## 11. Checagem contra a constituição

Nenhum princípio violado. Princípio 3 (spoiler) coberto por teste de DOM; princípio 13 (plano gratuito) atendido: pirâmide de ~20 MB na Vercel.
