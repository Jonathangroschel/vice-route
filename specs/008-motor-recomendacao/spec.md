# Spec 008: Motor de recomendação

- **Status:** rascunho para revisão
- **Responsável:** [nome]
- **Depende de:** 001 (catálogo e grafo), 003 (estado da jogada e progresso), 009 (níveis de spoiler)
- **Usada por:** 004 (mapa), 006 (missões), 007 (perdíveis e capítulo), 011 (planejador, V2), 012 (agente, V2), 014 (calibração, V2)
- **Última revisão:** 23/11/2026
- **Referências:** [docs/05-motor-recomendacao.md](../../docs/05-motor-recomendacao.md), [docs/04-grafo-progressao.md](../../docs/04-grafo-progressao.md)

## 1. Contexto e problema

Cada jogador avança de um jeito: ordem de missões, personagem, escolhas, categorias que prioriza. Para dizer "o que fazer agora" a cada um, sem custo de token e sem servidor, o app precisa de um motor que cruze o grafo de progressão com o estado da jogada e devolva status, riscos, ranking e motivos. Esta spec define o comportamento observável desse motor. A roteirização (sequência ótima por posição e tempo) pertence à spec 011; aqui só fica o ponto de extensão.

## 2. Objetivos e não objetivos

**Objetivos**
- Classificar cada nó do catálogo para a jogada atual (concluído, disponível, bloqueado, futuro, perdido, em risco)
- Dizer, para cada nó bloqueado, o conjunto mínimo do que falta para liberá-lo
- Medir o risco de perda e propagá-lo para os pré-requisitos que faltam
- Ordenar próximos passos por pontuação ponderada, com motivos explicáveis em português
- Responder às consultas usadas pelas telas: próximos passos, perdíveis, antes de avançar, checklist do capítulo, o que falta, perto de mim
- Rodar no navegador, sem rede, de forma determinística e em menos de 100 ms

**Fora do escopo**
- Roteirização e plano de sessão (`planoSessao`, spec 011)
- Conversa em linguagem natural (spec 012)
- Ajuste de pesos e durações com dados da comunidade (spec 014); aqui os pesos são constantes por perfil e o motor apenas aceita um `priors` opcional
- Persistência do progresso (spec 003) e renderização das telas (specs 004 a 007)

## 3. Histórias de usuário

### H1 (P1): saber o status de cada item

Como jogador, quero ver para cada item e missão se já fiz, se posso fazer agora, se está bloqueado, se ainda não chegou ou se já perdi, para não perder tempo procurando o que não existe.

**Critérios de aceite**
1. Dado um nó sem `requer`, com `disponivel_desde` já alcançado e `perdivel_apos` não alcançado, quando o motor calcula, então o status é `disponivel`.
2. Dado um nó cuja missão de `disponivel_desde` ainda não foi alcançada (respeitando `momento: inicio | conclusao`), quando o motor calcula, então o status é `futuro`.
3. Dado um nó não concluído cuja missão de `perdivel_apos` já foi iniciada (momento `inicio`) ou concluída (momento `conclusao`), quando o motor calcula, então o status é `perdido`.
4. Dado um nó na janela com `requer` não satisfeito, quando o motor calcula, então o status é `bloqueado` e o resultado traz a lista de átomos que faltam.
5. Dado que o jogador marcou a missão principal 12, quando o motor calcula, então todas as principais exigidas por ela aparecem como `concluido` (fecho implícito), sem gravação extra no progresso.
6. Dado um nó marcado com um ID que hoje é alias de outro nó, quando o motor calcula, então o progresso é atribuído ao nó atual.
7. Dado um nó cujo `personagem` não é o personagem atual nem `ambos`/`qualquer`, quando o motor calcula, então ele fica `bloqueado` com o átomo faltante `personagem`.

### H2 (P1): saber o que falta para liberar

Como jogador, quero ver exatamente o que preciso fazer antes para liberar uma missão oculta ou um item, para planejar a cadeia inteira.

**Critérios de aceite**
1. Dado um nó com `requer: todos[A, B]` e só A concluído, quando consulto `oQueFalta`, então recebo apenas B.
2. Dado `requer: qualquer[A, B]` com nenhum concluído, quando consulto, então recebo a alternativa de menor duração somada; em empate, a de menor ID em ordem lexicográfica.
3. Dado `requer: pelo_menos {n: 3, de: [A..E]}` com A concluído, quando consulto, então recebo os 2 itens de menor duração entre B..E.
4. Dado que um item faltante também está bloqueado, quando consulto `oQueFalta` recursivo, então recebo a cadeia completa em ordem de execução (pré-requisitos antes dos dependentes), sem repetir nós.
5. Dado `requer` com `nao: concluido X` e X concluído, quando consulto, então o nó aparece como impossível nesta jogada (status `perdido`, motivo `CAMINHO_EXCLUIDO`).
6. Dado um átomo `variavel` cuja variável o jogador ainda não preencheu, quando consulto, então o átomo faltante é `variavel_nao_informada`, e não um bloqueio definitivo.

### H3 (P1): ser avisado do que vou perder

Como caçador de 100%, quero saber o que some se eu iniciar a próxima missão principal, para fazer antes.

**Critérios de aceite**
1. Dado um nó disponível com `perdivel_apos` na próxima missão principal, quando o motor calcula, então ele tem status `em_risco` e aparece em `antesDeAvancar(proxima)`.
2. Dado K = 2 (padrão), quando um nó some em 3 missões principais, então ele não está `em_risco`, mas aparece em `perdiveis()` com `missoes_ate_perder = 3`.
3. Dado um gatilho disponível que é pré-requisito faltante de uma missão oculta perdível em 1 missão, quando o motor calcula, então o gatilho herda a urgência da oculta e recebe o motivo `DESTRAVA` com `perdiveis >= 1`.
4. Dado qualquer perfil e qualquer posição, quando há nó perdível na próxima missão principal, então ele ocupa as primeiras posições de `proximosPassos`, acima de qualquer nó não perdível (regra fixa).
5. Dado `antesDeAvancar(M)` para uma missão M futura, quando consulto, então recebo o que some ao iniciar M e o que some ao concluí-la, separados.

### H4 (P1): ver os próximos passos com motivo

Como jogador, quero uma lista curta do que fazer agora, com o porquê de cada sugestão, para decidir rápido.

**Critérios de aceite**
1. Dado um estado, quando chamo `proximosPassos(n=10)`, então recebo até 10 nós `disponivel` ou `em_risco` (e gatilhos que destravam perdíveis), ordenados por pontuação, cada um com motivos codificados e frases já montadas.
2. Dado o perfil "história primeiro", quando há missão principal disponível, então ela aparece entre as 3 primeiras, salvo perdíveis da regra fixa.
3. Dado posição informada, quando dois nós têm pontuação igual exceto pela distância, então o mais próximo vem antes.
4. Dado categorias marcadas como ignoradas, quando calculo, então nós dessas categorias não aparecem em `proximosPassos`, mas continuam em `perdiveis()` (aviso de perda não é filtrado por preferência).
5. Dado empate exato de pontuação, quando ordeno, então o desempate é por ID em ordem lexicográfica (determinismo).

### H5 (P1): ver o que ainda falta no capítulo

Como jogador, quero, antes de ir para o capítulo seguinte, a lista do que existe no capítulo atual e ainda falta, por região.

**Critérios de aceite**
1. Dado o capítulo c, quando chamo `checklistCapitulo(c)`, então recebo os nós não concluídos com `capitulo_referencia = c` ou com janela que fecha em c, agrupados por região, com os perdíveis marcados.
2. Dado um nó já `perdido`, quando listo, então ele aparece numa seção separada "perdidos" e não conta como pendência acionável.

### H6 (P2): ver o que está perto de mim

Como jogador com o mapa aberto, quero os itens disponíveis perto da minha posição.

**Critérios de aceite**
1. Dado posição p e raio r, quando chamo `pertoDeMim(p, r)`, então recebo nós `disponivel` ou `em_risco` com posição dentro de r, ordenados por pontuação com peso de proximidade e com a distância em metros.
2. Dado nó com `area` em vez de `posicao`, quando calculo distância, então uso o ponto mais próximo do polígono.

### H7 (P2): explicação sem spoiler

Como jogador que escolheu nível de spoiler 1, quero motivos que não revelem nomes de missões.

**Critérios de aceite**
1. Dado teto de spoiler 1 e um motivo `PERDIVEL_EM` cuja missão tem spoiler 2, quando a frase é montada, então o nome é trocado por "uma missão do capítulo N".
2. Dado qualquer saída do motor, quando inspeciono os campos de texto, então nenhum nome, dica ou descrição de nível acima do teto aparece (o nó pode ser revelado individualmente pelo jogador, conforme a spec 009).

## 4. Requisitos funcionais

| ID | Requisito |
|---|---|
| RF-008-01 | O motor DEVE expor a função pura `recomendar(catalogo, estado, parametros)` que devolve todas as saídas de uma vez, e funções de consulta derivadas: `proximosPassos`, `perdiveis`, `antesDeAvancar`, `checklistCapitulo`, `oQueFalta`, `pertoDeMim`. |
| RF-008-02 | O motor DEVE normalizar o estado antes de qualquer cálculo: fecho implícito das principais, pré-requisitos de estado de nós concluídos e mapeamento de aliases. |
| RF-008-03 | O motor DEVE classificar cada nó em exatamente um status base (`concluido`, `perdido`, `futuro`, `bloqueado`, `disponivel`) e marcar `em_risco` como atributo adicional de `disponivel` ou `bloqueado` alcançável. |
| RF-008-04 | O avaliador de `requer` DEVE suportar `todos`, `qualquer`, `nao`, `pelo_menos` e os átomos `concluido`, `capitulo_minimo`, `personagem`, `variavel`, `contagem`, e devolver satisfeito/não satisfeito mais o conjunto mínimo de átomos faltantes. |
| RF-008-05 | Condições de momento (`horario`, `clima`, `veiculo`, `livre`) NÃO DEVEM bloquear; DEVEM ser devolvidas como instruções junto ao nó. |
| RF-008-06 | O motor DEVE calcular `missoes_ate_perder` pela ordem topológica pré-calculada das principais e propagar a urgência para os pré-requisitos faltantes (máximo entre urgência própria e herdada). |
| RF-008-07 | O motor DEVE pontuar com a fórmula de [docs/05 §3.5](../../docs/05-motor-recomendacao.md) e os pesos por perfil (caçador de 100%, equilíbrio, história primeiro), aceitando sobrescrita de pesos por parâmetro. |
| RF-008-08 | Nós perdíveis na próxima missão principal DEVEM ocupar o topo de `proximosPassos`, independentemente da pontuação. |
| RF-008-09 | Cada recomendação DEVE trazer motivos codificados (`PERDIVEL_EM`, `DESTRAVA`, `PERTO`, `CLUSTER`, `FAVORITA`, `PROXIMA_HISTORIA`, `CAMINHO_EXCLUIDO`) com parâmetros e a frase pronta em pt-BR montada por template. |
| RF-008-10 | O motor DEVE aplicar o teto de spoiler em toda saída textual, trocando nomes por rótulos neutros. |
| RF-008-11 | O motor DEVE ser determinístico: mesmas entradas, saída idêntica byte a byte (ordenação estável, desempate por ID, sem relógio nem aleatoriedade). |
| RF-008-12 | O motor DEVE aceitar `priors` opcional (spec 014) para durações e ajustes de risco; sem `priors`, usa `duracao_min` do catálogo e, na ausência dele, a duração padrão da categoria. |
| RF-008-13 | O motor DEVE expor o ponto de extensão `planoSessao(posicao, minutos, restricoes)` com contrato definido e implementação que devolve `nao_implementado` até a spec 011. |
| RF-008-14 | O motor DEVE rodar em Web Worker no app e em Node para testes e pré-cálculo, sem depender de DOM, rede ou armazenamento. |
| RF-008-15 | O CI DEVE rodar os cenários-ouro de `golden/` a cada mudança em `packages/engine` ou em `data/`, e falhar o build se algum quebrar. |

## 5. Requisitos não funcionais

| ID | Requisito | Meta |
|---|---|---|
| RNF-008-01 | Tempo de `recomendar` completo no Worker, catálogo de 2 mil nós, celular intermediário | p95 < 100 ms |
| RNF-008-02 | Recalcular após marcar um item (incremental ou completo) | p95 < 50 ms, com debounce de 150 ms |
| RNF-008-03 | Tamanho do pacote do motor no bundle | < 40 KB gzip |
| RNF-008-04 | Cobertura de testes do avaliador de `requer` e da classificação | 100% de ramos |
| RNF-008-05 | Memória adicional no Worker | < 20 MB |

## 6. Casos de borda e falhas

- Catálogo com ciclo em `requer`: o build rejeita (spec 001); se mesmo assim chegar ao motor, ele detecta, marca os nós do ciclo como `bloqueado` com motivo `CICLO_NO_CATALOGO` e não entra em laço.
- Estado com missão atual que não existe no catálogo (versão antiga): usa o alias; sem alias, cai para a última principal válida e devolve aviso `ESTADO_INCONSISTENTE`.
- Jogador marcou item `futuro` (fez fora de ordem ou o catálogo errou a janela): o item conta como concluído e o motor devolve aviso `JANELA_SUSPEITA`, que a interface pode transformar em sugestão de reporte (spec 010).
- Jogador marcou item `perdido` como concluído: aceito como concluído; mesmo aviso.
- Posição não informada: proximidade e densidade valem zero; ranking segue o restante.
- `qualquer` com todas as alternativas impossíveis: nó `perdido` com `CAMINHO_EXCLUIDO`.
- Variável não preenchida: átomo `variavel_nao_informada`; o nó aparece como bloqueado com convite para preencher o estado da jogada.
- Catálogo e `precomputed.json` de versões diferentes: o motor recusa com erro tipado `versao_incompativel` e o app recarrega o catálogo.
- Nó sem posição (missão sem ponto de início, marco): entra em listas, nunca em `pertoDeMim`.

## 7. Entidades e eventos (conceitual)

- **EstadoJogada**: concluídos (IDs e versão do catálogo), última principal concluída, personagem, variáveis, posição opcional, perfil, preferências, teto de spoiler.
- **Parametros**: K de risco, n de próximos passos, raio, sobrescrita de pesos, `priors` opcional.
- **ResultadoNo**: id, status, em_risco, missoes_ate_perder, faltantes (átomos), instruções de momento, pontuação, motivos.
- **Motivo**: código, parâmetros, frase.
- **Resultado**: mapa de ResultadoNo, próximos passos, perdíveis agrupados por missão, avisos, versão do catálogo usada.

Não há eventos persistidos; o motor é uma função.

## 8. Cenários-ouro

| ID | Estado de entrada | Resultado esperado | Como é verificado |
|---|---|---|---|
| CO-008-01 | Catálogo mínimo da cadeia de [docs/04 §7](../../docs/04-grafo-progressao.md); principal 11 concluída | Gatilho `disponivel` em posição 1; oculta `bloqueado` + `em_risco` herdado; easter egg `bloqueado` | Asserção determinística |
| CO-008-02 | Principal 15 iniciada, oculta não feita | Oculta e easter egg `perdido` | Asserção |
| CO-008-03 | Principal 12 marcada, nada mais | Principais 1 a 11 `concluido` | Asserção |
| CO-008-04 | `qualquer[A(10 min), B(5 min)]` | `oQueFalta` devolve B | Asserção |
| CO-008-05 | Perfil história primeiro, principal disponível, nenhum perdível | Principal entre as 3 primeiras | Asserção |
| CO-008-06 | Perdível na próxima principal, longe; não perdível colado no jogador | Perdível acima do não perdível | Asserção |
| CO-008-07 | Teto de spoiler 1, motivo cita missão de spoiler 2 | Frase com rótulo neutro; nenhum nome de spoiler 2 em toda a saída serializada | Busca de texto na saída |
| CO-008-08 | Mesmo estado executado 100 vezes, em Node e no Worker | Saídas idênticas (hash) | Comparação de hash |
| CO-008-09 | Categoria ignorada com item perdível | Fora de `proximosPassos`, presente em `perdiveis()` | Asserção |
| CO-008-10 | Item marcado com ID depreciado que é alias | Nó atual `concluido` | Asserção |
| CO-008-11 | Catálogo real completo, estado no meio do capítulo 2 | Nenhum nó com status contraditório; tempo < 100 ms em Node de referência | Asserção + benchmark |

## 9. Métricas de sucesso

- Taxa de aceite: recomendação exibida e marcada em até 30 min (meta inicial: 25% das 3 primeiras)
- Zero relatos de perdível não avisado causado pelo motor (erros de dado contam na spec 001)
- p95 de cálculo no navegador abaixo de 100 ms, medido por amostragem anônima opcional

## 10. Checagem contra a constituição

- [x] Ajuda a decidir o próximo passo (princípio 1)
- [x] Perdíveis avisados antes (2) e nível de spoiler respeitado (3)
- [x] Funciona sem IA e sem token (4)
- [x] Dado com origem, confiança e ID estável (6, 7): aliases tratados na normalização
- [x] Decisão no motor determinístico, não no modelo (9, 11)
- [x] Cabe no plano gratuito (13): cálculo no cliente
- [ ] RLS e teste de acesso cruzado: não se aplica (o motor não toca dado remoto)

## 11. Perguntas em aberto

- [A ESCLARECER: K padrão de "em risco" é 2 missões principais. Faz sentido expor isso ao jogador nas configurações?]
- [A ESCLARECER: duração padrão por categoria quando o nó não tem `duracao_min`. Proposta: tabela em `categorias.yaml`.]
- [A ESCLARECER: escala pixel → metro da imagem-base (`mapa.yaml.escala_m_por_px`), medida com dois pontos conhecidos no jogo; até lá, "A N m" usa estimativa.]
- [A ESCLARECER: itens de status `nao_confirmado` ou `contestado` devem ter peso reduzido no ranking?]
