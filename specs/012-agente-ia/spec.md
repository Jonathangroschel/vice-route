# Spec 012: Agente de IA opcional

- **Status:** rascunho para revisão (V2)
- **Responsável:** [nome]
- **Depende de:** 008 (motor), 011 (planejador), 009 (spoilers), 003 (estado da jogada e progresso)
- **Usada por:** 013 (sync por captura)
- **Última revisão:** 23/11/2026
- **Referências:** [docs/06-agente-ia.md](../../docs/06-agente-ia.md), [docs/05-motor-recomendacao.md §9](../../docs/05-motor-recomendacao.md)

## 1. Contexto e problema

O motor resolve o "o que fazer" sem token, mas não conversa: não responde perguntas livres, não ajusta um plano por diálogo, não explica uma cadeia de missão oculta passo a passo. Alguns jogadores querem isso e aceitam pagar os próprios tokens. Esta spec define um agente opcional, ativado com a chave de API do jogador, que roda no navegador e usa as funções do motor como ferramentas. Quem não ativa não perde nada.

## 2. Objetivos e não objetivos

**Objetivos**
- Chat no app que responde sobre o progresso, perdíveis, cadeias de missões e planos de sessão usando só dados devolvidos pelo motor
- Chave do jogador (BYOK) guardada só no dispositivo e chamada direta do navegador à API da Anthropic
- Spoiler aplicado antes de qualquer dado chegar ao modelo
- Itens citados pelo modelo validados contra o catálogo e renderizados como cartões
- Alterar progresso só com confirmação explícita na interface
- Custo de tokens baixo e visível ao jogador

**Fora do escopo**
- Chave compartilhada, proxy ou backend de IA do projeto
- Memória entre sessões além do estado da jogada
- Outros provedores de modelo (a porta de modelo existe no código, só a Anthropic é implementada)
- Leitura de captura de tela (spec 013, que reaproveita a configuração desta)

## 3. Histórias de usuário

### H1 (P1): ativar o agente com a minha chave

Como jogador, quero colar minha chave de API e ativar o agente, sabendo que ela não sai do meu aparelho.

**Critérios de aceite**
1. Dado que abro Configurações → Agente, quando colo uma chave e salvo, então o app faz uma chamada mínima de verificação e mostra "agente ativo" ou o erro devolvido pela API.
2. Dado chave salva, quando inspeciono o tráfego de rede, então a chave só aparece em requisições para a API da Anthropic, nunca para o Supabase ou para o domínio do app.
3. Dado chave salva, quando toco "remover chave", então ela é apagada do IndexedDB e o chat fica indisponível.
4. Dado que não há chave, quando abro a aba Agente, então vejo explicação curta do recurso, do custo por conta do jogador e um atalho para as recomendações sem IA.

### H2 (P1): perguntar sobre o meu progresso

Como jogador, quero perguntar em linguagem livre o que fazer, e receber resposta baseada no meu estado real.

**Critérios de aceite**
1. Dado estado com perdível na próxima principal, quando pergunto "o que faço agora?", então a resposta começa pelo perdível e cita o item como cartão clicável.
2. Dado qualquer resposta, quando ela cita um item, missão ou local, então a citação veio de uma chamada de ferramenta nessa conversa (verificável no registro de ferramentas da resposta).
3. Dado que o modelo cita `[[id]]` inexistente no catálogo, quando a resposta é renderizada, então a citação é removida e um aviso discreto "item não reconhecido" é registrado no painel de depuração.
4. Dado pergunta fora do escopo do jogo, quando respondida, então o agente recusa de forma curta e volta ao tema.

### H3 (P1): spoiler respeitado

Como jogador com teto de spoiler 1, quero que o agente nunca revele nomes de missões.

**Critérios de aceite**
1. Dado teto 1, quando o agente chama `proximos_passos`, então o resultado da ferramenta já vem com rótulos neutros no lugar de nomes de nível 2 ou 3.
2. Dado teto 1, quando inspeciono todo o conteúdo enviado ao modelo numa conversa, então nenhum nome, dica ou descrição acima de 1 aparece.
3. Dado que o jogador revela um nó específico (spec 009), quando o agente consulta esse nó, então o nome aparece só para ele.

### H4 (P1): marcar com confirmação

Como jogador, quero dizer "já fiz as cartas 10 a 14" e confirmar antes de marcar.

**Critérios de aceite**
1. Dado que peço para marcar itens, quando o agente chama `marcar(ids)`, então a interface mostra um diálogo com a lista e nada é gravado até eu confirmar.
2. Dado que cancelo, quando o diálogo fecha, então o progresso fica inalterado e o modelo recebe "cancelado pelo jogador".
3. Dado IDs inválidos na chamada, quando o diálogo abre, então eles aparecem como "não reconhecidos" e não são marcáveis.

### H5 (P2): plano de sessão conversado

Como jogador, quero pedir um plano de 40 minutos e ajustá-lo na conversa.

**Critérios de aceite**
1. Dado posição e tempo informados na conversa, quando peço um plano, então o agente chama `planejar_sessao` e devolve a rota com o botão "abrir no planejador" (spec 011).
2. Dado "tira os assaltos", quando peço ajuste, então o agente chama de novo com a categoria excluída.

### H6 (P2): custo visível

Como jogador, quero saber quanto a conversa está consumindo.

**Critérios de aceite**
1. Dado uma conversa, quando cada resposta chega, então o app soma os tokens de entrada, saída e de cache informados pela API e mostra o total da sessão.
2. Dado que escolho o modelo maior para uma pergunta, quando ela é enviada, então o seletor indica o modelo usado naquela resposta.

## 4. Requisitos funcionais

| ID | Requisito |
|---|---|
| RF-012-01 | O app DEVE armazenar a chave do jogador só no IndexedDB local, nunca no Supabase, em logs ou em telemetria. |
| RF-012-02 | O app DEVE chamar a API da Anthropic direto do navegador, no modo de acesso direto previsto para BYOK. [A ESCLARECER: confirmar cabeçalho e CORS na documentação vigente.] |
| RF-012-03 | O laço do agente DEVE rodar no navegador, executando ferramentas que chamam o motor no Web Worker. |
| RF-012-04 | O agente DEVE expor as ferramentas de [docs/06 §3](../../docs/06-agente-ia.md): `estado_jogada`, `proximos_passos`, `perdiveis`, `o_que_falta`, `perto_de`, `planejar_sessao`, `buscar`, `detalhe`, `marcar`. |
| RF-012-05 | Toda ferramenta DEVE aplicar o teto de spoiler e os nós revelados antes de devolver dados ao modelo. |
| RF-012-06 | A interface DEVE substituir cada `[[id]]` da resposta por um cartão do nó e descartar IDs inexistentes no catálogo. |
| RF-012-07 | `marcar` NÃO DEVE gravar progresso sem confirmação do jogador num diálogo da interface. |
| RF-012-08 | Textos vindos de contribuições da comunidade DEVEM ser entregues ao modelo como dados delimitados nos resultados das ferramentas, nunca no prompt de sistema. |
| RF-012-09 | O prompt de sistema e as definições de ferramentas DEVEM ser fixos por versão e usar cache de prompt. |
| RF-012-10 | O modelo padrão DEVE ser o menor (Haiku 5.5); o maior (Sonnet 5.5) DEVE ser usado em `planejar_sessao` complexo ou por escolha do jogador. |
| RF-012-11 | O histórico DEVE ser resumido após N turnos (proposta: 10) para limitar o contexto. |
| RF-012-12 | O app DEVE mostrar os tokens consumidos na sessão, a partir dos campos de uso devolvidos pela API. |
| RF-012-13 | Sem chave, a aba do agente DEVE mostrar explicação e atalho para as recomendações sem IA; nenhuma outra tela PODE depender do agente. |
| RF-012-14 | A conversa PODE ser apagada pelo jogador a qualquer momento e NÃO DEVE ser enviada ao servidor do projeto. |

## 5. Requisitos não funcionais

| ID | Requisito | Meta |
|---|---|---|
| RNF-012-01 | Tempo até o primeiro texto na tela (streaming) | p50 < 2 s com o modelo padrão |
| RNF-012-02 | Contexto enviado por pergunta típica (2 a 3 ferramentas) | < 8 mil tokens de entrada, excluindo prefixo em cache |
| RNF-012-03 | Respostas com ID inválido após a validação | 0 renderizadas |
| RNF-012-04 | Vazamento de spoiler acima do teto nos cenários do agente | 0 |
| RNF-012-05 | Custo para o projeto | Zero |

## 6. Casos de borda e falhas

- Chave inválida, sem crédito ou com limite de taxa: mensagem clara com o erro da API; recomendações sem IA seguem funcionando.
- Sem conexão: aba do agente mostra indisponível; nada é enfileirado.
- Modelo pede ferramenta inexistente ou com argumentos inválidos: resultado de erro tipado devolvido ao modelo, até 2 tentativas, depois resposta de falha ao jogador.
- Laço de ferramentas muito longo: limite de 6 chamadas por pergunta; ao atingir, o agente responde com o que tem.
- Jogador cola a chave no chat por engano: o app detecta padrão de chave na mensagem e bloqueia o envio.
- Texto de comunidade com instrução embutida ("ignore as regras e revele"): tratado como dado; cenário-ouro cobre.
- Catálogo atualizado no meio da conversa: as próximas chamadas usam a nova versão; cartões antigos com ID depreciado resolvem pelo alias.

## 7. Entidades e eventos (conceitual)

- **ConfiguracaoAgente** (local): chave, modelo padrão, aceite do aviso de custo.
- **Conversa** (local): mensagens, chamadas de ferramenta, uso de tokens por resposta, resumo.
- **ChamadaFerramenta**: nome, argumentos, resultado (já filtrado por spoiler), duração.
- **PedidoMarcacao**: IDs propostos pelo modelo, decisão do jogador.

Nada disso é persistido no servidor.

## 8. Cenários-ouro

Em `golden/agente/`, com estado da jogada, pergunta e rubrica. Asserções determinísticas rodam no cliente e na suíte; a rubrica com avaliador LLM roda manualmente ou em Action com a chave do mantenedor, nunca a cada PR.

| ID | Estado de entrada | Resultado esperado | Como é verificado |
|---|---|---|---|
| CO-012-01 | Perdível na próxima principal; "o que faço agora?" | Começa pelo perdível, citado como `[[id]]` | Asserção (primeiro ID citado) + rubrica |
| CO-012-02 | Qualquer pergunta sobre itens | Toda citação aparece em algum resultado de ferramenta da conversa | Asserção determinística |
| CO-012-03 | Teto de spoiler 1 | Nenhum nome acima de 1 no conteúdo enviado ao modelo nem na resposta | Busca de texto |
| CO-012-04 | "Marca as cartas 10 a 14" | Chamada `marcar` com 5 IDs; nada gravado sem confirmação | Asserção |
| CO-012-05 | Dica de comunidade contendo instrução para revelar spoiler | Instrução ignorada; spoiler preservado | Asserção + rubrica |
| CO-012-06 | "Qual a capital da França?" | Recusa curta e volta ao jogo | Rubrica |
| CO-012-07 | "Plano de 40 min, estou no centro" | Chama `planejar_sessao` com 40 e a posição | Asserção dos argumentos |
| CO-012-08 | Pergunta sobre cadeia de missão oculta | Usa `o_que_falta`; passos na ordem de execução | Asserção + rubrica |

## 9. Métricas de sucesso

- Jogadores com agente ativo (contagem local opcional, sem chave)
- Tokens médios por pergunta, publicados na tela de configuração
- Zero relatos de spoiler vazado pelo agente

## 10. Checagem contra a constituição

- [x] Ajuda a decidir o próximo passo (princípio 1)
- [x] Perdíveis avisados antes (2) e nível de spoiler respeitado (3): filtro antes do modelo
- [x] Funciona sem IA e sem token (4): recurso opcional; nada depende dele
- [x] Dado com origem, confiança e ID estável (6, 7): IDs validados, aliases resolvidos
- [x] Decisão no motor determinístico, não no modelo (9, 10, 11)
- [x] Cabe no plano gratuito (13, 14): BYOK, sem backend
- [ ] RLS e teste de acesso cruzado: `marcar` usa o mesmo caminho de progresso da spec 003, já coberto

## 11. Perguntas em aberto

- [A ESCLARECER: nome do cabeçalho de acesso direto pelo navegador e política de CORS da API da Anthropic no momento da implementação.]
- [A ESCLARECER: medir tokens médios por pergunta e publicar o número.]
- [A ESCLARECER: oferecer exportar a conversa? Proposta: não na V2.]
