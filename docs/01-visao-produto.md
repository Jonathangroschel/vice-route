# 01. Visão do produto

## 1. Problema

GTA VI tem centenas de colecionáveis e atividades (só de cartas são 480, em 18 conjuntos, e o checklist de 100% pede parte de cada categoria), além da campanha principal, de missões secundárias e de missões ocultas que só aparecem depois de ações específicas. Os mapas interativos existentes respondem "onde está cada coisa" e deixam o jogador marcar o que pegou. Eles não respondem às perguntas que custam horas de jogo:

- O que eu consigo fazer **agora**, no ponto da história em que estou?
- O que vou **perder para sempre** se avançar para a próxima missão?
- O que preciso **fazer antes** para liberar aquela missão oculta?
- Estou nesta região com uma hora livre. **Qual a melhor sequência?**

Quem busca os 100% hoje cruza mapa, wiki, vídeo e planilha, e mesmo assim deixa passar itens perdíveis.

## 2. Visão

Uma plataforma web, gratuita e de código aberto, que acompanha o progresso de cada jogador em GTA VI e diz o que fazer em seguida: mapa com todos os itens, lista de todas as missões e de suas dependências, alerta de perdíveis antes do ponto sem retorno e recomendações de sequência por localização e por tempo disponível. Tudo calculado no próprio navegador, sem custo de IA. Para quem quiser, um agente de IA opcional conversa sobre o plano usando a chave do próprio jogador.

## 3. Diferencial

| | Mapas interativos atuais | Vice Route |
|---|---|---|
| Onde está cada item | ✔ | ✔ (mesma imagem-base oficial) |
| Marcar progresso | ✔ | ✔, com saves separados por jogada e modo offline |
| Missões principais, secundárias e ocultas | Parcial ou ausente | ✔, com árvore de dependências |
| Ações que liberam missões ocultas (gatilhos) | ✘ | ✔ |
| Janela de disponibilidade por capítulo | ✘ | ✔ |
| Alerta de perdíveis antes de avançar | ✘ | ✔ |
| Próximo passo recomendado, com motivo | ✘ | ✔, sem IA |
| Rota otimizada por posição e tempo | ✘ | ✔ (V2) |
| Conversa com agente de IA | ✘ | Opcional, chave do jogador (V2) |

A base é o **grafo de progressão** ([04-grafo-progressao.md](04-grafo-progressao.md)): todo item, missão e gatilho é um nó com local, janela de disponibilidade e pré-requisitos. O motor de recomendação ([05-motor-recomendacao.md](05-motor-recomendacao.md)) percorre esse grafo com o estado de cada jogador.

## 4. Natureza do projeto

- **Projeto pessoal**, sem monetização, em repositório público no GitHub.
- **Hospedagem gratuita**: Vercel (app web) e Supabase (autenticação e progresso).
- **Comunidade desde o início**: o catálogo é um conjunto de arquivos no repositório. Qualquer pessoa corrige ou acrescenta dados por pull request ou pelo botão "reportar" no app ([08-comunidade-curadoria.md](08-comunidade-curadoria.md)).
- **Bilíngue**: lançamento em português do Brasil e inglês.
- **Web primeiro**, mobile-first: o uso típico é o celular como segunda tela ao lado do console.

## 5. Personas

| Persona | O que precisa |
|---|---|
| Caçador de 100% | Não perder nada, saber o que fecha em cada capítulo, rota eficiente |
| Jogador da história | Seguir a campanha sem spoiler e pegar o que estiver no caminho |
| Jogador de sessão curta | "Tenho 40 minutos": um plano pronto para a sessão |
| Contribuidor | Corrigir posição, confirmar item, documentar gatilho de missão oculta com pouco atrito |
| Curador (mantenedor) | Revisar contribuições, publicar nova versão do catálogo sem quebrar o progresso de ninguém |

## 6. Requisitos funcionais de alto nível

| ID | Requisito | Spec |
|---|---|---|
| RF-01 | Catálogo versionado com todos os itens, missões, gatilhos e dependências, com origem e confiança | 001 |
| RF-02 | Levantamento e importação de dados de fontes de referência para o catálogo | 002 |
| RF-03 | Contas (social ou anônima), várias jogadas por conta, progresso sincronizado e offline | 003 |
| RF-04 | Mapa interativo com camadas por categoria, filtros, busca e detalhe do item | 004 |
| RF-05 | Checklist por categoria e contador de 100% | 005 |
| RF-06 | Lista de missões com árvore de dependências e gatilhos de missões ocultas | 006 |
| RF-07 | Painel de perdíveis por capítulo e alerta antes do ponto sem retorno | 007 |
| RF-08 | Recomendações de próximo passo calculadas no navegador, com motivos | 008 |
| RF-09 | Níveis de spoiler aplicados em toda a interface | 009 |
| RF-10 | Reportar erro, confirmar item e contribuir por pull request | 010 |
| RF-11 | Planejador de sessão com rota otimizada por posição e tempo (V2) | 011 |
| RF-12 | Agente de IA opcional com chave do jogador (V2) | 012 |
| RF-13 | Sincronizar progresso a partir de captura de tela do jogo (V2, usa o agente) | 013 |
| RF-14 | Ajuste das recomendações com dados agregados da comunidade, calculados offline (V2) | 014 |

## 7. Requisitos não funcionais

| ID | Requisito | Meta |
|---|---|---|
| RNF-01 | Primeira carga do mapa em 4G | < 3 s até o mapa interativo (p75) |
| RNF-02 | Cálculo de recomendações no navegador | < 100 ms para o catálogo inteiro em celular intermediário |
| RNF-03 | Marcar item | Resposta visual imediata (< 50 ms), sincronização em segundo plano |
| RNF-04 | Custo de operação | R$ 0 nos planos gratuitos com até ~5 mil jogadores ativos/mês (hipótese a medir) |
| RNF-05 | Custo de IA para o projeto | Zero; tokens pagos pela chave do jogador |
| RNF-06 | Acessibilidade | Navegável por teclado, contraste AA, ícones de categoria com rótulo |
| RNF-07 | Idiomas | Português do Brasil no lançamento; textos externalizados para i18n |

## 8. Métricas de sucesso

- Jogadores que concluem 100% usando o app e relatam não ter perdido itens perdíveis
- Percentual de recomendações aceitas (item marcado em até 30 min após aparecer como sugestão)
- Itens do catálogo com status "confirmado" (meta: 95% em 60 dias)
- Tempo médio entre um reporte de erro e a correção publicada
- Custo mensal de infraestrutura (meta: zero)

## 9. Fora do escopo

- Integração com a PSN (troféus) e com o Rockstar Games Social Club
- App nativo para iOS ou Android
- Moderação de contribuições dentro do app (a curadoria usa o fluxo de pull request do GitHub)
- GTA Online e qualquer modo multijogador
- Monetização, anúncios, planos pagos
