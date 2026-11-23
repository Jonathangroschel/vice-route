# Spec 006: Missões e dependências

- **Status:** rascunho para revisão
- **Responsável:** [nome]
- **Depende de:** 001 (missões, gatilhos, marcos, `requer`, janelas), 003 (progresso e estado da jogada), 008 (status, `oQueFalta`, descendentes), 009 (spoiler)
- **Referências:** [docs/04-grafo-progressao.md](../../docs/04-grafo-progressao.md), [docs/05-motor-recomendacao.md](../../docs/05-motor-recomendacao.md)
- **Última revisão:** 23/11/2026

## 1. Contexto e problema

Os mapas de referência mostram colecionáveis, mas não a estrutura da campanha: quais missões existem, em que ordem, o que libera cada missão secundária e, principalmente, que ações sem marcador no jogo (gatilhos) fazem aparecer as missões ocultas. Sem isso o jogador não sabe por que uma missão não aparece nem o que perde ao seguir a história. Esta spec cobre a aba Missões: a lista de missões por capítulo e a árvore de dependências de cada missão, com "o que falta" e "o que libera". Os cálculos são do motor (spec 008); esta spec define o que o jogador vê e faz.

## 2. Objetivos e não objetivos

**Objetivos**
- Listar missões principais em ordem, agrupadas por capítulo
- Listar missões secundárias e ocultas, com status e personagem
- Mostrar, para cada missão, o que falta para liberá-la e o que ela libera
- Exibir gatilhos como passos acionáveis, com condições de momento em forma de instrução
- Filtrar por personagem, status e tipo
- Permitir atualizar a posição na campanha a partir da lista de principais

**Fora do escopo**
- Painel de perdíveis e alerta de ponto sem retorno (spec 007); esta spec só sinaliza risco nos itens
- Detonado narrativo de cada missão (objetivos internos, diálogos)
- Edição do grafo pela interface (curadoria por PR, spec 010)
- Cálculo de status, risco e "o que falta" (spec 008)

## 3. Histórias de usuário

### H1 (P1): ver as missões principais por capítulo

Como jogador da história, quero ver a sequência de missões principais e onde estou nela.

**Critérios de aceite**
1. Dado a aba Missões, quando aberta, então mostra as missões principais em ordem topológica, agrupadas por capítulo, com a última concluída e a próxima disponível em destaque.
2. Dado missões principais acima do nível de spoiler, quando listadas, então aparecem como "Missão principal 13 · capítulo 3", sem nome.
3. Dado trechos em paralelo na campanha (mais de uma principal disponível), quando listados, então aparecem lado a lado no mesmo nível, com a indicação "pode fazer em qualquer ordem".
4. Dado capítulos futuros, quando a lista é exibida, então vêm recolhidos, com contagem de missões e sem nomes acima do spoiler.

### H2 (P1): atualizar a posição na campanha pela lista

Como jogador, quero marcar a missão principal que acabei de concluir direto na lista.

**Critérios de aceite**
1. Dado uma missão principal disponível, quando toco em "Concluí", então ela vira a última principal concluída no estado da jogada (spec 003) e as anteriores passam a contar como concluídas por fecho implícito.
2. Dado que a missão marcada fecha itens perdíveis ainda pendentes, quando toco em "Concluí", então o alerta de ponto sem retorno da spec 007 aparece antes de salvar.
3. Dado uma marcação por engano, quando toco em desfazer (5 s) ou escolho outra missão como a última, então o estado volta e os itens implícitos deixam de contar.

### H3 (P1): secundárias e ocultas com status

Como caçador de 100%, quero ver todas as missões secundárias e ocultas e saber quais posso fazer agora.

**Critérios de aceite**
1. Dado a seção Secundárias, quando aberta, então lista cada missão com nome (spoiler aplicado), personagem, região, capítulo de referência e status do motor (disponível, bloqueada, futura, em risco, perdida, concluída).
2. Dado a seção Ocultas, quando o nível de spoiler é menor que 2, então ela mostra só a contagem por status ("3 disponíveis, 5 bloqueadas"), com botão para revelar.
3. Dado uma missão em risco, quando listada, então mostra "Some em N missões" com o destaque de risco.
4. Dado uma missão, quando toco no nome, então abro a árvore de dependências (H4); quando toco no ícone de mapa, o mapa centraliza no ponto de início (spec 004).

### H4 (P1): árvore de dependências de uma missão

Como jogador, quero entender por que uma missão não apareceu e o que preciso fazer antes.

**Critérios de aceite**
1. Dado uma missão bloqueada, quando abro a árvore, então vejo "O que falta": a cadeia mínima de pré-requisitos não satisfeitos devolvida por `oQueFalta` (spec 008), em ordem de execução, cada passo com status e ação (ver no mapa, marcar).
2. Dado um pré-requisito do tipo `qualquer`, quando exibido, então mostra as alternativas como "uma destas", com a alternativa sugerida pelo motor em primeiro lugar.
3. Dado um átomo `variavel` não preenchido, quando exibido, então mostra "Informe no Estado da jogada: [variável]" com link (spec 003), respeitando o spoiler da variável.
4. Dado qualquer missão, quando abro a árvore, então vejo "O que libera": nós que dependem diretamente dela e o total de descendentes, separando os que contam para 100% e os perdíveis.
5. Dado nós acima do nível de spoiler na árvore, quando exibidos, então aparecem com rótulo neutro e botão revelar por nó (spec 009).

### H5 (P1): gatilhos como passos acionáveis

Como jogador, quero saber exatamente que ação fazer para liberar uma missão oculta.

**Critérios de aceite**
1. Dado um gatilho na árvore ou na lista, quando exibido, então mostra a ação em linguagem direta (ex.: "Visite a loja X três vezes"), o local no mapa e o personagem.
2. Dado um gatilho com condições de momento, quando exibido, então elas aparecem como instrução ("entre 20h e 4h", "durante chuva", "de barco"), sem bloquear o status de disponível.
3. Dado um gatilho, quando o marco como feito, então o motor recalcula e a missão que ele libera muda de bloqueada para disponível, se não faltar mais nada.

### H6 (P2): filtros

Como jogador, quero filtrar a lista de missões.

**Critérios de aceite**
1. Dado o filtro de personagem, quando escolho Jason, então só aparecem missões de `jason`, `ambos` e `qualquer`.
2. Dado o filtro de status, quando escolho "Disponíveis agora", então só aparecem missões e gatilhos com status disponível.
3. Dado o filtro de tipo, quando escolho "Gatilhos", então vejo todos os gatilhos pendentes ordenados por valor de desbloqueio (spec 008).
4. Dado filtros ativos, quando volto à aba, então continuam aplicados (preferência local por jogada).

## 4. Requisitos funcionais

| ID | Requisito |
|---|---|
| RF-006-01 | O sistema DEVE listar as missões principais em ordem topológica da campanha, agrupadas por capítulo. |
| RF-006-02 | O sistema DEVE destacar a última principal concluída e as próximas disponíveis. |
| RF-006-03 | O sistema DEVE permitir definir a última principal concluída a partir da lista, acionando o alerta da spec 007 quando houver perdíveis pendentes. |
| RF-006-04 | O sistema DEVE listar secundárias, ocultas e gatilhos com status do motor, personagem, região e capítulo de referência. |
| RF-006-05 | O sistema DEVE exibir, para qualquer missão ou gatilho, "O que falta" (de `oQueFalta`) e "O que libera" (dependentes diretos e contagem de descendentes). |
| RF-006-06 | O sistema DEVE exibir alternativas de `qualquer` com a sugerida pelo motor primeiro. |
| RF-006-07 | O sistema DEVE exibir condições de momento como instrução, sem tratá-las como bloqueio. |
| RF-006-08 | O sistema DEVE direcionar átomos de variável não preenchida para a tela Estado da jogada. |
| RF-006-09 | O sistema NÃO DEVE exibir nome de missão, personagem envolvido ou consequência acima do nível de spoiler. |
| RF-006-10 | O sistema DEVE permitir filtrar por personagem, status e tipo, persistindo por jogada no dispositivo. |
| RF-006-11 | O sistema DEVE permitir marcar missões secundárias, ocultas e gatilhos como concluídos, com desfazer. |
| RF-006-12 | Toda missão com posição DEVE ter atalho para o mapa. |

## 5. Requisitos não funcionais

| ID | Requisito | Meta |
|---|---|---|
| RNF-006-01 | Abrir a aba Missões | < 200 ms com o catálogo em cache |
| RNF-006-02 | Abrir a árvore de uma missão | < 100 ms |
| RNF-006-03 | Profundidade exibida da árvore | Até 6 níveis expandidos; mais níveis sob demanda |

## 6. Casos de borda e falhas

- Missão com pré-requisito impossível pelas variáveis declaradas (`nao` sobre uma escolha já feita): o motor devolve `perdido` com motivo `CAMINHO_EXCLUIDO` (spec 008) e a tela mostra "indisponível nesta jogada", separado dos perdidos por avanço.
- Cadeia de "o que falta" muito longa: mostra os 6 primeiros passos e "mais N passos".
- Missão cujo `requer` aponta para nó depreciado: o catálogo não deve permitir (validação da spec 001); se ocorrer, a árvore mostra "dependência removida" e um atalho para reportar.
- Jogador marca uma oculta sem ter marcado o gatilho: o motor infere o gatilho como concluído (normalização, spec 008) e a árvore reflete isso.
- Personagem atual diferente do exigido pela missão: aparece como "disponível com Lucia" em vez de bloqueada. `[A ESCLARECER: depende de como a troca de personagem funciona no jogo.]`
- Campanha sem capítulos formais: agrupamento por blocos definidos em `capitulos.yaml`, mesmo que sejam convenção da comunidade.

## 7. Entidades e eventos (conceitual)

- **Missão** (nó `missao:` com subtipo principal, secundária ou oculta), **Gatilho** e **Marco** (spec 001).
- **Capítulo**: número, nome (com spoiler), missões principais contidas.
- **Cadeia de pré-requisitos**: saída de `oQueFalta`: passos ordenados, alternativas, átomos de variável.
- **Dependentes**: nós cujo `requer` cita a missão; descendentes transitivos pré-calculados.
- Consome `progresso.alterado`, `estado.alterado`; emite `estado.alterado` ao definir a última principal.

## 8. Cenários-ouro (se toca o motor ou o agente)

| ID | Estado de entrada | Resultado esperado | Como é verificado |
|---|---|---|---|
| CO-006-01 | Exemplo da cadeia de [04-grafo-progressao.md](../../docs/04-grafo-progressao.md) §7, jogador após a principal 11 | Árvore da oculta mostra o gatilho como único passo faltante, com instrução de horário | Asserção sobre a saída de `oQueFalta` renderizada |
| CO-006-02 | Missão com `qualquer` de duas alternativas, uma já concluída | Missão disponível; árvore não mostra "o que falta" | Asserção determinística |
| CO-006-03 | Spoiler 1, oculta de spoiler 2 | Seção Ocultas só com contagem; nenhum nome no DOM | Teste de componente |
| CO-006-04 | Definir última principal = 15 com perdível pendente | Alerta da spec 007 antes de salvar | E2E |

## 9. Métricas de sucesso

- Percentual de missões ocultas concluídas pelos jogadores que abriram a árvore delas
- Uso de "O que falta" seguido de marcação de um passo da cadeia
- Gatilhos com taxa alta de "bloqueado por muito tempo" (indício de dado errado no catálogo)

## 10. Checagem contra a constituição

- [x] Ajuda a decidir o próximo passo (princípio 1): "o que falta" e gatilhos acionáveis
- [x] Perdíveis avisados antes (2) e nível de spoiler respeitado (3): integra o alerta da 007; rótulos neutros
- [x] Funciona sem IA e sem token (4)
- [x] Dado com origem, confiança e ID estável (6, 7): fontes e selo no detalhe do nó
- [x] Decisão no motor determinístico, não no modelo (9, 11): árvore é saída do motor
- [x] Cabe no plano gratuito (13)
- [ ] RLS e teste de acesso cruzado, se toca dado de usuário (16): não se aplica; estado é da spec 003

## 11. Perguntas em aberto

- `[A ESCLARECER: a campanha de GTA VI é dividida em capítulos oficiais? Se não, quem define os blocos de capitulos.yaml?]`
- `[A ESCLARECER: troca de personagem livre, por missão ou por capítulo? Afeta como "disponível com outro personagem" é exibido.]`
- Exibir a árvore como lista indentada (proposta para o MVP, melhor no celular) ou como grafo visual?
