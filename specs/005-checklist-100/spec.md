# Spec 005: Checklist e 100%

- **Status:** rascunho para revisão
- **Responsável:** [nome]
- **Depende de:** 001 (categorias, `conta_para_100`, totais), 003 (progresso e jogada ativa), 009 (spoiler); consome 008 (status dos nós)
- **Referências:** [docs/02-dados-referencias.md](../../docs/02-dados-referencias.md), [docs/07-interface-web.md](../../docs/07-interface-web.md)
- **Última revisão:** 23/11/2026

## 1. Contexto e problema

O jogador quer saber, num relance, quanto falta para os 100% e em que categorias. Os rastreadores da comunidade resolvem isso com uma aba de progresso ("0 / 901 achados", anel de porcentagem, barra segmentada por categoria e lista de categorias com contador). Só que o 100% do GTA VI não exige pegar tudo: o checklist do jogo pede parte da maioria das categorias (por exemplo, 100 de 125 flamingos, 15 de 18 conjuntos de cartas; docs/02 §1.2). O Vice Route precisa da mesma visão, com três acréscimos: mostrar o exigido para 100% ao lado do total, deixar claro o que conta para os 100% (missões e atividades além dos colecionáveis) e permitir recortar por região e personagem. Esta spec cobre a aba Progresso da folha inferior e a lista de itens de cada categoria.

## 2. Objetivos e não objetivos

**Objetivos**
- Mostrar o total geral de concluídos sobre o total que conta para 100%, com porcentagem
- Mostrar o progresso por categoria e por grupo (colecionáveis, atividades, missões)
- Listar os itens de uma categoria com status e marcação rápida
- Recortar os números por região e por personagem
- Deixar explícito o que entra e o que não entra na conta dos 100%

**Fora do escopo**
- Ranking ou comparação com outros jogadores
- Estatísticas oficiais do jogo (spec 013)
- Ordem recomendada dentro da categoria (aba Próximos, spec 008)

## 3. Histórias de usuário

### H1 (P1): ver o total dos 100%

Como caçador de 100%, quero ver quantos itens já encontrei e quanto falta.

**Critérios de aceite**
1. Dado a aba Progresso, quando aberta, então mostra o contador de **itens de mapa** "X / N achados" (colecionáveis e atividades com `conta_para_100: true` e status diferente de `depreciado`), um anel com a porcentagem arredondada para baixo e, logo abaixo, o total de **missões** "Y / M missões" e o **geral** (itens de mapa + missões), conforme [04-grafo-progressao.md](../../docs/04-grafo-progressao.md) §1.
2. Dado a folha inferior recolhida, quando visível, então mostra o título "100% do jogo", o anel, o contador de itens de mapa e a barra segmentada, como na referência.
3. Dado uma marcação nova, quando feita em qualquer tela, então contador, anel e barras são atualizados em menos de 100 ms.
4. Dado 100% atingido, quando o último item é marcado, então aparece uma celebração discreta e o anel fica completo.

### H2 (P1): progresso por categoria

Como jogador, quero ver o progresso de cada categoria.

**Critérios de aceite**
1. Dado a aba Progresso, quando aberta, então lista cada categoria com ícone, cor, nome, "concluídos / total", o exigido pela `regra_100` da categoria (ex.: "87 / 125 · 100 para 100%"; para conjuntos: "9 / 15 conjuntos completos") e barra de progresso na cor da categoria com marca no ponto exigido, na ordem definida em `categorias.yaml`.
2. Dado uma categoria cuja `regra_100` já foi cumprida, quando exibida, então aparece como "fechada para 100%", mesmo com itens restantes, e o anel de 100% conta o exigido, não o total.
3. Dado a barra segmentada do topo, quando exibida, então cada segmento tem largura proporcional ao total da categoria e preenchimento proporcional ao concluído.
3. Dado "Ver tudo", quando tocado, então a folha expande para altura cheia com a lista completa.
4. Dado uma categoria com itens perdidos, quando listada, então mostra também "N perdidos" em destaque, sem descontá-los do total.

### H3 (P1): lista de itens de uma categoria

Como jogador, quero abrir uma categoria e ver todos os itens dela para marcar ou localizar.

**Critérios de aceite**
1. Dado uma categoria tocada, quando a lista abre, então mostra cada item com nome (respeitando spoiler), região, status do motor e caixa de marcação.
2. Dado um item na lista, quando toco na caixa, então ele é marcado ou desmarcado com desfazer de 5 s (spec 003).
3. Dado um item na lista, quando toco no nome, então o mapa centraliza nele e abre o detalhe (spec 004).
4. Dado a lista, quando aplico ordenação, então posso ordenar por número, região ou status, e ocultar concluídos.

### H4 (P2): recorte por região e personagem

Como jogador, quero ver quanto falta em uma região específica ou com um personagem.

**Critérios de aceite**
1. Dado o seletor de região, quando escolho "Vice City", então todos os contadores e barras passam a considerar só nós dessa região, com o rótulo do recorte visível.
2. Dado o seletor de personagem, quando escolho Lucia, então os contadores consideram nós com `personagem` igual a `lucia`, `ambos` ou `qualquer`.
3. Dado um recorte ativo, quando limpo, então os números voltam ao total do jogo.

### H5 (P2): o que conta para 100%

Como jogador, quero entender o que entra na conta.

**Critérios de aceite**
1. Dado o ícone de informação ao lado de "100% do jogo", quando tocado, então explica os três totais: itens de mapa (colecionáveis e atividades, comparável à referência), missões (principais, secundárias e ocultas marcadas como `conta_para_100`) e geral; e que gatilhos e marcos nunca contam.
2. Dado grupos de categorias, quando a lista é exibida, então categorias aparecem agrupadas em "Colecionáveis", "Atividades" e "Missões", cada grupo com subtotal.
3. Dado nós `nao_confirmado`, quando entram na conta, então o total mostra "inclui N itens não confirmados".

## 4. Requisitos funcionais

| ID | Requisito |
|---|---|
| RF-005-01 | O sistema DEVE exibir três totais: itens de mapa (colecionáveis e atividades), missões e geral, cada um contando nós com `conta_para_100: true` e status diferente de `depreciado` no catálogo vigente; gatilhos e marcos NÃO DEVEM entrar em nenhum total. |
| RF-005-02 | O concluído DEVE contar nós concluídos pelo motor, incluindo os implícitos (fecho da campanha, spec 008). |
| RF-005-03 | O sistema DEVE exibir contador, anel de porcentagem e barra segmentada por categoria. |
| RF-005-04 | O sistema DEVE listar categorias com ícone, cor, nome, contador e barra, na ordem de `categorias.yaml`, agrupadas por grupo. |
| RF-005-05 | O sistema DEVE abrir a lista de itens de uma categoria com status, marcação e ida ao mapa. |
| RF-005-06 | O sistema DEVE permitir recortar todos os números por região e por personagem. |
| RF-005-07 | O sistema DEVE mostrar itens perdidos por categoria sem descontá-los do total. |
| RF-005-08 | O sistema NÃO DEVE exibir nomes acima do nível de spoiler; itens escondidos aparecem como "Item 017" ou rótulo neutro equivalente. |
| RF-005-09 | O sistema DEVE informar quantos itens não confirmados entram no total. |
| RF-005-10 | Os números DEVEM ser calculados no cliente, sem consulta ao servidor. |
| RF-005-11 | A porcentagem de 100% DEVE ser calculada pela `regra_100` de cada categoria (mínimo de itens ou de conjuntos completos), não pela soma de todos os itens; a contagem bruta "coletados / total" DEVE aparecer separada. |

## 5. Requisitos não funcionais

| ID | Requisito | Meta |
|---|---|---|
| RNF-005-01 | Atualização dos números após marcar | < 100 ms |
| RNF-005-02 | Abrir lista de uma categoria com 222 itens | < 200 ms, rolagem a 60 fps (lista virtualizada) |
| RNF-005-03 | Acessibilidade | Barras com texto alternativo "X de N"; cores sempre acompanhadas de ícone e nome |

## 6. Casos de borda e falhas

- Nova versão do catálogo muda o total (ex.: 901 → 905): números atualizados e aviso "Catálogo atualizado" com link para as notas (spec 001).
- Item depreciado que estava marcado: sai do concluído e do total (spec 003, H8).
- Categoria sem nenhum item confirmado: exibida normalmente, com selo de não confirmados.
- Recorte por região sem itens de uma categoria: a categoria aparece como "0 / 0" esmaecida ou é ocultada. `[A ESCLARECER: ocultar ou esmaecer?]`
- Item repetível (`repetivel: true`): conta uma vez para os 100%.

## 7. Entidades e eventos (conceitual)

- **Categoria**: id, nome, cor, ícone, grupo, ordem, total.
- **Grupo de categorias**: colecionáveis, atividades, missões.
- **Resumo de progresso**: por categoria e grupo, concluídos, total, perdidos, não confirmados; com recorte de região e personagem.
- Consome os eventos `progresso.alterado`, `catalogo.atualizado`, `jogada.ativa_trocada`.

## 8. Cenários-ouro (se toca o motor ou o agente)

| ID | Estado de entrada | Resultado esperado | Como é verificado |
|---|---|---|---|
| CO-005-01 | Catálogo com 901 itens de mapa que contam, 1 depreciado marcado, 3 gatilhos concluídos | Total de itens de mapa 901, depreciado fora do concluído, gatilhos fora de todos os totais | Asserção determinística no resumo |
| CO-005-02 | Última principal = missão 12, nenhuma marcação manual | Missões principais 1 a 12 contam como concluídas | Asserção sobre o fecho implícito do motor |
| CO-005-03 | Recorte personagem `lucia` | Só nós `lucia`, `ambos` e `qualquer` no total | Asserção determinística |

## 9. Métricas de sucesso

- Percentual de jogadores que abrem a lista de alguma categoria por sessão
- Percentual de marcações feitas pela lista versus pelo mapa
- Jogadores que chegam a 100% (contados pelo resumo, anonimamente)

## 10. Checagem contra a constituição

- [x] Ajuda a decidir o próximo passo (princípio 1): mostra onde estão as lacunas
- [x] Perdíveis avisados antes (2) e nível de spoiler respeitado (3): perdidos destacados; rótulos neutros
- [x] Funciona sem IA e sem token (4)
- [x] Dado com origem, confiança e ID estável (6, 7): não confirmados sinalizados
- [x] Decisão no motor determinístico, não no modelo (9, 11)
- [x] Cabe no plano gratuito (13): cálculo no cliente
- [ ] RLS e teste de acesso cruzado, se toca dado de usuário (16): não se aplica; usa a store da spec 003

## 11. Perguntas em aberto

- Parcialmente resolvido (23/11/2026): o checklist de 100% do jogo abre depois da história e pede um mínimo por categoria (docs/02 §1.2), o que levou à `regra_100`. `[A ESCLARECER: a porcentagem exibida pelo jogo pondera categorias de forma diferente? Se sim, o geral deve seguir a fórmula do jogo.]`
- Quais secundárias e ocultas têm `conta_para_100: true`? Depende do levantamento da spec 002.
