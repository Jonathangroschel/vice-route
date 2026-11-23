# Tarefas 004: Mapa interativo

- **Plano:** [plan.md](plan.md)

Regras: cada tarefa cabe em um PR pequeno, cita a história que atende e tem verificação objetiva. `[P]` marca tarefas que podem rodar em paralelo.

## Fase A: fundação

- [ ] T01 Esquema zod de `mapa.yaml` e arquivo inicial da edição `leonida-poster-2026-11-19` (tamanho, recorte, tiles, zoom). Verificação: validação no `catalog:check`.
- [ ] T02 [P] Script `tooling/tiles`: baixa a imagem oficial da Rockstar, aplica o recorte e gera a pirâmide 512 px z0–4 em webp (decisão já registrada no ADR 003). Verificação: tile `0/0/0.webp` acessível no preview da Vercel e total < 25 MB.
- [ ] T03 [P] Sprite de ícones de categoria gerado pelo `catalog-build`. Verificação: atlas e mapa de coordenadas gerados para todas as categorias de `categorias.yaml`.
- [ ] T04 `MapaLeonida.vue` com Leaflet `CRS.Simple`, tiles e conversão pixel da imagem ↔ Leaflet com y invertido (H1). Verificação: unitário de ida e volta de coordenadas; E2E mostra Leonida enquadrada.

## Fase B: H1, marcadores

- [ ] T05 `cluster.worker.ts` com Supercluster e agregação por categoria. Verificação: unitário com 2 mil pontos sintéticos em < 50 ms.
- [ ] T06 `CamadaMarcadores.ts` em canvas: grupos com contagem e anel segmentado, nós com ícone, hit test (H1). Verificação: CO-004-02; teste de fps com 2 mil nós.
- [ ] T07 Estilos por status do motor e selo de confiança (H1.3, H1.4). Verificação: teste visual com nós em cada status.
- [ ] T08 Spoiler nos marcadores (H1.5). Verificação: CO-004-01.

## Fase C: H2 e H3, marcar e detalhe

- [ ] T09 Toque longo e clique direito com cancelamento por arrasto e aviso de desfazer (H2). Verificação: E2E marca, desfaz e desmarca.
- [ ] T10 `DetalheNo.vue` com status, dicas, condições de momento, janela de perda, fontes, ações (H3). Verificação: teste de componente por status.
- [ ] T11 "O que falta" no detalhe com itens clicáveis (H3.2). Verificação: nó bloqueado de fixture mostra a cadeia do motor.

## Fase D: H4 e H5, filtros e busca

- [ ] T12 `PainelCamadas.vue` com categorias, tipos, status, personagem, ocultar concluídos; persistência por jogada (H4). Verificação: CO-004-04; filtros sobrevivem a recarregar.
- [ ] T13 [P] `CampoBusca.vue` com MiniSearch, normalização e atalho de filtro por categoria (H5). Verificação: E2E busca "carta" sem acento encontra "Cartas"; nó com spoiler não aparece pelo nome.

## Fase E: H6 e H7

- [ ] T14 "Estou aqui" e marcador de posição salvo no estado da jogada; aviso de posição antiga (H6). Verificação: E2E define posição e "Perto de mim" ordena por distância.
- [ ] T15 [P] Página `/no/[id]` com aliases e ID inexistente (H7). Verificação: CO-004-03.

## Fase F: fechamento

- [ ] T16 Service worker com cache de tiles e shell; mapa offline (RF-004-15). Verificação: E2E offline após uma visita mostra tiles vistos e marcadores.
- [ ] T17 Faixa de alerta da spec 007 integrada ao mapa (RF-004-14). Verificação: fixture com perdível na próxima missão mostra a faixa.
- [ ] T18 Lighthouse CI na rota `/` com orçamento de JS e LCP (RNF-004-01, RNF-004-05). Verificação: CI falha se passar do orçamento.
- [ ] T19 Cenários-ouro CO-004-* na suíte do CI.
- [ ] T20 Documentação: como gerar e publicar tiles, como ajustar `mapa.yaml`.
