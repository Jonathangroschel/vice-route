# Spec 014: Calibração pela comunidade

- **Status:** rascunho para revisão (V2)
- **Responsável:** [nome]
- **Depende de:** 003 (progresso e carimbos de tempo), 008 (motor e cenários-ouro), 001 (catálogo e versões), 011 (planejador, consumidor das durações)
- **Última revisão:** 23/11/2026
- **Referências:** [docs/05-motor-recomendacao.md §8](../../docs/05-motor-recomendacao.md), [docs/03-arquitetura.md](../../docs/03-arquitetura.md)

## 1. Contexto e problema

O motor começa com durações estimadas por categoria e pesos fixos por perfil. Com jogadores usando o app, o progresso agregado mostra quanto cada item leva de verdade, quais itens costumam ser feitos juntos, quais perdíveis mais escapam e quais sugestões são aceitas. Esta spec transforma esse sinal em um arquivo estático (`priors.json`), calculado offline por uma GitHub Action, que o motor consome sem rede e sem modelo online. É o "treinamento" do projeto: estatística e ajuste de pesos, com privacidade.

## 2. Objetivos e não objetivos

**Objetivos**
- Expor, no Supabase, uma view agregada e anônima do progresso, sem identificar jogadores
- Gerar diariamente `priors.json` com duração mediana por nó, pares de ordem frequente, taxa de perda por perdível e taxa de aceite de sugestões
- Ajustar os pesos por perfil por busca em grade, aceitando só combinações que passam em todos os cenários-ouro
- Publicar `priors.json` versionado junto com o catálogo, consumido pelo parâmetro `priors` do motor
- Permitir que o jogador não participe (opt-out)

**Fora do escopo**
- Modelo aprendido rodando online ou no navegador (só com evidência, ver [docs/05 §8](../../docs/05-motor-recomendacao.md))
- Recomendação personalizada por similaridade entre jogadores
- Painéis públicos de estatística da comunidade [A ESCLARECER: talvez uma página "itens mais esquecidos"]

## 3. Histórias de usuário

### H1 (P1): durações reais no planejador

Como jogador, quero que os tempos estimados reflitam o que a comunidade leva de fato, para o plano caber na sessão.

**Critérios de aceite**
1. Dado um nó com pelo menos k jogadores distintos com intervalo válido, quando a Action roda, então `priors.json` traz a duração mediana desse nó.
2. Dado um nó com menos de k jogadores, quando a Action roda, então ele não aparece em `priors.json` e o motor usa `duracao_min` do catálogo.
3. Dado intervalo entre marcações consecutivas maior que o limite (proposta: 30 min) ou em regiões diferentes, quando a agregação calcula, então esse intervalo é descartado (o jogador provavelmente fez outra coisa).

### H2 (P1): perdíveis mais esquecidos ganham prioridade

Como caçador de 100%, quero que itens que muita gente perde subam no ranking.

**Critérios de aceite**
1. Dado um perdível com taxa de perda (jogadores que passaram do ponto sem retorno sem marcar / jogadores que passaram) acima da mediana, quando o motor usa os priors, então o peso de risco desse nó recebe um multiplicador limitado (proposta: até 1,5).
2. Dado qualquer prior, quando aplicado, então a regra fixa de perdível na próxima principal continua valendo (prior não reduz prioridade de perdível).

### H3 (P1): privacidade e opt-out

Como jogador, quero saber que meu progresso entra só de forma agregada e poder sair.

**Critérios de aceite**
1. Dado a view agregada, quando consultada com a chave anônima, então ela não expõe ID de usuário, ID de jogada, apelido ou carimbos de tempo individuais.
2. Dado qualquer agregado com menos de k jogadores distintos (proposta: k = 10), quando a view é consultada, então a linha não é devolvida.
3. Dado que desativo "contribuir com estatísticas anônimas" em Configurações, quando a próxima agregação roda, então meu progresso não entra em nenhum cálculo.
4. Dado conta excluída, quando a agregação roda, então os dados dela não existem mais na base (spec 003).

### H4 (P2): pesos calibrados sem quebrar regras

Como mantenedor, quero ajustar os pesos com dados reais sem arriscar um perdível fora do alerta.

**Critérios de aceite**
1. Dado a taxa de aceite por posição e por perfil, quando a Action roda a busca em grade, então ela avalia combinações de pesos dentro de faixas definidas e escolhe a de maior aceite estimado.
2. Dado uma combinação que quebra qualquer cenário-ouro, quando avaliada, então é descartada.
3. Dado que a melhor combinação melhora o aceite estimado em menos de 2 pontos percentuais, quando a Action termina, então os pesos atuais são mantidos.
4. Dado novos pesos aprovados, quando publicados, então a Action abre um PR alterando `priors.json` com relatório de antes e depois, e o merge segue o fluxo normal de curadoria.

### H5 (P2): ordem frequente como motivo

Como jogador, quero saber quando outros jogadores costumam fazer dois itens em sequência.

**Critérios de aceite**
1. Dado par (A, B) feito em sequência por pelo menos k jogadores distintos que chegaram a 100% numa categoria, quando A é concluído, então B ganha o motivo `JUNTO_COM_FREQUENCIA` e um bônus de desempate.
2. Dado o motivo, quando exibido, então a frase é "Jogadores costumam fazer logo depois de {A}", com spoiler aplicado.

## 4. Requisitos funcionais

| ID | Requisito |
|---|---|
| RF-014-01 | O Supabase DEVE ter uma view (ou função `security definer`) agregada que devolva só estatísticas por nó ou par de nós, com contagem de jogadores distintos ≥ k. |
| RF-014-02 | A agregação NÃO DEVE incluir jogadas com opt-out nem jogadas anônimas com menos de N marcações (proposta: 20), para reduzir ruído. |
| RF-014-03 | Uma GitHub Action agendada (diária) DEVE ler a view com uma chave de leitura restrita e gerar `priors.json`. |
| RF-014-04 | `priors.json` DEVE conter: versão, versão do catálogo de origem, data, `duracoes` (nó → mediana e n), `pares` (A → [B, frequência]), `taxaPerda` (nó → taxa e n), `aceite` (perfil → posição → taxa), `pesos` (perfil → pesos). |
| RF-014-05 | Durações DEVEM ser calculadas a partir de intervalos entre marcações consecutivas da mesma jogada, na mesma região, abaixo do limite de intervalo, com origem `manual` ou `sugestao` (não `captura`, que marca em lote). |
| RF-014-06 | Sugestões aceitas DEVEM ser medidas por marcação com origem `sugestao` em até 30 min após exibição. [A ESCLARECER: registrar exibições exige telemetria local agregada; definir formato mínimo.] |
| RF-014-07 | A busca em grade DEVE rodar o motor em Node com os cenários-ouro e descartar qualquer combinação que quebre um cenário. |
| RF-014-08 | Mudanças em `priors.json` DEVEM ser publicadas por PR automático com relatório, nunca por commit direto em `main`. |
| RF-014-09 | O motor DEVE limitar o efeito de cada prior (multiplicadores com teto) e manter a regra fixa de perdíveis. |
| RF-014-10 | O app DEVE oferecer opt-out em Configurações, ativado por padrão como "participar" com explicação clara. [A ESCLARECER: padrão participar ou não participar.] |
| RF-014-11 | `priors.json` de uma versão de catálogo DEVE ser ignorado para nós depreciados ou alterados de forma relevante (posição ou janela) desde a geração. |

## 5. Requisitos não funcionais

| ID | Requisito | Meta |
|---|---|---|
| RNF-014-01 | Duração da Action diária | < 10 min nos minutos gratuitos do GitHub Actions |
| RNF-014-02 | Tamanho de `priors.json` | < 100 KB gzip |
| RNF-014-03 | Carga no Supabase | Uma consulta agregada por dia; nenhuma consulta por jogador |
| RNF-014-04 | Anonimato | Nenhuma linha com menos de k = 10 jogadores distintos |

## 6. Casos de borda e falhas

- Poucos jogadores no início: `priors.json` sai quase vazio; o motor segue com os valores do catálogo.
- Jogador que marca tudo de uma vez ao começar (importação manual): intervalos curtos demais são descartados por limite inferior (proposta: 20 s).
- Catálogo mudou a posição de um item: durações antigas desse nó são descartadas (RF-014-11).
- Action falha (Supabase pausado, chave expirada): mantém o último `priors.json`; abre issue automática.
- Manipulação deliberada (contas marcando em ordem estranha): k mínimo, limite por jogada e uso de mediana reduzem o efeito.
- Supabase pausado por inatividade: a ação de manter ativo (docs/03) evita; a Action reporta.

## 7. Entidades e eventos (conceitual)

- **AgregadoDuracao**: nó, mediana, n.
- **AgregadoPar**: nó A, nó B, frequência, n.
- **AgregadoPerda**: nó, passaram, perderam.
- **AgregadoAceite**: perfil, posição no ranking, exibidas, aceitas.
- **Priors**: arquivo versionado com os agregados e os pesos aprovados.
- **PreferenciaEstatisticas**: opt-out por usuário (em `perfis`).

## 8. Cenários-ouro

| ID | Estado de entrada | Resultado esperado | Como é verificado |
|---|---|---|---|
| CO-014-01 | Base sintética com 9 jogadores num nó | Nó ausente da view e de `priors.json` | Asserção |
| CO-014-02 | Base sintética com 12 jogadores, intervalos conhecidos | Mediana correta; intervalos acima do limite descartados | Asserção |
| CO-014-03 | Jogador com opt-out | Dados fora da agregação | Asserção |
| CO-014-04 | Combinação de pesos que tira perdível do topo | Descartada na busca em grade | Asserção |
| CO-014-05 | Prior de taxa de perda alta | Multiplicador respeita o teto de 1,5 | Asserção no motor |
| CO-014-06 | Todos os cenários CO-008-* com `priors.json` gerado | Continuam passando | Suíte do CI |

## 9. Métricas de sucesso

- Erro mediano entre duração estimada e real cai para ±25% (RNF-011-03)
- Taxa de aceite das 3 primeiras sugestões sobe em relação à linha de base com pesos fixos
- Taxa de perda média dos perdíveis cai entre versões

## 10. Checagem contra a constituição

- [x] Ajuda a decidir o próximo passo (princípio 1)
- [x] Perdíveis avisados antes (2) e nível de spoiler respeitado (3): regra fixa preservada; frases com spoiler aplicado
- [x] Funciona sem IA e sem token (4): estatística offline, sem modelo
- [x] Dado com origem, confiança e ID estável (6, 7): priors ligados à versão do catálogo
- [x] Decisão no motor determinístico, não no modelo (9, 11): priors são entrada estática do motor
- [x] Cabe no plano gratuito (13): uma consulta por dia, arquivo estático na CDN
- [x] RLS e teste de acesso cruzado (16): view agregada com k mínimo; teste garante que dados individuais não vazam

## 11. Perguntas em aberto

- [A ESCLARECER: opt-out (participa por padrão) ou opt-in?]
- [A ESCLARECER: como registrar exibições de sugestões para medir aceite sem telemetria pesada? Proposta: contador agregado local enviado junto com a sincronização de progresso.]
- [A ESCLARECER: valor de k (proposta 10) e limites de intervalo (20 s a 30 min).]
- [A ESCLARECER: publicar página pública "itens mais esquecidos"?]
