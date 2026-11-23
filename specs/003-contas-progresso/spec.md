# Spec 003: Contas, jogadas e progresso

- **Status:** rascunho para revisão
- **Responsável:** [nome]
- **Depende de:** 001 (catálogo e IDs estáveis, aliases, versão do catálogo)
- **Referências:** [docs/03-arquitetura.md](../../docs/03-arquitetura.md), [docs/05-motor-recomendacao.md](../../docs/05-motor-recomendacao.md)
- **Última revisão:** 23/11/2026

## 1. Contexto e problema

Tudo o que o Vice Route recomenda depende do progresso do jogador: o que ele já marcou, em que ponto da campanha está, com qual personagem joga e quais escolhas fez. Esse estado precisa ser salvo sem atrito (sem obrigar cadastro no primeiro uso), funcionar sem conexão ao lado do console, sincronizar entre celular e computador e sobreviver a mudanças no catálogo. Esta spec cobre identidade, jogadas (saves), estado da jogada e progresso. O cálculo do que fazer com esse estado pertence à spec 008.

## 2. Objetivos e não objetivos

**Objetivos**
- Começar a marcar progresso sem cadastro, com sessão anônima, e vincular a uma conta social depois sem perder nada
- Permitir várias jogadas por conta (ex.: "primeira jogada" e "jogada 100%")
- Guardar o estado da jogada que o motor usa: última missão principal concluída, principal em andamento, personagem, variáveis declaradas, perfil. A posição no mapa fica só no dispositivo
- Marcar e desmarcar itens com resposta imediata, offline, e sincronizar em segundo plano
- Preservar o progresso quando o catálogo muda (IDs fundidos ou depreciados)
- Garantir que cada jogador só lê e altera o próprio progresso

**Fora do escopo**
- Cálculo de status, riscos e recomendações (spec 008)
- Reportes e confirmações de itens (spec 010)
- Sincronização a partir de captura de tela (spec 013)
- Integração com PSN ou Rockstar Games Social Club
- Compartilhamento público de progresso e perfis públicos

## 3. Histórias de usuário

### H1 (P1): começar sem cadastro

Como jogador que acabou de abrir o site, quero marcar itens imediatamente, sem criar conta, para não perder tempo enquanto jogo.

**Critérios de aceite**
1. Dado um primeiro acesso, quando o app carrega, então uma sessão anônima é criada e uma jogada padrão ("Minha jogada") existe, sem nenhum formulário.
2. Dado uma sessão anônima, quando marco um item, então a marcação é salva localmente e sincronizada com o servidor associada ao usuário anônimo.
3. Dado uma sessão anônima, quando abro Configurações, então vejo um aviso de que o progresso só existe neste navegador até eu entrar com uma conta.

### H2 (P1): vincular conta sem perder progresso

Como jogador anônimo, quero entrar com Google ou GitHub e manter tudo o que marquei, para acessar de outro dispositivo.

**Critérios de aceite**
1. Dado uma sessão anônima com progresso, quando entro com uma conta social nova, então a identidade é vinculada ao mesmo usuário e todas as jogadas e marcações continuam lá.
2. Dado uma sessão anônima com progresso, quando entro com uma conta social que já tem dados em outro dispositivo, então o app pergunta o que fazer: **juntar** (as jogadas deste navegador entram na conta como jogadas separadas, sem misturar marcações) ou **descartar as deste navegador**. Nada é apagado sem confirmação.
3. Dado que entrei no celular e no computador com a mesma conta, quando marco um item em um, então ele aparece no outro após a sincronização (no máximo na próxima abertura do app ou em até 30 s com o app aberto).

### H3 (P1): marcar e desmarcar com resposta imediata

Como jogador, quero marcar um item com um toque e desfazer se errei.

**Critérios de aceite**
1. Dado um item pendente, quando marco, então a interface reflete a mudança em menos de 50 ms, antes de qualquer resposta do servidor.
2. Dado um item marcado por engano, quando toco em desfazer (até 5 s) ou desmarco depois, então uma operação `concluido = false` é registrada; o registro nunca é apagado.
3. Dado uma marcação, quando ela é gravada, então registra jogada, nó, valor, momento da operação, origem (`manual`, `sugestao`, `captura`, `importacao`) e versão do catálogo vigente.

### H4 (P1): funcionar offline

Como jogador com conexão ruim, quero continuar marcando e ver tudo sincronizar quando a rede voltar.

**Critérios de aceite**
1. Dado o app sem conexão, quando marco itens, então eles ficam numa fila local persistente e o indicador mostra "N alterações pendentes".
2. Dado uma fila pendente, quando a conexão volta, então as operações são enviadas em lote e a fila é esvaziada só após confirmação do servidor.
3. Dado que fechei o navegador com operações pendentes, quando reabro, então a fila continua lá e é enviada.
4. Dado o mesmo nó alterado em dois dispositivos offline, quando ambos sincronizam, então prevalece a operação com o momento mais recente (último a escrever vence, por par jogada e nó).

### H5 (P1): estado da jogada

Como jogador, quero informar em que ponto da história estou, com qual personagem e quais escolhas fiz, para que as recomendações reflitam a minha jogada.

**Critérios de aceite**
1. Dado a tela Estado da jogada, quando escolho a última missão principal concluída (e, se houver, a principal em andamento, usada pelas janelas com `momento: inicio`), então ela é salva e o motor passa a considerar concluídas as principais exigidas por ela (fecho implícito, spec 008); não é preciso marcar uma a uma.
2. Dado variáveis declaradas no catálogo (`data/variaveis.yaml`), quando preencho uma, então o valor é salvo na jogada; só aparecem variáveis disponíveis para o ponto da campanha e dentro do meu nível de spoiler (spec 009).
3. Dado que escolho personagem e perfil de recomendação (caçador de 100%, equilíbrio, história primeiro), quando salvo, então os valores ficam na jogada e sincronizam como o progresso.
4. Dado que informo minha posição (região ou ponto no mapa), quando salvo, então ela fica só no dispositivo (IndexedDB) e nunca é enviada ao Supabase (princípio 17).

### H6 (P2): várias jogadas

Como jogador, quero ter mais de uma jogada (save) na mesma conta.

**Critérios de aceite**
1. Dado a tela Jogadas, quando crio uma jogada, então ela começa vazia e passa a ser a jogada ativa.
2. Dado uma jogada existente, quando duplico, então a cópia tem todo o progresso e o estado, com nome "Cópia de …".
3. Dado várias jogadas, quando troco a ativa, então mapa, listas e recomendações passam a refletir a nova jogada sem recarregar a página.
4. Dado uma jogada, quando excluo, então é pedida confirmação com o nome e a quantidade de itens marcados, e a exclusão remove progresso e estado dela.

### H7 (P2): exportar e importar

Como jogador, quero exportar minha jogada em JSON e importar de volta, para ter backup ou migrar.

**Critérios de aceite**
1. Dado uma jogada, quando exporto, então baixo um JSON com versão do formato, versão do catálogo, estado e lista de nós concluídos.
2. Dado um JSON válido, quando importo, então uma nova jogada é criada; IDs antigos são migrados pelos aliases; IDs desconhecidos são listados num relatório e ignorados.
3. Dado um JSON inválido ou de formato futuro, quando importo, então a importação é recusada com mensagem clara e nada é alterado.

### H8 (P2): progresso sobrevive a mudanças no catálogo

Como jogador, quero que uma correção no catálogo não apague o que marquei.

**Critérios de aceite**
1. Dado um item marcado cujo ID foi fundido em outro (aparece em `aliases`), quando o app carrega a nova versão do catálogo, então o progresso passa a valer para o ID novo, e a marcação original é preservada no servidor.
2. Dado um item marcado que virou `depreciado`, quando o app carrega, então ele deixa de contar para os totais, mas a marcação continua guardada e aparece em "itens removidos do catálogo" no detalhe da jogada.

### H9 (P2): excluir conta

Como jogador, quero apagar minha conta e meus dados.

**Critérios de aceite**
1. Dado uma conta, quando confirmo a exclusão digitando o apelido, então perfil, jogadas, estado e progresso são apagados, e reportes e confirmações (spec 010) ficam anonimizados.
2. Dado a exclusão concluída, quando abro o app, então começo com uma nova sessão anônima e os dados locais do navegador foram limpos.

## 4. Requisitos funcionais

| ID | Requisito |
|---|---|
| RF-003-01 | O sistema DEVE criar sessão anônima automaticamente no primeiro acesso, sem formulário. |
| RF-003-02 | O sistema DEVE permitir entrar com ao menos Google e GitHub e vincular a identidade social ao usuário anônimo existente. |
| RF-003-03 | O sistema NÃO DEVE apagar dados locais ou remotos ao vincular contas sem confirmação explícita do jogador. |
| RF-003-04 | O sistema DEVE criar uma jogada padrão para todo usuário novo e manter sempre uma jogada ativa. |
| RF-003-05 | O sistema DEVE permitir criar, renomear, duplicar, excluir, exportar e importar jogadas. |
| RF-003-06 | O sistema DEVE limitar a 10 jogadas por conta. `[A ESCLARECER: limite adequado?]` |
| RF-003-07 | Toda marcação DEVE registrar jogada, nó, `concluido`, momento da operação no cliente, origem e versão do catálogo. |
| RF-003-08 | Desmarcar DEVE ser registrado como operação `concluido = false`; marcações NÃO DEVEM ser excluídas fisicamente, exceto na exclusão de jogada ou de conta. |
| RF-003-09 | O sistema DEVE manter fila de operações em IndexedDB, persistente entre sessões, e enviá-la em lotes de até 500 operações. |
| RF-003-10 | O servidor DEVE aplicar cada operação somente se o seu momento for mais recente que o registrado para o par (jogada, nó). |
| RF-003-11 | O sistema DEVE guardar por jogada: última missão principal concluída, principal em andamento, personagem, variáveis declaradas, perfil de recomendação e preferências de categoria. A posição (região ou coordenada) DEVE ficar só no dispositivo. |
| RF-003-12 | O sistema DEVE aceitar só variáveis existentes em `data/variaveis.yaml` e valores dentro do tipo e das opções declaradas; valores de variáveis removidas são guardados e ignorados. |
| RF-003-13 | O sistema DEVE resolver IDs por `aliases` ao carregar uma versão do catálogo e ao importar JSON. |
| RF-003-14 | Toda tabela de usuário DEVE ter RLS que restringe leitura e escrita ao `auth.uid()` dono. |
| RF-003-15 | O sistema DEVE permitir excluir a conta, apagando dados pessoais e anonimizando contribuições. |
| RF-003-16 | O sistema DEVE guardar no perfil: apelido, nível de spoiler, tema e idioma. |
| RF-003-17 | O sistema DEVE sincronizar alterações feitas em outro dispositivo ao abrir o app, ao voltar o foco para a aba e a cada 30 s com o app aberto. |

## 5. Requisitos não funcionais

| ID | Requisito | Meta |
|---|---|---|
| RNF-003-01 | Resposta visual ao marcar | < 50 ms (p95), independente da rede |
| RNF-003-02 | Tempo para uma operação chegar ao servidor com rede | < 5 s (p95) |
| RNF-003-03 | Perda de operações | Zero; fila só é limpa após confirmação |
| RNF-003-04 | Volume de dados por usuário | < 300 KB no servidor por jogada completa (~2 mil nós, com índices) |
| RNF-003-05 | Plano gratuito do Supabase | Caber em 500 MB com 10 mil usuários (hipótese a medir) |
| RNF-003-06 | Disponibilidade do projeto no Supabase | Nunca pausado por inatividade (ação agendada) |

## 6. Casos de borda e falhas

- Navegador em modo privado ou com IndexedDB bloqueado: o app funciona em memória e avisa que o progresso será perdido ao fechar, sugerindo entrar com conta.
- Relógio do dispositivo errado: o momento da operação vem do cliente; para limitar o dano, o servidor rejeita operações com momento mais de 24 h no futuro e as registra com o horário do servidor. `[A ESCLARECER: usar relógio híbrido (servidor + contador) em vez de horário do cliente?]`
- Sessão anônima expirada ou dados do navegador apagados antes de vincular conta: o progresso anônimo é perdido; o aviso da H1 existe para isso.
- Usuário exclui uma jogada no celular enquanto o computador tem operações pendentes para ela: operações para jogada inexistente são descartadas e o cliente avisa.
- Marcação de nó que não existe no catálogo (versão mais nova no servidor que no cliente): é guardada e passa a valer quando o catálogo do cliente for atualizado.
- Importação de JSON enorme ou malicioso: limite de 2 MB, validação por esquema, texto tratado como dado.
- Duas abas abertas no mesmo navegador: uma só fila, coordenada por `BroadcastChannel` ou trava do IndexedDB.
- Falha no vínculo de conta (provedor fora do ar): sessão anônima continua intacta.

## 7. Entidades e eventos (conceitual)

- **Usuário**: identidade do Supabase Auth (anônima ou social). Tem um Perfil.
- **Perfil**: apelido, nível de spoiler, tema, idioma, jogada ativa.
- **Jogada**: pertence a um usuário; nome, plataforma (opcional), criada em, versão do catálogo da última sincronização.
- **Estado da jogada**: 1 por jogada; última missão principal concluída, principal em andamento, personagem, variáveis (mapa nome → valor), perfil de recomendação, preferências de categoria. Posição só local.
- **Marcação**: (jogada, nó) → concluído, momento da operação, origem, versão do catálogo.
- **Operação pendente** (só no cliente): alteração de marcação ou de estado ainda não confirmada pelo servidor.
- Eventos internos do cliente: `progresso.alterado`, `estado.alterado`, `jogada.ativa_trocada`, `catalogo.atualizado` (disparam o recálculo do motor).

## 8. Cenários-ouro (se toca o motor ou o agente)

| ID | Estado de entrada | Resultado esperado | Como é verificado |
|---|---|---|---|
| CO-003-01 | Marcação de `item:a` fundido em `item:b` via aliases | Motor recebe `item:b` como concluído | Asserção determinística na normalização |
| CO-003-02 | Duas operações para o mesmo nó, momentos t1 < t2, chegando na ordem t2, t1 | Valor final é o de t2 | Teste de integração do RPC de sync |
| CO-003-03 | Usuário A tenta ler e gravar progresso da jogada de B | Leitura vazia, gravação recusada | Teste de RLS no CI |
| CO-003-04 | Exportar e importar uma jogada | Mesmo conjunto de nós concluídos e mesmo estado | Teste de ida e volta |

## 9. Métricas de sucesso

- Percentual de usuários que vinculam conta social depois de marcar 10 itens ou mais
- Zero relatos de progresso perdido por sincronização
- Tamanho médio da fila pendente e tempo médio até esvaziar
- Uso do banco do Supabase por usuário ativo

## 10. Checagem contra a constituição

- [x] Ajuda a decidir o próximo passo (princípio 1): o estado da jogada alimenta o motor
- [x] Perdíveis avisados antes (2) e nível de spoiler respeitado (3): variáveis filtradas por spoiler
- [x] Funciona sem IA e sem token (4)
- [x] Dado com origem, confiança e ID estável (6, 7): marcação guarda origem e versão do catálogo; aliases
- [x] Decisão no motor determinístico, não no modelo (9, 11)
- [x] Cabe no plano gratuito (13): linhas pequenas, ação contra pausa
- [x] RLS e teste de acesso cruzado, se toca dado de usuário (16)

## 11. Perguntas em aberto

- Limite de jogadas por conta (RF-003-06).
- Relógio do cliente versus relógio híbrido para resolver conflitos (seção 6).
- Oferecer login por e-mail com link mágico além de Google e GitHub?
- Contas anônimas antigas e sem atividade: apagar após quanto tempo para economizar espaço?
