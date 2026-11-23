# Tarefas 004: Mapa interativo

- **Plano:** [plan.md](plan.md)

Regras: cada tarefa cabe em um PR pequeno, cita a história que atende e tem verificação objetiva. `[P]` marca tarefas que podem rodar em paralelo.

## Fase A: fundação

- [x] T01 Esquema zod de `mapa.yaml` e arquivo inicial da edição `leonida-poster-2026-11-19` (tamanho, recorte, tiles, zoom). Verificação: validação no `catalog:check`.
- [x] T02 [P] Script `tooling/tiles`: baixa a imagem oficial da Rockstar, aplica o recorte e gera a pirâmide 512 px z0–4 em webp (decisão já registrada no ADR 003). Verificação: tile `0/0/0.webp` acessível no preview da Vercel e total < 25 MB. _(23/11: `pnpm tiles:gerar <pôster>`; com o pôster web (2805 × 3840) a pirâmide vai até z3, 65 tiles, 1,6 MB; o imprimível oficial (zip de 45 MB) permite z4.)_
- [ ] T03 [P] Sprite de ícones de categoria gerado pelo `catalog-build`. Verificação: atlas e mapa de coordenadas gerados para todas as categorias de `categorias.yaml`.
- [x] T04 `MapaLeonida.vue` com Leaflet `CRS.Simple`, tiles e conversão pixel da imagem ↔ Leaflet com y invertido (H1). Verificação: unitário de ida e volta de coordenadas; E2E mostra Leonida enquadrada. _(23/11: CRS próprio com transformação 1/16 e deslocamento do recorte; latlng = [y, x].)_

## Fase B: H1, marcadores

- [ ] T05 `cluster.worker.ts` com Supercluster e agregação por categoria. Verificação: unitário com 2 mil pontos sintéticos em < 50 ms. _(23/11: substituída por agrupamento em grade no espaço da imagem (`utils/agrupar.ts`), sem Supercluster, que assume coordenadas geográficas.)_
- [ ] T06 `CamadaMarcadores.ts` em canvas: grupos com contagem e anel segmentado, nós com ícone, hit test (H1). Verificação: CO-004-02; teste de fps com 2 mil nós. _(23/11: marcadores em `divIcon` só para o que está no enquadramento; canvas fica para se o desempenho pedir.)_
- [x] T07 Estilos por status do motor e selo de confiança (H1.3, H1.4). Verificação: teste visual com nós em cada status.
- [x] T08 Spoiler nos marcadores (H1.5). Verificação: CO-004-01. _(23/11: nomes e rótulos acessíveis respeitam o teto; ícone genérico por tipo pendente.)_

## Fase C: H2 e H3, marcar e detalhe

- [ ] T09 Toque longo e clique direito com cancelamento por arrasto e aviso de desfazer (H2). Verificação: E2E marca, desfaz e desmarca. _(23/11: parcial: clique direito e toque longo do Leaflet marcam com aviso de desfazer; cancelamento por arrasto e E2E pendentes.)_
- [x] T10 `DetalheNo.vue` com status, dicas, condições de momento, janela de perda, fontes, ações (H3). Verificação: teste de componente por status.
- [x] T11 "O que falta" no detalhe com itens clicáveis (H3.2). Verificação: nó bloqueado de fixture mostra a cadeia do motor.

## Fase D: H4 e H5, filtros e busca

- [x] T12 `PainelCamadas.vue` com categorias, tipos, status, personagem, ocultar concluídos; persistência por jogada (H4). Verificação: CO-004-04; filtros sobrevivem a recarregar. _(23/11: categorias, ocultar concluídos, futuros e perdidos, persistidos no dispositivo; filtros por personagem e status pendentes.)_
- [x] T13 [P] `CampoBusca.vue` com MiniSearch, normalização e atalho de filtro por categoria (H5). Verificação: E2E busca "carta" sem acento encontra "Cartas"; nó com spoiler não aparece pelo nome. _(23/11: busca própria sem acento/caixa sobre `search-index.json`, sem MiniSearch.)_

## Fase E: H6 e H7

- [ ] T14 "Estou aqui" e marcador de posição salvo no estado da jogada; aviso de posição antiga (H6). Verificação: E2E define posição e "Perto de mim" ordena por distância. _(23/11: parcial: botão "Estou aqui" e marcador salvos no dispositivo; aviso de posição antiga e "Perto de mim" pendentes.)_
- [x] T15 [P] Página `/no/[id]` com aliases e ID inexistente (H7). Verificação: CO-004-03.

## Fase F: fechamento

- [ ] T16 Service worker com cache de tiles e shell; mapa offline (RF-004-15). Verificação: E2E offline após uma visita mostra tiles vistos e marcadores. _(pendente)_
- [x] T17 Faixa de alerta da spec 007 integrada ao mapa (RF-004-14). Verificação: fixture com perdível na próxima missão mostra a faixa.
- [ ] T18 Lighthouse CI na rota `/` com orçamento de JS e LCP (RNF-004-01, RNF-004-05). Verificação: CI falha se passar do orçamento. _(23/11: medido à mão: 131 KB gzip de JS no total; Lighthouse CI pendente.)_
- [ ] T19 Cenários-ouro CO-004-* na suíte do CI.
- [x] T20 Documentação: como gerar e publicar tiles, como ajustar `mapa.yaml`. _(23/11: DESENVOLVIMENTO.md.)_
