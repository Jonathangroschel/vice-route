# Spec 009: Escudo de spoiler

- **Status:** rascunho para revisão
- **Responsável:** [nome]
- **Depende de:** 001 (campo `spoiler` em nós, dicas e variáveis), 003 (preferências do perfil)
- **Usada por:** 004, 005, 006, 007, 008, 010, 011, 012
- **Referências:** [docs/04-grafo-progressao.md](../../docs/04-grafo-progressao.md) §6, [docs/06-agente-ia.md](../../docs/06-agente-ia.md) §3
- **Última revisão:** 2026-11-23

## 1. Contexto e problema

Um app que lista todas as missões, inclusive as ocultas, e diz o que será perdido em cada ponto da história é, por natureza, uma máquina de spoiler. Quem está jogando pela primeira vez quer saber que "existe algo perdível aqui" sem descobrir o nome da missão ou o destino de um personagem. Esta spec define os níveis de spoiler, como o jogador escolhe o seu teto e como o filtro é aplicado de forma única em todas as superfícies: telas, busca, notificações, motor e agente (princípio 3).

## 2. Objetivos e não objetivos

**Objetivos**
- Quatro níveis de spoiler (0 a 3) com significado claro para o jogador
- Teto global por jogador, mais revelação caso a caso
- Um único ponto de aplicação do filtro, usado por todas as telas, pela busca e pelas ferramentas do agente
- Nada acima do teto aparece em tela, notificação, URL compartilhável ou contexto enviado ao modelo

**Fora do escopo**
- Atribuir o nível de cada nó (curadoria, specs 001 e 002)
- Spoiler em imagens de itens além de ocultá-las (sem desfoque seletivo por região da imagem)
- Spoiler em conteúdo externo aberto por link (`fontes[].url`)

## 3. Histórias de usuário

### H1 (P1): escolher meu nível de spoiler

Como jogador da história, quero escolher quanto o app pode me revelar, para usar o mapa sem estragar a campanha.

**Critérios de aceite**
1. Dado o primeiro acesso, quando abro o app, então escolho o nível num passo de boas-vindas, com um exemplo de como cada nível aparece; o padrão pré-selecionado é 1.
2. Dado que escolhi o nível 1, quando abro Configurações, então posso mudar para qualquer nível a qualquer momento e todas as telas se atualizam sem recarregar.
3. Dado um jogador logado, quando muda o nível, então a preferência é salva no perfil e vale em outros dispositivos; sem login, fica no dispositivo.
4. Dado jogadas diferentes na mesma conta, quando troco de jogada, então o nível continua o do perfil. [A ESCLARECER: nível por jogada (ex.: segunda jogada sem filtro)?]

### H2 (P1): ver o que existe sem ver o que é

Como jogador com nível 1, quero saber que existe uma missão secundária perdível no capítulo 2 sem saber o nome dela.

**Critérios de aceite**
1. Dado um nó com `spoiler` maior que o meu teto, quando aparece em qualquer lista, então mostro um rótulo neutro composto só de dados de nível ≤ teto: tipo, subtipo, capítulo de referência e região (ex.: "Missão secundária · capítulo 2 · Vice City").
2. Dado esse nó no mapa, quando toco no marcador, então vejo o rótulo neutro, a posição, o status (disponível, em risco) e o botão "revelar"; dicas acima do teto ficam ocultas.
3. Dado um nó com nível 0 de teto, quando aparece, então só categoria e posição são exibidas; missões aparecem como "Missão" sem subtipo.
4. Dado um item perdível acima do teto, quando entra no alerta de ponto sem retorno (spec 007), então aparece com rótulo neutro e a contagem continua correta.
5. Dado a missão principal que fecha perdíveis com spoiler acima do teto, quando o alerta cita a missão, então usa "a próxima missão principal" ou "missão N do capítulo C", nunca o nome.

### H3 (P1): revelar caso a caso

Como jogador, quero revelar um item específico quando decidir, sem subir meu nível global.

**Critérios de aceite**
1. Dado um nó oculto, quando toco em "revelar", então um aviso curto informa o nível do conteúdo e, ao confirmar, só aquele nó (nome, dicas até o nível dele) é revelado.
2. Dado um nó revelado, quando volto à lista, então ele continua revelado nesta jogada; os pré-requisitos e descendentes dele continuam ocultos.
3. Dado nós revelados, quando abro Configurações, então posso ver e desfazer as revelações.
4. Dado uma dica com spoiler maior que o do próprio nó, quando revelo o nó, então a dica continua oculta com botão próprio.

### H4 (P1): busca sem vazamento

Como jogador, quero buscar sem que os resultados revelem nomes acima do meu teto.

**Critérios de aceite**
1. Dado o teto 1, quando digito parte do nome de uma missão oculta de nível 2, então ela NÃO aparece nos resultados pelo nome (a busca não confirma a existência de um nome escondido).
2. Dado o teto 1, quando busco por categoria ou região, então nós acima do teto aparecem com rótulo neutro.
3. Dado um nó revelado caso a caso, quando busco pelo nome, então ele aparece.

### H5 (P1): agente e recomendações respeitam o teto

Como jogador que usa o agente, quero que a IA nunca me conte o que eu não escolhi ver.

**Critérios de aceite**
1. Dado o teto 1, quando o motor gera motivos (spec 008), então os textos usam rótulos neutros para nós acima do teto.
2. Dado o teto 1, quando o agente chama uma ferramenta (spec 012), então o resultado já vem filtrado: nomes, dicas e descrições acima do teto são substituídos pelo rótulo neutro antes de entrar no contexto do modelo.
3. Dado uma resposta do agente, quando a interface renderiza, então uma checagem final procura nomes de nós acima do teto no texto e os substitui pelo rótulo neutro, registrando o vazamento em log local.
4. Dado o teto 1, quando o jogador pede explicitamente "me conta o nome", então o agente orienta a usar o botão revelar; ele não tem o nome no contexto.

### H6 (P2): notificações e links

Como jogador, quero que avisos e links compartilhados não revelem nada.

**Critérios de aceite**
1. Dado uma notificação no navegador ou faixa de alerta, quando exibida, então segue o mesmo filtro das telas.
2. Dado um link compartilhado (`/no/<id>`), quando aberto por outra pessoa, então o conteúdo segue o teto de quem abre, não de quem enviou; o ID não contém o nome.
3. Dado o título da aba do navegador, quando um nó está aberto, então usa o rótulo filtrado.

### H7 (P2): variáveis e escolhas

Como jogador, quero preencher o estado da jogada sem descobrir escolhas que ainda não vi.

**Critérios de aceite**
1. Dado uma variável com `spoiler` acima do teto ou com `disponivel_desde` além da minha posição na campanha, quando abro "Estado da jogada", então ela não aparece.
2. Dado que avancei além do `disponivel_desde` da variável, quando abro a tela, então ela aparece com rótulo neutro se ainda estiver acima do teto, e com nome se não estiver.

## 4. Requisitos funcionais

| ID | Requisito |
|---|---|
| RF-009-01 | O sistema DEVE oferecer os níveis 0, 1, 2 e 3 com a semântica de docs/04 §6. |
| RF-009-02 | O filtro DEVE ser uma função pura única (`aplicarSpoiler(no, teto, revelados)`) usada por telas, busca, motor e ferramentas do agente. |
| RF-009-03 | Rótulos neutros DEVEM ser montados apenas com campos de nível ≤ teto e NÃO DEVEM permitir inferir o nome (sem contagem de letras, iniciais ou ícones exclusivos). |
| RF-009-04 | O conteúdo acima do teto NÃO DEVE chegar ao DOM, a atributos `title`/`aria-label`, à URL ou ao contexto do modelo; não basta escondê-lo com CSS. |
| RF-009-05 | O índice de busca DEVE ser filtrado no cliente antes da consulta, com base no teto e nas revelações. |
| RF-009-06 | Revelações caso a caso DEVEM ser guardadas por jogada e sincronizadas com o progresso (spec 003). |
| RF-009-07 | Dicas e variáveis DEVEM ter filtro próprio pelo seu nível, independente do nível do nó. |
| RF-009-08 | O filtro DEVE considerar a posição na campanha: missões principais já concluídas pelo jogador PODEM mostrar o nome mesmo acima do teto. [A ESCLARECER: confirmar esta regra; vale também para secundárias concluídas?] |
| RF-009-09 | A checagem final de texto do agente DEVE substituir nomes de nós acima do teto antes de exibir a resposta. |
| RF-009-10 | O jogador DEVE poder escolher nível 3 ("sem filtro") e desligar avisos de revelação. |

## 5. Requisitos não funcionais

| ID | Requisito | Meta |
|---|---|---|
| RNF-009-01 | Custo do filtro | < 5 ms para aplicar a 2 mil nós no navegador |
| RNF-009-02 | Troca de nível | Todas as telas atualizadas em < 200 ms, sem recarregar |
| RNF-009-03 | Cobertura de teste | 100% das superfícies listadas em docs/07 cobertas por teste de vazamento |

## 6. Casos de borda e falhas

- Nó sem `spoiler` (não deveria passar no CI da spec 001): tratado como nível 3.
- Item de mapa cujo nome revela uma missão (ex.: carta com nome de personagem): curadoria atribui nível maior que o padrão 1; o filtro só obedece o campo.
- Teto muda de 3 para 1 com um nó aberto em tela: o detalhe é refeito com rótulo neutro imediatamente.
- Nó revelado e depois fundido em outro por alias: a revelação migra para o ID final.
- Agente cita `[[id]]` de nó acima do teto: a interface renderiza o cartão com rótulo neutro.
- Notas de versão do catálogo ("adicionada missão X"): exibidas com o mesmo filtro.
- Captura de tela enviada pela spec 013 contendo nomes acima do teto: os nomes extraídos não são mostrados na revisão; aparecem como rótulos neutros.

## 7. Entidades e eventos (conceitual)

- **Preferência de spoiler**: teto (0 a 3), avisos ligados ou não; pertence ao perfil (ou ao dispositivo, sem login).
- **Revelação**: (jogada, id do nó ou da dica, quando).
- **Rótulo neutro**: derivado, não armazenado.
- **Evento local de vazamento**: registrado no console de desenvolvimento quando a checagem final substitui algo; não sai do dispositivo.

## 8. Cenários-ouro (se toca o motor ou o agente)

| ID | Estado de entrada | Resultado esperado | Como é verificado |
|---|---|---|---|
| CO-009-01 | Teto 1, catálogo com oculta de nível 2 em risco | `proximosPassos` e `antesDeAvancar` devolvem a oculta com rótulo neutro; nenhum campo contém o nome | Asserção determinística no motor |
| CO-009-02 | Teto 1, busca pelo prefixo do nome da oculta | Zero resultados com esse nó | Asserção determinística |
| CO-009-03 | Teto 1, oculta revelada | Busca e listas mostram o nome; descendentes continuam neutros | Asserção determinística |
| CO-009-04 | Teto 0, item de mapa | Só categoria e posição na saída do filtro | Asserção determinística |
| CO-009-05 | Teto 1, ferramenta `detalhe(id)` do agente para nó de nível 2 | Resultado da ferramenta sem nome, sem dicas acima do teto | Asserção determinística |
| CO-009-06 | Teto 1, resposta simulada do modelo contendo o nome de um nó nível 2 | Texto renderizado com o nome substituído pelo rótulo neutro | Asserção determinística |

## 9. Métricas de sucesso

- Zero reportes de spoiler indevido (categoria específica no reporte da spec 010)
- Distribuição de tetos escolhidos (para validar o padrão 1)
- Taxa de uso de "revelar" por sessão

## 10. Checagem contra a constituição

- [x] Ajuda a decidir o próximo passo (princípio 1): permite usar recomendações sem estragar a história
- [x] Perdíveis avisados antes (2) e nível de spoiler respeitado (3): alerta continua com contagem correta, só o nome é escondido
- [x] Funciona sem IA e sem token (4)
- [x] Dado com origem, confiança e ID estável (6, 7): revelações migram por alias
- [x] Decisão no motor determinístico, não no modelo (9, 11): filtro aplicado antes do modelo
- [x] Cabe no plano gratuito (13): filtro no cliente
- [x] RLS e teste de acesso cruzado, se toca dado de usuário (16): revelações seguem a RLS de progresso da spec 003

## 11. Perguntas em aberto

- [A ESCLARECER: nível por jogada em vez de por perfil?]
- [A ESCLARECER: nomes de missões principais já concluídas podem aparecer acima do teto (RF-009-08)?]
- [A ESCLARECER: ícones de categoria de missão (ex.: ícone de personagem) contam como spoiler de nível 2?]
