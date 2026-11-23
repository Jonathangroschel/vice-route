# Vice Route: acompanhamento de 100% para GTA VI

Projeto pessoal, aberto e gratuito. Plano de produto e especificações, no modelo de spec-driven development.

Mapa com todos os colecionáveis e atividades, lista de todas as missões (principais, secundárias e ocultas) com suas dependências, alerta do que será perdido antes de avançar na história e recomendação do próximo passo, tudo calculado no navegador do jogador, sem custo de IA. Um agente de IA opcional, com a chave do próprio jogador, conversa sobre o plano.

O app será lançado em português do Brasil e em inglês.

## Resumo executivo

**O que construir.** Uma aplicação web mobile-first (segunda tela ao lado do console) sobre um **grafo de progressão**: cada item, missão e gatilho é um nó com posição, janela de disponibilidade (a partir de quando existe, depois de quando some) e pré-requisitos. Um motor determinístico cruza esse grafo com o estado de cada jogador.

**Onde está o valor.** Mapas interativos respondem "onde está". O Vice Route responde "o que faço agora, nesta ordem, para não perder nada": o que está disponível no ponto da história em que o jogador está, o que fecha na próxima missão, o que é preciso fazer para liberar uma missão oculta e qual a melhor sequência na região onde ele está.

**As decisões que definem o projeto**

1. **Grafo, não lista.** Missões, colecionáveis, atividades, gatilhos e marcos num só modelo, com linguagem de pré-requisitos (E, OU, NÃO, pelo menos N) e janelas ligadas à campanha principal.
2. **O motor decide, o modelo explica.** Recomendações vêm de algoritmo determinístico e testado, rodando num Web Worker no navegador. Zero token, funciona offline, cada sugestão tem motivo.
3. **Sem treinar modelo no início.** As regras do jogo são conhecidas; algoritmo é exato onde importa (perdíveis). Na V2, estatísticas agregadas da comunidade calibram pesos e durações offline, publicadas como arquivo estático.
4. **Agente opcional, chave do jogador.** O agente chama as funções do motor como ferramentas, recebe dados já filtrados por spoiler e só cita IDs válidos. Chamado direto do navegador; o projeto não paga nem guarda chaves.
5. **Catálogo é código.** YAML no repositório público, validado no CI, compilado para JSON estático na CDN. Comunidade contribui por PR ou pelo botão "reportar" no app.
6. **Cabe no gratuito.** Vercel para o app e o catálogo; Supabase só para contas, progresso e reportes.
7. **Spoiler é escolha do jogador**, aplicado em toda a interface e no contexto do agente.
8. **Dados abertos da comunidade.** ~3,8 mil pinos do Open GTA 6 Map e as regras de 100% do GTA6Maps, ambos CC BY 4.0, importados com crédito; guias e o Vice Atlas servem para conferência.
9. **Mapa oficial como base.** Posições em pixels do mapa de Leonida publicado pela Rockstar, a mesma base do Vice Atlas, o que permite importar o JSON dele sem conversão. Tiles próprios (~20 MB) na Vercel.
10. **100% pela regra do jogo.** Cada categoria declara o mínimo exigido (ex.: 100 de 125 flamingos, 15 de 18 conjuntos de cartas), e o contador e o motor seguem essa regra.

## Mapa dos documentos

| Documento | Conteúdo |
|---|---|
| [docs/01-visao-produto.md](docs/01-visao-produto.md) | Problema, visão, diferencial, personas, requisitos, métricas, fora do escopo |
| [docs/02-dados-referencias.md](docs/02-dados-referencias.md) | Vice Atlas como referência, categorias e totais, fontes e confiança, levantamento inicial |
| [docs/03-arquitetura.md](docs/03-arquitetura.md) | Estático primeiro, motor no cliente, stack, repositório, catálogo compilado, Supabase, offline, limites gratuitos |
| [docs/04-grafo-progressao.md](docs/04-grafo-progressao.md) | Tipos de nó, campos, linguagem de pré-requisitos, janelas, spoiler, validações |
| [docs/05-motor-recomendacao.md](docs/05-motor-recomendacao.md) | **Recomendação sem tokens**: pipeline, pontuação, rota, motivos, pré-cálculo, calibração pela comunidade |
| [docs/06-agente-ia.md](docs/06-agente-ia.md) | Agente opcional: chave do jogador, ferramentas, spoiler, economia de tokens, avaliação |
| [docs/07-interface-web.md](docs/07-interface-web.md) | Navegação, telas, comportamentos transversais |
| [docs/08-comunidade-curadoria.md](docs/08-comunidade-curadoria.md) | Contribuição no app e por PR, papéis, versões do catálogo |
| [docs/09-roadmap.md](docs/09-roadmap.md) | Fases MVP e V2, ondas, caminho crítico, critérios de saída |
| [docs/10-decisoes-riscos.md](docs/10-decisoes-riscos.md) | Decisões, riscos, perguntas em aberto |
| [docs/adr/](docs/adr/) | Registros de decisão: motor no cliente, catálogo no git, posições e tiles da imagem oficial |
| [specs/constituicao.md](specs/constituicao.md) | Princípios inegociáveis |
| [specs/README.md](specs/README.md) | Processo e catálogo das 14 specs |

Ordem de leitura sugerida: este resumo, depois 04, 05, 03 e 09.

## Stack

TypeScript, pnpm + Turborepo, Nuxt 4, Leaflet (`CRS.Simple`), zod, Vitest, Supabase (Auth + Postgres com RLS), Vercel, GitHub Actions. Agente opcional na API da Anthropic (Haiku 5.5 por padrão, Sonnet 5.5 para planejamento).

## Código

O catálogo (2.181 itens em 36 categorias, importados de fontes abertas), o validador e os importadores já estão implementados. Como rodar: [DESENVOLVIMENTO.md](DESENVOLVIMENTO.md).

## Próximos passos

1. Responder às [perguntas em aberto](docs/10-decisoes-riscos.md#3-perguntas-em-aberto) que restam (pontos de controle da transformação, troca de personagem)
2. Criar o repositório público, o projeto na Vercel e o projeto no Supabase
3. ~~Specs 001 e 002: esquema, `catalog:check` e importadores~~ feito em 23/11; falta o gerador de tiles da imagem oficial (spec 004)
4. Levantar categorias e regras de 100%, a espinha da campanha e a primeira leva de missões ocultas e perdíveis
5. Seguir as ondas do [roadmap](docs/09-roadmap.md)
