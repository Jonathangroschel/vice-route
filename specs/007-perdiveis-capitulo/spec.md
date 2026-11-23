# Spec 007: Perdíveis e capítulo

- **Status:** rascunho para revisão
- **Responsável:** [nome]
- **Depende de:** 001 (janelas `disponivel_desde` e `perdivel_apos`), 003 (estado da jogada), 008 (`perdiveis`, `antesDeAvancar`, `checklistCapitulo`), 009 (spoiler)
- **Referências:** [docs/04-grafo-progressao.md](../../docs/04-grafo-progressao.md), [docs/05-motor-recomendacao.md](../../docs/05-motor-recomendacao.md), [constituição, princípio 2](../constituicao.md)
- **Última revisão:** 23/11/2026

## 1. Contexto e problema

O pior erro de quem busca os 100% é avançar na história e descobrir depois que um item ou missão deixou de existir. Nenhum mapa de referência avisa isso. O princípio 2 da constituição exige que nada perdível passe em silêncio: o jogador precisa saber, antes de iniciar uma missão, o que vai perder com ela. Esta spec cobre o painel de perdíveis (aba Capítulo), o alerta de ponto sem retorno, a faixa fixa sobre o mapa e o checklist "antes do capítulo seguinte". Os cálculos são do motor (spec 008).

## 2. Objetivos e não objetivos

**Objetivos**
- Mostrar todos os perdíveis pendentes agrupados pela missão principal que os fecha, em ordem da campanha
- Avisar antes de o jogador registrar o avanço para uma missão que fecha itens pendentes
- Manter uma faixa fixa no mapa quando há perdível que some na próxima missão principal
- Oferecer o checklist do que ainda falta no capítulo atual antes de seguir para o próximo
- Registrar o que foi perdido, sem apagar e sem descontar do total

**Fora do escopo**
- Detectar sozinho que o jogador avançou no jogo (não há integração com o console; o avanço é informado pelo jogador ou pela spec 013)
- Rota otimizada para limpar o capítulo (spec 011); aqui só a lista por região
- Notificações push fora do app

## 3. Histórias de usuário

### H1 (P1): painel de perdíveis

Como caçador de 100%, quero ver tudo o que ainda posso perder e quando.

**Critérios de aceite**
1. Dado a aba Capítulo, quando aberta, então mostra os perdíveis pendentes (`perdiveis()` do motor) agrupados pela missão principal que os fecha, em ordem da campanha, cada grupo com "Some ao iniciar" ou "Some ao concluir" e a distância em missões ("em 1 missão", "em 4 missões").
2. Dado cada item do grupo, quando listado, então mostra nome (spoiler aplicado), categoria, região, status (disponível ou bloqueado) e, se bloqueado, o primeiro passo de "o que falta", com o risco herdado indicado.
3. Dado um item listado, quando toco, então o mapa centraliza nele e abre o detalhe (spec 004); quando marco a caixa, ele é concluído com desfazer.
4. Dado nenhum perdível pendente, quando a aba abre, então mostra "Nada perdível pendente até o fim da história conhecida" e a data da versão do catálogo.
5. Dado o nome da missão que fecha o grupo acima do nível de spoiler, quando exibido, então aparece como "Missão principal 15 · capítulo 3".

### H2 (P1): alerta de ponto sem retorno

Como jogador, quero ser avisado antes de avançar para uma missão que me faz perder itens.

**Critérios de aceite**
1. Dado que vou definir uma nova última principal concluída (Estado da jogada, lista de missões da spec 006 ou outra origem), quando a mudança faria algum nó pendente passar a `perdido`, então um alerta bloqueante aparece antes de salvar, com a lista de `antesDeAvancar(missao)` agrupada em "some ao iniciar" e "some ao concluir".
2. Dado o alerta, quando escolho "Ver no mapa", então o mapa mostra só esses itens (filtro temporário) e o alerta pode ser reaberto pela faixa.
3. Dado o alerta, quando escolho "Avançar mesmo assim", então o estado é salvo, os itens viram `perdido` e ficam registrados como perdidos nesta jogada.
4. Dado o alerta, quando escolho "Cancelar", então nada é alterado.
5. Dado que a próxima missão principal fecha itens já no seu início, quando ela fica disponível, então o painel e a faixa avisam "Antes de iniciar a próxima missão", porque o jogador pode iniciá-la no jogo antes de abrir o app.

### H3 (P1): faixa fixa no mapa

Como jogador com o app aberto ao lado do console, quero ver o aviso sem precisar abrir nenhum painel.

**Critérios de aceite**
1. Dado ao menos um perdível pendente que some na próxima missão principal disponível, quando o mapa está visível, então uma faixa fixa no topo mostra "⚠ N itens somem na próxima missão" com toque para abrir o detalhe.
2. Dado que todos esses itens foram concluídos, quando a lista zera, então a faixa desaparece.
3. Dado a faixa, quando toco em "dispensar", então ela some até que a lista mude (novo item entra ou a missão muda); não pode ser desligada de forma permanente.
4. Dado o painel de outra aba aberto em altura cheia, quando há perdível na próxima missão, então a faixa continua visível no topo da folha.

### H4 (P1): antes do capítulo seguinte

Como caçador de 100%, quero uma lista do que ainda falta no capítulo atual antes de seguir em frente.

**Critérios de aceite**
1. Dado a aba Capítulo, quando abro "Antes do capítulo seguinte", então vejo `checklistCapitulo(c)` do motor: o que existe no capítulo atual e ainda falta, separado em "perdível neste capítulo" e "fica disponível depois", agrupado por região.
2. Dado o checklist, quando toco numa região, então o mapa enquadra a região com filtro dos itens daquela lista.
3. Dado o checklist, quando todos os perdíveis do capítulo estão concluídos, então aparece "Capítulo limpo de perdíveis", mesmo que restem itens não perdíveis.
4. Dado o perfil "história primeiro" (spec 008), quando o checklist é exibido, então os itens não perdíveis vêm recolhidos por padrão.

### H5 (P2): registro do que foi perdido

Como jogador, quero saber o que perdi e se ainda há como recuperar em outra jogada.

**Critérios de aceite**
1. Dado itens com status `perdido`, quando abro "Perdidos nesta jogada", então vejo a lista com a missão que os fechou.
2. Dado a lista de perdidos, quando toco em "Começar nova jogada a partir de um ponto", então posso duplicar a jogada (spec 003) e ajustar a última principal para antes do ponto de perda, se eu tiver um save no jogo nesse ponto.
3. Dado que corrigi a posição na campanha para antes do ponto de perda, quando salvo, então os itens voltam a `disponivel` ou `em_risco` conforme o motor.

## 4. Requisitos funcionais

| ID | Requisito |
|---|---|
| RF-007-01 | O sistema DEVE listar perdíveis pendentes agrupados pela missão principal que os fecha, em ordem da campanha, com momento (início ou conclusão) e distância em missões. |
| RF-007-02 | O sistema DEVE incluir no painel nós bloqueados alcançáveis que sejam perdíveis, com o risco herdado e o primeiro passo faltante. |
| RF-007-03 | Toda alteração da última principal concluída, venha de onde vier, DEVE passar pela verificação `antesDeAvancar` e exibir o alerta quando houver itens que viram `perdido`. |
| RF-007-04 | O alerta DEVE oferecer "Ver no mapa", "Avançar mesmo assim" e "Cancelar", e NÃO DEVE salvar nada sem escolha explícita. |
| RF-007-05 | O sistema DEVE exibir faixa fixa sobre o mapa e sobre a folha inferior sempre que houver perdível pendente que some na próxima missão principal disponível. |
| RF-007-06 | A faixa PODE ser dispensada temporariamente e DEVE reaparecer quando a lista mudar; NÃO DEVE existir opção para desligá-la permanentemente. |
| RF-007-07 | O sistema DEVE oferecer o checklist do capítulo atual, separado em perdível e não perdível, agrupado por região. |
| RF-007-08 | O sistema DEVE registrar itens que passaram a `perdido` e listá-los por jogada, sem descontá-los do total dos 100%. |
| RF-007-09 | O sistema NÃO DEVE exibir nome de missão, item ou consequência acima do nível de spoiler em painel, alerta ou faixa. |
| RF-007-10 | Painel, alerta e faixa DEVEM funcionar offline e sem IA, com dados do motor local. |

## 5. Requisitos não funcionais

| ID | Requisito | Meta |
|---|---|---|
| RNF-007-01 | Tempo para o alerta aparecer após escolher a nova missão | < 100 ms |
| RNF-007-02 | Atualização da faixa após marcar um item | < 100 ms |
| RNF-007-03 | Cobertura | 100% das alterações da última principal passam pela verificação (teste por origem) |

## 6. Casos de borda e falhas

- Jogador pula várias missões de uma vez (de 8 para 15): o alerta lista os perdíveis de todas as missões intermediárias, agrupados por missão.
- Jogador volta a última principal para trás (correção ou save antigo): nenhum alerta; itens perdidos podem voltar a disponíveis.
- Perdível com `perdivel_apos` em marco em vez de missão (ex.: "região inundada"): agrupado sob o marco, com explicação.
- Catálogo novo adiciona um perdível numa missão já ultrapassada: o item entra direto como `perdido`, com a nota "adicionado ao catálogo depois que você passou deste ponto".
- Perdível com condição de momento (só à noite): aparece no alerta com a instrução, para o jogador saber que precisa de tempo de jogo.
- Item perdível com status `nao_confirmado` ou `contestado`: aparece no alerta com o selo; o jogador decide.
- Sincronização de outro dispositivo muda a última principal: o alerta não aparece retroativamente; o painel mostra "Avanço registrado em outro dispositivo; N itens perdidos".

## 7. Entidades e eventos (conceitual)

- **Grupo de perdíveis**: missão principal (ou marco) que fecha, momento (início ou conclusão), distância em missões, itens.
- **Alerta de ponto sem retorno**: missão alvo, itens que viram `perdido`, escolha do jogador.
- **Checklist do capítulo**: capítulo, itens pendentes por região, separados por perdível.
- **Registro de perdido**: (jogada, nó, missão que fechou, quando). Derivado do estado; não exige tabela nova se o motor recalcular a partir da última principal. `[A ESCLARECER: guardar o momento da perda exige persistência na spec 003?]`
- Consome `progresso.alterado`, `estado.alterado`, `catalogo.atualizado`; intercepta a alteração da última principal antes de emitir `estado.alterado`.

## 8. Cenários-ouro (se toca o motor ou o agente)

| ID | Estado de entrada | Resultado esperado | Como é verificado |
|---|---|---|---|
| CO-007-01 | Exemplo de [04-grafo-progressao.md](../../docs/04-grafo-progressao.md) §7, jogador após a principal 14, gatilho não feito | Painel lista o gatilho e a oculta sob a principal 15 ("some ao iniciar, em 1 missão"); faixa visível | Asserção sobre `perdiveis()` e componente |
| CO-007-02 | Definir última principal de 14 para 15 com o caso acima | Alerta com gatilho, oculta e easter egg dependente | E2E |
| CO-007-03 | Mesmo caso com todos os itens concluídos | Sem alerta, sem faixa | E2E |
| CO-007-04 | Spoiler 1, missão que fecha de spoiler 3 | Faixa e alerta sem nome da missão no DOM | Teste de componente |
| CO-007-05 | Pular de 8 para 15 | Alerta agrupado por todas as missões intermediárias com perdíveis | Asserção sobre `antesDeAvancar` |

## 9. Métricas de sucesso

- Percentual de alertas em que o jogador escolhe "Ver no mapa" ou "Cancelar" (o alerta mudou a decisão)
- Itens perdidos por jogada ao longo do tempo (meta: tendendo a zero entre quem usa o app desde o início)
- Perdíveis com maior taxa de perda (alimenta a spec 014 e indica itens difíceis ou dados errados)

## 10. Checagem contra a constituição

- [x] Ajuda a decidir o próximo passo (princípio 1)
- [x] Perdíveis avisados antes (2) e nível de spoiler respeitado (3): é o objetivo desta spec
- [x] Funciona sem IA e sem token (4)
- [x] Dado com origem, confiança e ID estável (6, 7): selos de confiança no alerta
- [x] Decisão no motor determinístico, não no modelo (9, 11)
- [x] Cabe no plano gratuito (13): tudo no cliente
- [ ] RLS e teste de acesso cruzado, se toca dado de usuário (16): não se aplica; estado é da spec 003

## 11. Perguntas em aberto

- Valor de K (missões à frente para considerar "em risco"): o motor usa 2 por padrão; a faixa usa só a próxima missão. Expor K como preferência?
- Persistir o momento em que cada item foi perdido (seção 7)?
- `[A ESCLARECER: o jogo tem pontos sem retorno explícitos (aviso na tela) que podem servir de fonte oficial para perdivel_apos?]`
