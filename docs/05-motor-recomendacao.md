# 05. Motor de recomendação (sem tokens)

## 1. A pergunta

> Cada jogador avança de um jeito diferente. Dá para ter recomendações personalizadas sem gastar tokens, com processamento por usuário e sem modelo online, deixando o agente de IA como opcional?

**Sim, e é o desenho certo mesmo com orçamento ilimitado.** As regras do jogo são conhecidas e estão no grafo: o que libera o quê, quando cada item existe, quando some, onde fica. O problema é combinatório (busca em grafo e roteamento), não de linguagem. Algoritmo determinístico resolve isso com exatidão, explica o porquê de cada sugestão, roda em milissegundos no celular e custa zero.

O que ninguém precisa no início é **treinar** um modelo. Não há dados rotulados para treinar ("qual foi a melhor sequência para este estado?"), e um modelo aprendido erraria onde a regra é exata, como num perdível. O aprendizado entra depois, num papel menor e bem definido: **calibrar** pesos e durações com dados agregados da comunidade, calculados offline e publicados como arquivo estático (seção 8). Mesmo aí, nada roda online e nenhum token é gasto.

| | Motor determinístico (MVP) | Calibração pela comunidade (V2) | Agente de IA (V2, opcional) |
|---|---|---|---|
| Onde roda | Navegador (Web Worker) | GitHub Actions, agendado | Navegador → API da Anthropic |
| Custo | Zero | Zero | Tokens da chave do jogador |
| Entrada | Catálogo + estado do jogador | Progresso anônimo agregado | Pergunta livre + ferramentas do motor |
| Saída | Status, riscos, ranking, rota, motivos | `priors.json` (durações, ordens frequentes) | Conversa, explicação, plano narrado |
| Pode errar regra? | Não (testado por cenários-ouro) | Não decide regra, só ajusta peso | Não decide; só usa resultados do motor |

## 2. Entradas

**Do catálogo (estático, igual para todos):** nós, arestas, janelas, condições, posições, durações, mais os artefatos pré-calculados no build (seção 7).

**Do jogador (estado da jogada):**

| Variável | Como é preenchida | Uso |
|---|---|---|
| Itens concluídos | Marcação no mapa ou na lista | Base de tudo |
| Posição na campanha | "Última missão principal concluída" e, se houver, "principal em andamento" (seletores) | Janelas, perdíveis, fecho implícito |
| Posição atual e tempo | Só no dispositivo, nunca sincronizados | Proximidade e rota |
| Personagem atual | Seletor Jason / Lucia | Filtra nós por personagem |
| Variáveis declaradas | Formulário "Estado da jogada" (escolhas, propriedades, veículos) | Átomos `variavel` |
| Posição atual (opcional) | Toque no mapa ou região escolhida | Proximidade e rota |
| Tempo disponível (opcional) | "Tenho 30 / 60 / 120 min" | Planejador de sessão |
| Perfil | Caçador de 100% / história primeiro / equilíbrio | Pesos da pontuação |
| Preferências | Categorias favoritas ou ignoradas, nível de spoiler | Filtro e peso |

## 3. Pipeline

Função pura: `recomendar(catalogo, estado, parametros) → resultado`. Mesmas entradas, mesma saída (princípio 11).

```
1. Normalizar estado   fecho implícito, aliases de IDs depreciados, personagem
2. Classificar nós     concluido | disponivel | bloqueado | futuro | perdido | em_risco
3. Medir risco         quantas missões principais faltam até cada nó sumir
4. Medir valor         quanto cada nó destrava (descendentes, perdíveis destravados)
5. Pontuar             combinação ponderada com motivos
6. Selecionar          próximos passos, painel de perdíveis, checklist do capítulo
7. Roteirizar (V2)     melhor sequência dada posição e tempo
8. Explicar            motivos → frases por template, com nível de spoiler aplicado
```

### 3.1 Normalizar
- Fecho implícito: se a principal 12 está concluída, todas as principais que ela exige também estão.
- Nó concluído implica seus pré-requisitos de estado concluídos (o jogador marcou a oculta, então fez o gatilho).
- IDs antigos são mapeados pelos `aliases`.

### 3.2 Classificar

| Status | Regra |
|---|---|
| `concluido` | Marcado ou implícito |
| `perdido` | `perdivel_apos` já ultrapassado e não concluído; carrega a missão que o fechou (derivado, nada é gravado). Também quando `requer` ficou impossível por uma escolha declarada (`nao` satisfeito): motivo `CAMINHO_EXCLUIDO`, exibido como "indisponível nesta jogada" |
| `futuro` | `disponivel_desde` ainda não alcançado na campanha |
| `bloqueado` | Na janela, mas `requer` não satisfeito; guarda **o que falta** (lista mínima de átomos) |
| `disponivel` | Na janela e `requer` satisfeito |
| `em_risco` | Disponível ou bloqueado-alcançável **e** some em até K missões principais (K padrão = 2) |

"O que falta" é calculado pela avaliação da expressão `requer`, que devolve o conjunto mínimo de átomos não satisfeitos (para `qualquer`, a alternativa mais barata, medida pela duração somada).

### 3.3 Risco
`missoes_ate_perder(n)` = número de missões principais entre a posição atual e o `perdivel_apos` do nó, na ordem topológica da campanha. Se o nó está bloqueado, o risco se propaga para os pré-requisitos que faltam: um gatilho que destrava uma oculta perdível herda a urgência dela.

### 3.4 Valor de desbloqueio
Pré-calculado no build: para cada nó, os descendentes transitivos e quantos deles contam para 100% ou são perdíveis. Gatilhos e marcos costumam ter valor alto e recebem prioridade mesmo sem contar para 100%.

### 3.5 Pontuação

```
score(n) = w_risco      · urgência(n)              // 1 / (1 + missoes_ate_perder)
         + w_desbloq    · valor_desbloqueio(n)      // normalizado 0..1
         + w_prox       · proximidade(n, posição)   // decai com a distância
         + w_densidade  · densidade_cluster(n)      // itens pendentes perto dele
         + w_pref       · preferência(n)            // categoria favorita
         + w_historia   · é_principal(n)            // perfil "história primeiro"
         − w_tempo      · duração(n) / tempo_disp
```

Pesos por perfil (valores iniciais, ajustáveis pelos cenários-ouro):

| Peso | Caçador de 100% | Equilíbrio | História primeiro |
|---|---:|---:|---:|
| `w_risco` | 5 | 4 | 3 |
| `w_desbloq` | 2 | 1.5 | 1 |
| `w_prox` | 1.5 | 2 | 1 |
| `w_densidade` | 1 | 1 | 0.5 |
| `w_pref` | 0.5 | 1 | 1 |
| `w_historia` | 0 | 1 | 4 |
| `w_tempo` | 1 | 1 | 1 |

Regra fixa acima da pontuação: um nó perdível que some **na próxima** missão principal sempre aparece no topo, com alerta (princípio 2).

Cada parcela relevante gera um **motivo** codificado (`PERDIVEL_EM`, `DESTRAVA`, `PERTO`, `CLUSTER`, `FAVORITA`, `PROXIMA_HISTORIA`) com seus parâmetros.

### 3.6 Selecionar
Saídas do motor, consumidas pelas telas:

| Saída | Conteúdo | Tela |
|---|---|---|
| `proximosPassos(n=10)` | Ranking com motivos | Início, painel do mapa |
| `perdiveis()` | Agrupados pela missão que os fecha, em ordem | Painel de missáveis (spec 007) |
| `antesDeAvancar(missao)` | O que some ao iniciar ou concluir aquela missão | Alerta de ponto sem retorno |
| `checklistCapitulo(c)` | O que existe no capítulo c e ainda falta, por região | "Antes do capítulo seguinte" |
| `oQueFalta(no)` | Átomos faltantes para liberar um nó, recursivamente | Detalhe do item |
| `pertoDeMim(pos, raio)` | Disponíveis ordenados por distância e score | Mapa |
| `planoSessao(pos, tempo)` (V2) | Sequência roteirizada; no MVP devolve `nao_implementado` | Planejador (spec 011) |

### 3.7 Roteirizar (V2)
Problema de orientação (*orienteering*): escolher e ordenar um subconjunto de nós disponíveis que maximize a soma dos scores dentro do tempo disponível, partindo da posição atual.

- **Custo entre dois pontos**: distância no mapa × fator do meio de transporte (a pé, carro, barco, aéreo), mais penalidade de travessia quando a reta cruza água sem barco. Na V2, grafo de regiões com tempos médios entre elas.
- **Heurística**: candidatos = top 60 por score num raio dinâmico → inserção gulosa por razão score/tempo → melhoria 2-opt → respeitar condições de momento (agrupar o que é "à noite").
- **Limite**: < 50 ms no Worker para 60 candidatos. Solução ótima não é necessária; boa e explicável é.

### 3.8 Explicar
Motivos viram frases por template, sem LLM:

| Motivo | Template |
|---|---|
| `PERDIVEL_EM {n, missao}` | "Some em {n} missões, ao iniciar *{missao}*" |
| `DESTRAVA {k, perdiveis}` | "Libera {k} itens ({perdiveis} perdíveis)" |
| `PERTO {m}` | "A {m} m de você" |
| `CLUSTER {k}` | "{k} pendentes num raio de 300 m" |
| `PROXIMA_HISTORIA` | "Próxima missão da história" |

Nomes de missões acima do nível de spoiler escolhido são trocados por rótulos neutros ("uma missão do capítulo 3").

## 4. Exemplo de saída

Jogador no capítulo 2, perfil "caçador de 100%", posição em Vice City, 60 minutos:

```
⚠ Antes de avançar: ao iniciar a próxima missão principal você perde 2 itens
   • Carta 044 (a 1,2 km)  • Gatilho da loja X (só à noite)

Próximos passos
1. Gatilho da loja X         Some em 1 missão · Libera 2 itens (2 perdíveis) · vá entre 20h e 4h
2. Carta 044                 Some em 1 missão · A 1,2 km
3. Salto acrobático 017      A 300 m · 4 pendentes num raio de 300 m
4. Missão secundária "…"     Libera 3 itens · próxima da posição
```

## 5. Desempenho e onde roda

- Catálogo de ~2 mil nós: classificação e pontuação são lineares no tamanho do grafo; meta < 100 ms em celular intermediário (RNF-02).
- Roda num Web Worker; recalcula a cada marcação de item, troca de missão atual ou de posição (com debounce de 150 ms).
- O mesmo pacote roda em Node, para testes, cenários-ouro e pré-cálculo no build.

## 6. Cenários-ouro

Arquivos em `golden/`: estado de entrada + asserções sobre a saída (ex.: "o gatilho X está na posição 1", "o item Y aparece em `antesDeAvancar(principal-015)`", "nenhum nó de spoiler 3 aparece com nome"). Rodam no CI a cada mudança do motor **e** do catálogo. Um PR de dados que torna um item impossível ou some com um perdível do alerta quebra o build.

## 7. Pré-cálculo no build (offline, zero custo)

Feito pelo `catalog-build` a cada versão do catálogo:

- Ordem topológica das missões principais e índice de cada uma
- Descendentes transitivos e valor de desbloqueio por nó
- Mapa `missão principal → nós que somem ao iniciá-la / concluí-la`
- Clusters espaciais por região (para densidade e para o mapa)
- Matriz de custo entre regiões (V2)
- "Rota de referência por capítulo": sequência sugerida para limpar cada capítulo antes de avançar, calculada pelo próprio motor a partir de um estado-padrão

## 8. Calibração pela comunidade (V2, ainda sem modelo online)

Com jogadores usando o app, o progresso anônimo e agregado vira sinal. Uma GitHub Action agendada (diária) lê uma view agregada do Supabase e gera `priors.json`:

| Sinal | Como é calculado | Uso no motor |
|---|---|---|
| Duração real por nó | Mediana do intervalo entre marcações consecutivas na mesma região | Substitui `duracao_min` estimado |
| Ordem frequente | Pares (A antes de B) mais comuns entre quem chegou a 100% | Desempate e motivo "jogadores costumam fazer junto" |
| Itens mais esquecidos | Itens perdíveis com maior taxa de `perdido` | Aumenta `w_risco` desse nó |
| Taxa de aceite | Sugestão exibida → marcada em 30 min | Ajuste fino dos pesos por perfil (busca em grade offline contra os cenários-ouro) |

Isso é "treinamento" no sentido honesto do termo: estatística e ajuste de pesos, feitos offline, publicados como arquivo estático e versionados com o catálogo. Se um dia fizer sentido um modelo aprendido de verdade (por exemplo, prever a próxima ação a partir de sequências), ele pode ser exportado como pesos pequenos (ONNX ou JSON) e rodar no navegador, sem token. Só vale a pena com evidência de que bate a heurística nos cenários-ouro (princípio 22).

## 9. O que o motor não faz, e o agente faz

- Responder pergunta livre ("vale a pena fazer os assaltos agora ou depois do barco?")
- Narrar um plano de sessão com contexto da conversa
- Ler uma captura de tela do jogo e marcar progresso (spec 013)

Para isso existe o agente opcional ([06-agente-ia.md](06-agente-ia.md)), que usa as funções da seção 3.6 como ferramentas.
