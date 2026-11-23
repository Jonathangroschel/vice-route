# Spec 004: Mapa interativo

- **Status:** rascunho para revisão
- **Responsável:** [nome]
- **Depende de:** 001 (catálogo compilado, categorias, regiões), 003 (progresso e jogada ativa), 009 (nível de spoiler); consome 008 (status dos nós) e 007 (faixa de perdível)
- **Referências:** [docs/02-dados-referencias.md](../../docs/02-dados-referencias.md), [docs/03-arquitetura.md](../../docs/03-arquitetura.md), [docs/07-interface-web.md](../../docs/07-interface-web.md)
- **Última revisão:** 23/11/2026

## 1. Contexto e problema

O mapa é a tela principal e a primeira impressão do produto: o jogador precisa ver onde estão os itens de Leonida, filtrar o que interessa, esconder o que já pegou e marcar progresso com um toque, no celular, ao lado do console. A referência (Vice Atlas) define o padrão esperado: marcadores agrupados com anel colorido por categoria, camadas, busca e folha inferior com progresso. Esta spec cobre o mapa, os marcadores, os filtros, a busca e o detalhe do nó. As abas da folha inferior têm specs próprias (005 a 008).

## 2. Objetivos e não objetivos

**Objetivos**
- Exibir o mapa oficial de Leonida (imagem-base da Rockstar, ADR 003) em pixels da imagem, com zoom e arrasto fluidos no celular
- Mostrar todos os nós com posição, agrupados quando próximos, com a cor da categoria
- Filtrar por categoria, tipo, status e personagem, e ocultar concluídos
- Buscar qualquer nó por nome, alias ou categoria
- Abrir o detalhe de um nó e marcar ou desmarcar a partir do mapa
- Permitir que o jogador indique onde está, para uso do motor
- Abrir o mapa centrado num nó por link direto

**Fora do escopo**
- Rota desenhada no mapa (spec 011)
- Edição de posição de itens no mapa (sugestão de item novo pertence à spec 010)
- Geração dos tiles a partir da imagem de origem (spec 002)
- Localização automática do jogador (não existe integração com o console)

## 3. Histórias de usuário

### H1 (P1): ver o mapa com todos os itens

Como jogador, quero abrir o site e ver o mapa de Leonida com os itens, para saber o que existe perto de onde estou no jogo.

**Critérios de aceite**
1. Dado o primeiro acesso, quando o app carrega, então o mapa aparece enquadrando Leonida inteira, com os nós agrupados em marcadores circulares que mostram a contagem e um anel segmentado nas cores das categorias contidas.
2. Dado um zoom maior, quando os nós se separam, então cada nó aparece com o ícone e a cor da sua categoria (ou ícone de tipo para missões e gatilhos).
3. Dado um nó concluído, quando visível, então aparece esmaecido com sinal de concluído, salvo se "ocultar concluídos" estiver ativo.
4. Dado um nó com status `nao_confirmado` ou `contestado`, quando visível, então tem um selo discreto de confiança.
5. Dado um nó cujo nível de spoiler é maior que o do jogador, quando visível, então aparece com ícone genérico do tipo, sem nome (spec 009).

### H2 (P1): marcar pelo mapa

Como jogador, quero marcar um item direto no mapa, sem navegar para outra tela.

**Critérios de aceite**
1. Dado um nó pendente, quando faço toque longo (500 ms) ou clique com o botão direito no desktop, então ele é marcado como concluído, com vibração curta quando o dispositivo permite, e um aviso "Marcado · Desfazer" aparece por 5 s.
2. Dado o aviso de desfazer, quando toco em desfazer, então a marcação é revertida (spec 003, H3).
3. Dado um nó concluído, quando faço toque longo, então ele é desmarcado com o mesmo aviso de desfazer.
4. Dado um toque simples num nó, quando ocorre, então abre o detalhe, sem marcar.

### H3 (P1): detalhe do nó

Como jogador, quero ver tudo sobre um item: o que é, onde está, se está disponível e o que preciso fazer antes.

**Critérios de aceite**
1. Dado um toque num nó, quando o detalhe abre (folha inferior no celular, painel lateral no desktop), então mostra: nome (respeitando spoiler), categoria, região, status do motor (concluído, disponível, bloqueado, futuro, perdido, em risco), dicas, condições de momento como instrução, fontes e confiança.
2. Dado um nó bloqueado, quando o detalhe abre, então mostra "O que falta" com a cadeia de pré-requisitos vinda do motor (`oQueFalta`, spec 008), cada item clicável.
3. Dado um nó perdível, quando o detalhe abre, então mostra quando ele some ("Some ao iniciar a missão …", com spoiler aplicado).
4. Dado o detalhe aberto, quando toco em Marcar, Confirmar ou Reportar, então a ação correspondente é executada (spec 003, spec 010).
5. Dado o detalhe aberto, quando toco em "Compartilhar", então o link `/no/<id>` é copiado.

### H4 (P1): filtrar camadas e ocultar concluídos

Como jogador, quero ver só o que me interessa agora.

**Critérios de aceite**
1. Dado o botão de camadas (olho), quando toco, então vejo a lista de categorias e tipos com contador e cor, cada um com liga e desliga, mais "mostrar todas" e "esconder todas".
2. Dado filtros de status (pendente, disponível agora, em risco) e de personagem, quando aplico, então só os nós correspondentes ficam no mapa, e os agrupamentos são recalculados.
3. Dado "ocultar concluídos" ativo, quando marco um item, então ele some do mapa depois do aviso de desfazer expirar.
4. Dado filtros configurados, quando volto ao app depois, então eles continuam aplicados (preferência local por jogada).

### H5 (P1): buscar

Como jogador, quero digitar o nome de um item ou lugar e ir direto até ele.

**Critérios de aceite**
1. Dado o campo "Buscar em Leonida", quando digito ao menos 2 caracteres, então vejo resultados em até 100 ms, sem acentuação nem caixa influenciando, ordenados por relevância, com ícone da categoria e região.
2. Dado um resultado, quando toco, então o mapa centraliza e dá zoom no nó e abre o detalhe.
3. Dado a busca por nome de categoria ("cartas"), quando executada, então oferece também "Filtrar só Cartas Colecionáveis".
4. Dado nós acima do nível de spoiler, quando busco, então eles só aparecem pelo rótulo neutro, nunca pelo nome escondido.

### H6 (P2): informar minha posição

Como jogador, quero indicar no mapa onde estou no jogo, para receber recomendações por proximidade.

**Critérios de aceite**
1. Dado o botão "Estou aqui", quando toco e depois toco num ponto do mapa, então um marcador de posição é colocado e salvo no estado da jogada (spec 003).
2. Dado uma posição definida, quando abro "Perto de mim", então o motor (spec 008) ordena os disponíveis por distância e pontuação.
3. Dado uma posição antiga (mais de 2 h), quando abro o app, então o marcador aparece esmaecido com "atualizar posição?".

### H7 (P2): link direto

Como jogador, quero abrir um link para um item e cair no mapa já nele.

**Critérios de aceite**
1. Dado o endereço `/no/<id>`, quando acesso, então o mapa abre centrado no nó com o detalhe aberto.
2. Dado um ID que virou alias, quando acesso, então sou levado ao nó atual.
3. Dado um ID inexistente, quando acesso, então o mapa abre normal com o aviso "Item não encontrado".

## 4. Requisitos funcionais

| ID | Requisito |
|---|---|
| RF-004-01 | O mapa DEVE usar pixels da imagem-base declarada em `data/mapa.yaml` (x, y; origem no canto superior esquerdo, y para baixo), sem projeção geográfica. |
| RF-004-02 | O mapa DEVE carregar tiles em pirâmide `z/x/y.webp`, com limite de enquadramento em Leonida. |
| RF-004-03 | O sistema DEVE agrupar nós próximos em marcadores com contagem e anel segmentado proporcional às categorias contidas. |
| RF-004-04 | O sistema DEVE exibir cada nó com ícone e cor da categoria, ou ícone de tipo para missões, gatilhos e marcos. |
| RF-004-05 | O sistema DEVE refletir no marcador o status do motor: concluído (esmaecido), em risco (destaque), perdido (riscado), futuro (oculto por padrão). |
| RF-004-06 | O sistema DEVE permitir filtrar por categoria, tipo, status e personagem, e ocultar concluídos. |
| RF-004-07 | O sistema DEVE guardar os filtros por jogada no dispositivo. |
| RF-004-08 | O sistema DEVE marcar ou desmarcar por toque longo (500 ms) ou clique direito, com desfazer por 5 s. |
| RF-004-09 | O sistema DEVE abrir o detalhe do nó com toque simples, com nome, categoria, região, status, dicas, condições de momento, "o que falta", janela de perda, fontes, confiança e ações. |
| RF-004-10 | O sistema DEVE oferecer busca por nome, alias e categoria, insensível a acentos e caixa, usando `search-index.json`. |
| RF-004-11 | O sistema NÃO DEVE exibir nome, dica ou descrição acima do nível de spoiler do jogador em marcador, detalhe ou busca. |
| RF-004-12 | O sistema DEVE permitir definir a posição do jogador tocando no mapa e salvá-la no estado da jogada. |
| RF-004-13 | O sistema DEVE suportar a rota `/no/<id>`, resolvendo aliases. |
| RF-004-14 | O sistema DEVE exibir a faixa fixa de alerta de perdível da spec 007 sobre o mapa quando houver. |
| RF-004-15 | O mapa DEVE funcionar offline para tiles já vistos e para o catálogo em cache. |
| RF-004-16 | O sistema DEVE oferecer tema escuro (padrão) e claro, com o botão de tema sobre o mapa. |

## 5. Requisitos não funcionais

| ID | Requisito | Meta |
|---|---|---|
| RNF-004-01 | Tempo até o mapa interativo em 4G, primeira visita | < 3 s (p75) |
| RNF-004-02 | Tempo até o mapa interativo, visita seguinte (cache) | < 1 s (p75) |
| RNF-004-03 | Fluidez de zoom e arrasto com todos os nós visíveis | 60 fps em celular intermediário, sem queda abaixo de 30 fps |
| RNF-004-04 | Reagrupamento ao mudar filtro ou zoom | < 50 ms para ~2 mil nós |
| RNF-004-05 | JavaScript inicial da rota do mapa | < 250 KB gzip |
| RNF-004-06 | Alvos de toque | ≥ 44 px; marcadores com rótulo acessível |
| RNF-004-07 | Peso dos tiles por sessão típica | < 15 MB |

## 6. Casos de borda e falhas

- Tiles indisponíveis (servidor fora ou offline sem cache): fundo neutro com grade e marcadores funcionando.
- Catálogo novo carregado com o mapa aberto: marcadores atualizados sem perder posição de câmera nem filtros.
- Nó sem posição (missão sem ponto de início conhecido): não aparece no mapa, aparece na busca com "sem posição no mapa".
- Muitos nós no mesmo ponto exato (ex.: andares de um prédio): agrupamento nunca se desfaz; ao tocar no último nível de zoom, abre lista dos nós.
- Toque longo que vira arrasto: cancelado se o dedo se mover mais de 10 px.
- Item de área (polígono): desenhado como área translúcida, com marcador no centroide.
- Filtro que esconde todos os nós: mensagem "Nenhum item com estes filtros" com botão de limpar.
- Jogada trocada com o mapa aberto: status e marcadores atualizados, filtros da nova jogada aplicados.
- Navegador sem WebGL ou dispositivo fraco: renderização em canvas do Leaflet, que não depende de WebGL.

## 7. Entidades e eventos (conceitual)

- **Nó** (do catálogo, spec 001): posição, categoria, tipo, spoiler, status de confiança.
- **Status do nó** (do motor, spec 008): concluído, disponível, bloqueado, futuro, perdido, em risco.
- **Categoria**: id, nome, cor, ícone, total.
- **Agrupamento**: conjunto de nós visíveis próximos num zoom; contagem por categoria.
- **Filtro de mapa**: categorias e tipos ligados, status, personagem, ocultar concluídos; por jogada, local.
- **Posição do jogador**: ponto ou região, com momento; parte do estado da jogada (spec 003).
- Eventos: `no.selecionado`, `progresso.alterado`, `posicao.alterada`, `filtros.alterados`.

## 8. Cenários-ouro (se toca o motor ou o agente)

| ID | Estado de entrada | Resultado esperado | Como é verificado |
|---|---|---|---|
| CO-004-01 | Nó de spoiler 2, jogador com teto 1 | Marcador genérico, sem nome no DOM nem no rótulo acessível; busca não encontra pelo nome | Teste de componente + asserção no DOM |
| CO-004-02 | 3 nós de duas categorias no mesmo agrupamento | Contagem 3 e anel com dois segmentos proporcionais (2/3 e 1/3) | Teste unitário do cálculo do anel |
| CO-004-03 | `/no/item:antigo` com alias para `item:novo` | Mapa centrado em `item:novo` | E2E |
| CO-004-04 | "Ocultar concluídos" ligado, marcar item | Item some após 5 s; desfazer antes disso mantém o item | E2E |

## 9. Métricas de sucesso

- Tempo até o mapa interativo medido em produção (Web Vitals: LCP, INP)
- Percentual de marcações feitas pelo mapa versus pela lista
- Uso da busca e taxa de busca sem resultado (indica lacuna no catálogo ou nos aliases)
- Percentual de sessões com posição definida

## 10. Checagem contra a constituição

- [x] Ajuda a decidir o próximo passo (princípio 1): status do motor e "o que falta" no mapa
- [x] Perdíveis avisados antes (2) e nível de spoiler respeitado (3)
- [x] Funciona sem IA e sem token (4)
- [x] Dado com origem, confiança e ID estável (6, 7): selos de confiança, aliases no link direto
- [x] Decisão no motor determinístico, não no modelo (9, 11): o mapa só exibe status do motor
- [x] Cabe no plano gratuito (13): tiles e catálogo estáticos
- [ ] RLS e teste de acesso cruzado, se toca dado de usuário (16): não se aplica diretamente; o progresso é da spec 003

## 11. Perguntas em aberto

- Resolvido (23/11/2026, ADR 003): tiles gerados da imagem oficial da Rockstar (5775 × 7900 px, recorte 5376 × 7500), 512 px, zoom nativo 0 a 4 e exibição até 5, ~230 arquivos (10 a 20 MB), servidos pela Vercel.
- `[A ESCLARECER: futuro aparece no mapa por padrão (esmaecido) ou só quando o filtro pede? Proposta: oculto por padrão.]`
- Ícones de categoria: desenhar próprios ou reutilizar os da referência?
