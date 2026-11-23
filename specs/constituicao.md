# Constituição do Projeto

Princípios inegociáveis. Toda spec, plano técnico e pull request é revisado contra esta lista. Mudar um princípio exige um ADR em [docs/adr/](../docs/adr/) e registro em [docs/10-decisoes-riscos.md](../docs/10-decisoes-riscos.md).

## 1. Produto

1. **Responder "o que faço agora", não só "onde está".** Mapa e checklist são o básico. Toda funcionalidade nova é julgada por quanto ajuda o jogador a decidir o próximo passo rumo aos 100% sem perder nada.
2. **Nada perdível passa em silêncio.** Se um item deixa de existir depois de uma missão, o jogador é avisado antes de iniciá-la, com a lista do que ainda falta. Esse aviso tem prioridade sobre qualquer outra recomendação.
3. **Spoiler é escolha do jogador.** Nenhum nome, imagem ou descrição acima do nível de spoiler escolhido aparece em tela, em notificação ou no contexto enviado ao agente de IA.
4. **Funciona completo sem IA.** Mapa, checklist, dependências, missáveis, recomendações e rotas funcionam sem chave de API e sem custo de token. O agente de IA é um recurso opcional por cima do mesmo motor.

## 2. Dados

5. **O catálogo é código.** Itens, missões, dependências e categorias vivem em arquivos versionados no repositório público, validados por esquema no CI. Nenhum dado de catálogo existe só no banco.
6. **Toda informação tem origem e confiança.** Cada nó e cada aresta do grafo registra fonte (oficial, troféu, referência externa, comunidade, jogado) e nível de confirmação. Dado não confirmado aparece marcado como tal.
7. **Identificadores são estáveis.** O ID de um nó nunca muda nem é reaproveitado. Renomear, mover ou remover um item preserva o progresso de quem já o marcou (aliases e depreciação, nunca exclusão física).
8. **Dado de terceiros é referência, não dependência em tempo de execução.** Fontes externas (Vice Atlas, wikis, listas de troféus) alimentam o catálogo por importação offline. O app nunca consulta um site de terceiros ao vivo.

## 3. Motor e agente

9. **O motor decide, o modelo explica.** Disponibilidade, risco de perda, pontuação e rota são calculados por código determinístico e testado. O LLM só conversa usando os resultados do motor como ferramentas e nunca é a única fonte de uma recomendação.
10. **O modelo não inventa itens.** Toda resposta do agente que cita um item, missão ou local usa IDs devolvidos pelas ferramentas; a interface valida os IDs e descarta o que não existir no catálogo.
11. **Mesmo estado, mesma recomendação.** Para o mesmo catálogo, estado do jogador e parâmetros, o motor devolve exatamente o mesmo resultado, com os motivos de cada sugestão.
12. **Processamento no dispositivo primeiro.** O motor roda no navegador do jogador. O servidor guarda progresso e contribuições; não recalcula recomendações por usuário.

## 4. Custo e operação

13. **Cabe no gratuito.** Arquitetura dimensionada para os planos gratuitos da Vercel e do Supabase. Catálogo, tiles e artefatos pré-calculados são estáticos e servidos por CDN; o banco só guarda o que é do usuário.
14. **Token é do usuário.** O agente de IA usa a chave do próprio jogador (BYOK), guardada só no dispositivo dele. O projeto não paga nem armazena chaves de modelo.
15. **Offline tolerante.** Marcar progresso funciona sem conexão e sincroniza depois, sem perder marcações em conflito.

## 5. Segurança e privacidade

16. **Cada jogador só vê e altera o próprio progresso.** Toda tabela de usuário tem RLS; teste automatizado de acesso cruzado roda no CI.
17. **Mínimo de dados pessoais.** Login social ou anônimo; nenhum dado além do necessário para salvar progresso e atribuir contribuições. Exclusão de conta apaga progresso e anonimiza contribuições.
18. **Contribuição é dado não confiável.** Texto, coordenadas e imagens enviados pela comunidade passam por validação e revisão antes de entrar no catálogo publicado e nunca são interpretados como instrução pelo agente.

## 6. Engenharia

19. **Spec antes de código.** Nenhuma funcionalidade começa sem `spec.md` aprovada. O `plan.md` deriva da spec, e o `tasks.md` do plano.
20. **TypeScript em tudo.** Um monorepo, um app web, um pacote de motor puro (sem dependência de interface ou de rede), um pacote de esquema do catálogo.
21. **O motor é testado como biblioteca.** Cenários-ouro (estado de entrada, recomendação esperada) rodam no CI a cada mudança do motor ou do catálogo. Catálogo que quebra um cenário-ouro não é publicado.
22. **Comece simples.** Heurística antes de otimizador sofisticado; template de texto antes de LLM; arquivo estático antes de API. Complexidade só entra com evidência.
