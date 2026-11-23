# 04. Grafo de progressão

O catálogo não é uma lista de pontos no mapa. É um grafo dirigido em que cada item, missão e gatilho é um **nó**, e cada dependência é uma **aresta**. O motor ([05-motor-recomendacao.md](05-motor-recomendacao.md)) cruza esse grafo com o estado de cada jogador para dizer o que está disponível, o que está em risco e o que fazer em seguida.

## 1. Tipos de nó

| Tipo | Prefixo do ID | Exemplo | Tem posição no mapa | Conta para 100% |
|---|---|---|---|---|
| Missão principal | `missao:` | Missão 12 da campanha | Ponto de início | Sim |
| Missão secundária | `missao:` | Encontro com personagem secundário | Ponto de início | Conforme a referência |
| Missão oculta | `missao:` | Só aparece depois de um gatilho | Ponto de início | Conforme a referência |
| Colecionável | `item:` | Carta 017 | Sim | Sim |
| Atividade | `item:` | Salto acrobático, voo de faca, salto BASE | Sim | Sim |
| Gatilho | `gatilho:` | Visitar a loja X à noite três vezes | Quando houver | Não (é meio, não fim) |
| Marco | `marco:` | "Região Y liberada", "Barco adquirido" | Não | Não |

O 100% do jogo não é "pegar tudo". Cada categoria declara em `categorias.yaml` uma **regra de 100%**:

```yaml
- id: cartas
  nome: Cartas colecionáveis
  total: 480
  regra_100: { tipo: conjuntos_completos, minimo: 15 }   # 15 dos 18 conjuntos
- id: flamingos
  total: 125
  regra_100: { tipo: itens, minimo: 100 }
- id: subaquaticas
  total: 33
  regra_100: { tipo: itens, minimo: 33 }
```

O contador mostra, por categoria, o coletado contra o total e contra o exigido ("87 / 125 · 100 para 100%"), e separa **itens de mapa** de **missões** (principais, secundárias e ocultas com `conta_para_100: true`). Gatilhos e marcos nunca entram no contador. O motor usa a regra para saber quando uma categoria já está "fechada" para 100% e baixar a prioridade dos itens restantes dela.

**Gatilho** é o tipo que torna possível rastrear missões ocultas: é uma ação do jogador, sem marcador no jogo, que libera outro nó. **Marco** é um estado do mundo usado como pré-requisito (região aberta, veículo obtido) e pode ser concluído automaticamente por outra missão.

## 2. Campos de um nó

```yaml
id: missao:oculta-exemplo-01        # estável, nunca reaproveitado
tipo: missao                         # missao | item | gatilho | marco
subtipo: oculta                      # principal | secundaria | oculta | colecionavel | atividade
categoria: null                      # id de categoria (itens); null em missões
nome: "Nome em português"
nome_original: "Original name"
personagem: lucia                    # jason | lucia | ambos | qualquer
regiao: regiao:vice-city
posicao:                             # pixels da imagem-base (data/mapa.yaml); null se não se aplica
  x: 4975
  y: 4128
  qualidade: aproximada              # verificada | aproximada
  representa: area_busca             # ponto | entrada | area_busca
conjunto: null                       # ex.: conjunto de cartas, para regras de 100% por conjunto
area: null                           # polígono opcional para itens de área
capitulo_referencia: 2               # onde costuma ser feito (exibição)

disponivel_desde:                    # janela: quando passa a existir
  missao: missao:principal-008
  momento: conclusao                 # inicio | conclusao
perdivel_apos:                       # janela: quando deixa de existir (null = nunca)
  missao: missao:principal-015
  momento: inicio

requer:                              # pré-requisitos (seção 3)
  todos:
    - concluido: gatilho:loja-x-noite
    - personagem: lucia
condicoes_momento:                   # não bloqueiam; viram instrução (seção 4)
  - horario: { de: 20, ate: 4 }

duracao_min: 12                      # estimativa para o planejador
repetivel: false
conta_para_100: true
spoiler: 2                           # 0 a 3 (seção 6)
trofeu: null                         # id de troféu relacionado, se houver
dicas:                               # texto curto, também com nível de spoiler
  - { texto: "Fale com o atendente do balcão", spoiler: 1 }
fontes:
  - { tipo: referencia, url: "https://...", obs: "guia de ocultas" }
status: referencia                   # nao_confirmado | referencia | confirmado | contestado | depreciado
aliases: []                          # IDs antigos fundidos neste
```

## 3. Linguagem de pré-requisitos

`requer` é uma expressão booleana com operadores e átomos. É o que permite modelar "fazer X **ou** Y, **e** ser a Lucia, **e** ter escolhido Z".

| Operador | Significado |
|---|---|
| `todos: [...]` | E lógico |
| `qualquer: [...]` | OU lógico |
| `nao: <expr>` | Negação (ex.: missão que some se o jogador escolheu outro caminho) |
| `pelo_menos: { n: 3, de: [...] }` | Pelo menos N de uma lista (ex.: "concluir 3 assaltos") |

| Átomo | Exemplo | Avaliado com |
|---|---|---|
| `concluido: <id>` | `concluido: missao:principal-008` | Progresso |
| `capitulo_minimo: <n>` | `capitulo_minimo: 3` | Posição na campanha |
| `personagem: <p>` | `personagem: jason` | Estado da jogada |
| `variavel: { nome, igual \| em \| minimo }` | `variavel: { nome: escolha-cap4, igual: poupar }` | Variáveis declaradas pelo jogador |
| `contagem: { categoria, minimo }` | `contagem: { categoria: cartas, minimo: 50 }` | Progresso agregado |

Variáveis são declaradas em `data/variaveis.yaml` (nome, tipo, opções, a partir de quando fazem sentido, nível de spoiler). São os "campos preenchidos" pelo jogador no estado da jogada: escolhas de história, propriedades compradas, veículos especiais e afins. Só existem variáveis que algum nó usa.

## 4. Condições de momento

Algumas condições não dependem de progresso e o app não tem como saber: horário do jogo, clima, estar dentro de um veículo, nível de procurado. Elas **não bloqueiam** a recomendação. Viram instrução na tela ("vá entre 20h e 4h, de barco") e entram no cálculo de duração do planejador.

| Átomo | Exemplo |
|---|---|
| `horario: { de, ate }` | `{ de: 20, ate: 4 }` |
| `clima: <tipo>` | `clima: chuva` |
| `veiculo: <tipo>` | `veiculo: barco` |
| `livre: <texto>` | `livre: "sem nível de procurado"` |

## 5. A espinha da campanha

As missões principais formam um DAG (na maior parte linear, com trechos em paralelo). A "posição na campanha" de um jogador é o conjunto de missões principais concluídas. Disso derivam:

- **Capítulo atual**: maior capítulo com missão principal concluída, ou o capítulo da próxima missão disponível.
- **Próximas missões principais**: principais com `requer` satisfeito e não concluídas.
- **Fecho implícito**: concluir a principal 12 implica que todas as principais exigidas por ela estão concluídas. O motor marca isso sozinho, e o jogador só informa onde está.

Janelas (`disponivel_desde`, `perdivel_apos`) sempre apontam para uma missão principal ou para um marco, nunca para um item. Isso mantém a pergunta "o que perco se avançar?" respondível com uma consulta simples.

[A ESCLARECER: GTA VI permite trocar livremente entre Jason e Lucia, ou a troca é imposta por missão ou capítulo? O átomo `personagem` cobre os dois casos; muda só como o estado é preenchido.]

## 6. Níveis de spoiler

| Nível | Pode mostrar | Exemplo |
|---|---|---|
| 0 | Nada além da categoria e da posição | "Colecionável aqui" |
| 1 | Nome do item, dicas de localização | "Carta 017, atrás do posto" |
| 2 | Nome de missões secundárias e ocultas, personagens envolvidos | "Missão: [nome], com [personagem]" |
| 3 | Eventos da história principal, consequências de escolhas | "Esta escolha encerra a linha de missões de [personagem]" |

Cada nó, dica e variável tem nível. O jogador escolhe um teto global e pode revelar caso a caso. A spec 009 define o comportamento.

## 7. Exemplo: cadeia de missão oculta

```
missao:principal-008 (conclusão)
        │ disponivel_desde
        ▼
gatilho:loja-x-noite ──requer──► (condição de momento: 20h–4h)
        │ requer
        ▼
missao:oculta-exemplo-01 ── perdivel_apos ──► missao:principal-015 (início)
        │ requer
        ▼
item:easter-eggs-007
```

Leitura do motor para um jogador que concluiu a principal 11:
- `gatilho:loja-x-noite`: **disponível**, com instrução de horário
- `missao:oculta-exemplo-01`: **bloqueada**, falta o gatilho; **em risco**, porque fecha em 4 missões principais
- `item:easter-eggs-007`: **bloqueado**, falta a oculta; herda o risco
- Recomendação: alta prioridade para o gatilho, porque destrava dois nós perdíveis

## 8. Validações do catálogo (CI)

- Esquema zod válido em todos os arquivos de `data/`
- IDs únicos; referências (`concluido`, `disponivel_desde`, `perdivel_apos`, `regiao`, `categoria`) apontam para IDs existentes
- Grafo de `requer` sem ciclos
- `perdivel_apos` posterior a `disponivel_desde` na ordem da campanha
- Nó com `requer` impossível de satisfazer antes do seu `perdivel_apos` gera erro (item que nasce perdido)
- Totais por categoria batem com `categorias.yaml`
- Nenhum ID removido em relação à versão anterior sem estar em `aliases` de outro nó ou com `status: depreciado`
- Relatório de cobertura: nós sem fonte, sem posição, sem duração, sem nível de spoiler
