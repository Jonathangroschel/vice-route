# Spec 010: Contribuição da comunidade

- **Status:** rascunho para revisão
- **Responsável:** [nome]
- **Depende de:** 001 (catálogo, status de confiança, versões), 003 (contas e RLS), 004 (detalhe do nó e toque no mapa), 009 (filtro de spoiler nos formulários)
- **Referências:** [docs/08-comunidade-curadoria.md](../../docs/08-comunidade-curadoria.md), [docs/02-dados-referencias.md](../../docs/02-dados-referencias.md) §2
- **Última revisão:** 2026-11-23

## 1. Contexto e problema

O catálogo nasce da referência e de levantamento manual, com muitos itens em `status: referencia`. Quem está jogando é quem descobre posição errada, item duplicado, gatilho mal descrito ou missão oculta não documentada. Esta spec dá a qualquer jogador um caminho de poucos toques para confirmar e reportar, e leva essas contribuições até o único caminho de entrada no catálogo: um pull request revisado (princípio 5). Não há moderação dentro do app; a curadoria acontece no GitHub.

## 2. Objetivos e não objetivos

**Objetivos**
- Confirmar um item em um toque
- Reportar erro em um nó com tipo, texto curto e, quando for posição, toque no mapa
- Sugerir item novo pelo mapa
- Agrupar reportes por nó em issues do GitHub, automaticamente
- Abrir PR de confirmação automática quando um nó atinge N confirmações independentes (N = 3)
- Crédito ao contribuidor por apelido nas notas da versão

**Fora do escopo**
- Moderação, fila de revisão ou edição do catálogo dentro do app
- Upload de imagens nas contribuições [A ESCLARECER: aceitar captura como prova na V2?]
- Discussão ou comentários entre jogadores no app
- Reputação com pontos ou ranking

## 3. Histórias de usuário

### H1 (P1): confirmar um item

Como jogador, quero confirmar que um item está onde o app diz, para ajudar a tirar o selo "não confirmado".

**Critérios de aceite**
1. Dado um nó com status `nao_confirmado` ou `referencia`, quando abro o detalhe, então vejo o botão "Está aqui, confirmar".
2. Dado que marco um item como concluído, quando o status dele não é `confirmado`, então o app pergunta uma vez, de forma não bloqueante, "Estava exatamente aqui?" com sim / não / pular.
3. Dado que confirmo, quando a ação é gravada, então fica registrada uma confirmação por (usuário, nó); confirmar de novo não conta em dobro.
4. Dado que respondo "não" à pergunta do critério 2, quando continuo, então o formulário de reporte abre já com tipo "posição".
5. Dado um usuário anônimo, quando confirma, então a confirmação é registrada, mas só conta para o limiar quando a conta estiver vinculada a login social. [A ESCLARECER: confirmar regra]

### H2 (P1): reportar erro

Como contribuidor, quero apontar um erro em poucos toques, para que seja corrigido na próxima versão.

**Critérios de aceite**
1. Dado o detalhe de um nó, quando toco em "Reportar", então escolho o tipo: posição, nome, requisito ou gatilho, janela (quando aparece ou some), duplicado, não existe, spoiler indevido, outro.
2. Dado o tipo "posição", quando reporto, então toco no mapa para indicar a posição correta e o app grava a posição em pixels da imagem-base, com `qualidade: aproximada`.
3. Dado o tipo "duplicado", quando reporto, então escolho o outro nó na busca ou no mapa.
4. Dado qualquer tipo, quando envio, então o texto livre é opcional, limitado a 500 caracteres e guardado como texto puro.
5. Dado um usuário anônimo, quando toca em "Reportar", então o app pede login social antes de abrir o formulário.
6. Dado o envio sem conexão, quando volto a ficar online, então o reporte é enviado pela fila de sincronização (spec 003).
7. Dado o envio concluído, quando abro "Minhas contribuições", então vejo o reporte com status: enviado, em issue (com link), resolvido (com versão), recusado.

### H3 (P1): sugerir item novo

Como contribuidor, quero indicar no mapa um item que não está no catálogo.

**Critérios de aceite**
1. Dado o mapa, quando faço toque longo num ponto vazio, então posso escolher "Sugerir item aqui".
2. Dado o formulário, quando preencho categoria (ou "missão / gatilho"), nome opcional e descrição, então a sugestão é gravada com a coordenada.
3. Dado uma sugestão a menos de 20 unidades de um nó existente da mesma categoria, quando envio, então o app pergunta se não é esse nó e oferece confirmar em vez de sugerir.
4. Dado uma sugestão do tipo missão ou gatilho, quando envio, então o formulário pede "como liberou" em texto e marca a contribuição como sensível a spoiler (nível 2 ou mais).

### H4 (P1): de reporte a issue

Como curador, quero receber os reportes agrupados por nó no GitHub, para decidir e corrigir num PR.

**Critérios de aceite**
1. Dado reportes novos, quando a GitHub Action agendada roda (diária, ou manual), então cria uma issue por nó com reportes abertos, ou atualiza a issue existente, com contagem por tipo, coordenadas propostas e textos.
2. Dado vários reportes de posição para o mesmo nó, quando agrupados, então a issue mostra a mediana das coordenadas propostas e a dispersão.
3. Dado uma issue criada, quando a Action termina, então os reportes passam para "em issue" com o link, e o nó passa a exibir o selo "reporte em análise", lido da view pública agregada de reportes. O `status: contestado` do catálogo só muda por PR do curador (docs/02 §2).
4. Dado um PR que fecha a issue e é mesclado, quando o catálogo é publicado, então os reportes ligados viram "resolvido" com a versão, e o contribuidor vê isso em "Minhas contribuições".
5. Dado uma issue fechada sem PR, quando a Action roda, então os reportes viram "recusado" com o motivo (rótulo da issue).

### H5 (P1): confirmação automática

Como curador, quero que confirmações suficientes virem PR pronto, para não revisar item a item.

**Critérios de aceite**
1. Dado um nó com 3 confirmações independentes de contas com login social e sem reporte aberto, quando a Action roda, então um PR muda `status` para `confirmado` e acrescenta `fontes: [{ tipo: comunidade, obs: "3 confirmações até <data>" }]`.
2. Dado vários nós elegíveis, quando a Action roda, então todos vão num único PR por categoria.
3. Dado um nó com reporte aberto, quando atinge 3 confirmações, então não entra no PR até o reporte ser resolvido.

### H6 (P2): limites e abuso

Como curador, quero conter spam e vandalismo sem moderação no app.

**Critérios de aceite**
1. Dado um usuário com 30 reportes ou sugestões no dia, quando tenta enviar mais, então recebe aviso e o envio é recusado até o dia seguinte.
2. Dado um usuário com reportes recusados repetidamente (≥ 5 recusados e 0 resolvidos), quando envia novos, então eles ficam fora do agrupamento automático até revisão manual.
3. Dado uma conta excluída, quando a exclusão ocorre, então reportes e confirmações ficam anonimizados (sem vínculo de usuário) e continuam contando.

### H7 (P2): crédito

Como contribuidor, quero ver meu apelido reconhecido quando minha contribuição entra no catálogo.

**Critérios de aceite**
1. Dado um reporte resolvido, quando as notas da versão são geradas, então o apelido aparece na seção de agradecimentos, se eu tiver permitido no perfil.
2. Dado que não permiti crédito, quando as notas são geradas, então apareço só na contagem total.

## 4. Requisitos funcionais

| ID | Requisito |
|---|---|
| RF-010-01 | O app DEVE permitir confirmar, reportar e sugerir a partir do detalhe do nó e do mapa. |
| RF-010-02 | Confirmações DEVEM ser únicas por (usuário, nó, versão do catálogo em que o nó foi alterado pela última vez). |
| RF-010-03 | Reportes DEVEM ter tipo de uma lista fechada, texto opcional ≤ 500 caracteres, coordenada quando aplicável, nó relacionado e versão do catálogo. |
| RF-010-04 | Reportar e sugerir DEVEM exigir conta com login social; confirmar PODE ser feito por conta anônima. |
| RF-010-05 | As tabelas `reportes` e `confirmacoes` DEVEM ter RLS: o usuário cria e lê só os próprios registros; uma view pública expõe só contagens agregadas por nó. |
| RF-010-06 | A Action de agrupamento DEVE usar uma credencial de serviço do Supabase guardada como segredo do GitHub, nunca no app. |
| RF-010-07 | A Action DEVE ser idempotente: rodar duas vezes não cria issue nem PR duplicado. |
| RF-010-08 | O limiar N de confirmação DEVE ser configurável; valor inicial 3. |
| RF-010-09 | Texto de contribuições DEVE ser tratado como dado não confiável: texto puro, sem HTML, escapado nas issues, nunca enviado ao agente como instrução (princípio 18). |
| RF-010-10 | Formulários DEVEM aplicar o filtro de spoiler (spec 009) aos nós mostrados para escolha (ex.: duplicado). |
| RF-010-11 | O app DEVE ter uma tela "Minhas contribuições" com status de cada envio. |
| RF-010-12 | O app DEVE ter link para o guia de contribuição por PR (CONTRIBUTING.md). |
| RF-010-13 | Limites por usuário DEVEM ser aplicados no servidor (política ou função do banco), não só na interface. |

## 5. Requisitos não funcionais

| ID | Requisito | Meta |
|---|---|---|
| RNF-010-01 | Confirmar um item | 1 toque, resposta visual < 50 ms |
| RNF-010-02 | Reportar erro | ≤ 4 toques para tipos sem texto |
| RNF-010-03 | Volume no banco | < 1 KB por reporte; cabe no plano gratuito com 100 mil reportes |
| RNF-010-04 | Tempo de reporte até issue | ≤ 24 h (Action diária) |
| RNF-010-05 | Execução da Action | < 5 min, dentro da cota gratuita do GitHub Actions |

## 6. Casos de borda e falhas

- Reporte sobre nó depreciado ou fundido: redirecionado ao ID final via alias.
- Reporte sobre nó alterado depois do envio: a issue mostra a versão do catálogo do reporte e a atual.
- Confirmação de posição para item cuja posição mudou na nova versão: confirmações antigas deixam de contar (RF-010-02).
- Usuário confirma e depois reporta o mesmo nó: o reporte prevalece; a confirmação é desconsiderada.
- GitHub fora do ar ou cota esgotada: a Action falha sem marcar reportes como "em issue"; próxima execução retoma.
- Sugestão de item que já existe com status `depreciado`: issue sugere reverter a depreciação.
- Reporte com texto ofensivo: chega à issue escapado; curador fecha com rótulo "recusado".
- Spoiler no texto do reporte: issues com rótulo `spoiler` quando o nó tem nível ≥ 2.

## 7. Entidades e eventos (conceitual)

- **Confirmação**: usuário, nó, versão do catálogo, quando.
- **Reporte**: usuário, nó (ou nenhum, se sugestão), tipo, texto, coordenada proposta, nó duplicado, versão do catálogo, status (enviado, em issue, resolvido, recusado), link da issue, versão de resolução.
- **Sugestão**: reporte sem nó, com categoria proposta e coordenada.
- **Issue de nó**: agrupamento de reportes de um nó no GitHub.
- **PR de confirmação**: lote de nós que atingiram o limiar.
- **Eventos**: reporte criado, reporte agrupado, nó elegível para confirmação, reporte resolvido ou recusado.

## 8. Cenários-ouro (se toca o motor ou o agente)

| ID | Estado de entrada | Resultado esperado | Como é verificado |
|---|---|---|---|
| CO-010-01 | 3 confirmações de contas sociais distintas num nó sem reporte | Nó entra no PR de confirmação | Asserção determinística na Action (com banco de teste) |
| CO-010-02 | 3 confirmações, 1 delas anônima | Nó não entra no PR | Asserção determinística |
| CO-010-03 | 3 confirmações + 1 reporte aberto | Nó não entra no PR | Asserção determinística |
| CO-010-04 | 4 reportes de posição no mesmo nó | Uma issue com mediana das coordenadas | Asserção determinística |
| CO-010-05 | Action executada duas vezes | Nenhuma issue ou PR duplicado | Asserção determinística |
| CO-010-06 | Usuário B tenta ler reportes do usuário A | Acesso negado pela RLS | Teste de acesso cruzado no CI |

## 9. Métricas de sucesso

- Itens `confirmado` (meta de docs/01: 95% em 60 dias)
- Tempo mediano de reporte até correção publicada
- Proporção de reportes resolvidos sobre recusados
- Número de contribuidores distintos por mês

## 10. Checagem contra a constituição

- [x] Ajuda a decidir o próximo passo (princípio 1): dados corretos melhoram as recomendações
- [x] Perdíveis avisados antes (2) e nível de spoiler respeitado (3): formulários e issues respeitam spoiler
- [x] Funciona sem IA e sem token (4)
- [x] Dado com origem, confiança e ID estável (6, 7): confirmações viram fonte `comunidade`; reportes seguem aliases
- [x] Decisão no motor determinístico, não no modelo (9, 11): não se aplica
- [x] Cabe no plano gratuito (13): poucas linhas no Supabase, Action diária
- [x] RLS e teste de acesso cruzado, se toca dado de usuário (16): CO-010-06

## 11. Perguntas em aberto

- [A ESCLARECER: confirmação anônima conta para o limiar depois de vincular a conta?]
- [A ESCLARECER: aceitar captura de tela como prova numa versão futura (armazenamento conta para o limite gratuito)?]
- [A ESCLARECER: a Action cria PRs de correção de posição automaticamente quando há consenso (ex.: 5 reportes com dispersão baixa), ou só a issue?]
