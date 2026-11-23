# Spec 001: Catálogo e grafo de progressão

- **Status:** rascunho para revisão
- **Responsável:** [nome]
- **Depende de:** nenhuma (fundação de todas as outras)
- **Referências:** [docs/02-dados-referencias.md](../../docs/02-dados-referencias.md), [docs/03-arquitetura.md](../../docs/03-arquitetura.md), [docs/04-grafo-progressao.md](../../docs/04-grafo-progressao.md)
- **Última revisão:** 2026-11-23

## 1. Contexto e problema

Tudo no Vice Route lê o mesmo catálogo: mapa, checklist, missões, painel de perdíveis, motor de recomendação e agente. O catálogo precisa ser um grafo (nós com janelas de disponibilidade e pré-requisitos), não uma lista de pontos, e precisa aceitar contribuições da comunidade sem quebrar o progresso de quem já jogou. Esta spec define como o catálogo é escrito (YAML no repositório), validado (CI), compilado (JSON estático servido pela CDN) e versionado. Como os dados chegam ao YAML pertence à spec 002; como o motor usa o grafo, à spec 008.

## 2. Objetivos e não objetivos

**Objetivos**
- Um formato único e versionado para nós, categorias, regiões, capítulos e variáveis, com origem e confiança em cada nó
- Validação automática que impede publicar catálogo inconsistente (referência quebrada, ciclo, item que nasce perdido, ID removido)
- Compilação para artefatos estáticos pequenos, com hash, prontos para cache no navegador
- IDs estáveis: renomear, fundir ou remover um item nunca apaga o progresso de ninguém
- Relatório de cobertura que mostra onde o catálogo está incompleto

**Fora do escopo**
- Importação de fontes externas e levantamento de missões (spec 002)
- Cálculo de disponibilidade, risco e recomendação por jogador (spec 008); aqui só o pré-cálculo que independe do jogador
- Editor visual do grafo
- Tiles do mapa (spec 004)

## 3. Histórias de usuário

### H1 (P1): escrever o catálogo em arquivos legíveis

Como curador ou contribuidor, quero editar o catálogo em arquivos YAML organizados por tipo e categoria, para revisar mudanças num pull request comum.

**Critérios de aceite**
1. Dado o repositório, quando abro `data/`, então encontro `mapa.yaml`, `categorias.yaml`, `regioes.yaml`, `marcos.yaml`, `capitulos.yaml`, `variaveis.yaml`, `gatilhos.yaml`, `itens/<categoria>.yaml` e `missoes/{principais,secundarias,ocultas}.yaml`, com os campos descritos em docs/04 §2.
2. Dado um nó sem os campos obrigatórios (`id`, `tipo`, `nome`, `status`, `fontes`, `spoiler`), quando rodo `pnpm catalog:check`, então o comando falha apontando arquivo, linha e campo.
3. Dado um nó com `requer` usando um operador ou átomo desconhecido, quando valido, então recebo erro com a lista de operadores e átomos aceitos.
4. Dado um arquivo YAML de categoria, quando um nó declara `categoria` diferente da do arquivo, então a validação falha.

### H2 (P1): impedir catálogo inconsistente

Como curador, quero que o CI recuse qualquer alteração que deixe o grafo inconsistente, para nunca publicar um catálogo que engane o jogador.

**Critérios de aceite**
1. Dado um `requer`, `disponivel_desde`, `perdivel_apos`, `regiao` ou `categoria` apontando para ID inexistente, quando o CI roda, então falha com a referência quebrada.
2. Dado um ciclo nos pré-requisitos (A requer B, B requer A, direta ou transitivamente), quando o CI roda, então falha listando o ciclo.
3. Dado um nó cujo `perdivel_apos` vem antes do `disponivel_desde` na ordem da campanha, quando o CI roda, então falha.
4. Dado um nó cujo `requer` só pode ser satisfeito depois do seu `perdivel_apos` (item que nasce perdido), quando o CI roda, então falha indicando qual pré-requisito é tardio demais.
5. Dado que a soma dos itens de uma categoria difere do total declarado em `categorias.yaml`, quando o CI roda, então emite aviso com a diferença: `COBERTURA_INCOMPLETA` se faltam pinos, `TOTAL_EXCEDIDO` se sobram (cópias, lojas não assaltáveis). _(Revisado em 23/11: `total` é o total no jogo e as fontes ainda não cobrem tudo; erro bloquearia todo PR.)_
6. Dado um ID presente na versão publicada anterior e ausente na nova, sem estar em `aliases` de outro nó nem com `status: depreciado`, quando o CI roda, então falha.
7. Dado um nó de tipo `missao` com `spoiler` menor que 2, quando o CI roda, então falha (docs/08 §5).

### H3 (P1): compilar para artefatos estáticos

Como app web, quero baixar o catálogo como poucos arquivos JSON com hash, para carregar rápido, guardar em cache e só baixar de novo o que mudou.

**Critérios de aceite**
1. Dado um catálogo válido, quando o build roda, então gera em `apps/web/public/catalog/<versao>/` os arquivos `catalog.json`, `precomputed.json`, `search-index.json` e, na raiz `catalog/`, um `manifest.json` com versão, data e hash SHA-256 de cada arquivo.
2. Dado o mesmo conteúdo em `data/`, quando o build roda duas vezes, então os arquivos gerados são idênticos byte a byte (saída determinística, chaves ordenadas).
3. Dado um catálogo de ~2 mil nós, quando compilado, então `catalog.json` comprimido com gzip fica abaixo de 150 KB.
4. Dado um campo usado só na curadoria (`fontes[].obs`, comentários), quando compilo, então ele não vai para `catalog.json`.

### H4 (P1): preservar progresso em mudanças de ID

Como jogador, quero que meu progresso continue certo quando a comunidade corrige, funde ou remove itens, para não perder marcações.

**Critérios de aceite**
1. Dado dois nós duplicados, quando o curador funde B em A (B listado em `aliases` de A), então `catalog.json` publica o mapa `alias → id` e B não aparece mais como nó ativo.
2. Dado um item removido do jogo, quando o curador marca `status: depreciado`, então ele continua no catálogo compilado com essa marca, fora das contagens de 100%.
3. Dado um ID que aparece em `aliases` de dois nós diferentes, quando valido, então o CI falha.

### H5 (P1): pré-calcular o que não depende do jogador

Como motor de recomendação, quero receber estruturas já calculadas no build, para responder em milissegundos no celular.

**Critérios de aceite**
1. Dado o catálogo, quando o build roda, então `precomputed.json` contém: ordem topológica das missões principais com índice; descendentes transitivos de cada nó; valor de desbloqueio (quantos descendentes contam para 100% e quantos são perdíveis); mapa `missão principal → nós que somem ao iniciá-la e ao concluí-la`; clusters espaciais por região.
2. Dado um nó sem descendentes, quando calculado, então o valor de desbloqueio é 0.
3. Dado o mapa de perdíveis, quando consulto uma missão principal, então recebo exatamente os nós cujo `perdivel_apos` aponta para ela, separados por `momento`.

### H6 (P2): relatório de cobertura

Como curador, quero um relatório do que falta no catálogo, para priorizar o levantamento.

**Critérios de aceite**
1. Dado o catálogo, quando rodo `pnpm catalog:report`, então recebo, por categoria e por tipo, a contagem de nós sem posição (quando aplicável), sem `duracao_min`, sem fonte além de `referencia`, por `status`, e com reporte `contestado`.
2. Dado um PR que altera `data/`, quando o CI roda, então o relatório resumido (antes × depois) é publicado como comentário no PR.

### H7 (P2): versionar e anunciar

Como jogador, quero saber quando o catálogo mudou e o que mudou.

**Critérios de aceite**
1. Dado um merge em `main` que altera `data/`, quando o deploy roda, então a versão segue `AAAA.MM.DD-N` (N incrementa no mesmo dia) e é gravada no `manifest.json`.
2. Dado duas versões consecutivas, quando o build gera as notas, então elas listam nós adicionados, alterados (campos), confirmados, depreciados e fundidos.

## 4. Requisitos funcionais

| ID | Requisito |
|---|---|
| RF-001-01 | O esquema DEVE ser definido uma vez em `packages/catalog-schema` (zod) e usado pela validação do CI, pelo app e pelo motor. |
| RF-001-02 | O catálogo DEVE suportar os tipos de nó `missao`, `item`, `gatilho`, `marco` e os subtipos de docs/04 §1. |
| RF-001-03 | Todo nó DEVE ter `id`, `tipo`, `nome`, `status`, `spoiler` (0 a 3) e ao menos uma entrada em `fontes`. |
| RF-001-04 | IDs DEVEM seguir `<tipo>:<kebab-case>` e ser únicos em todo o catálogo, incluindo aliases. |
| RF-001-05 | `requer` DEVE aceitar os operadores `todos`, `qualquer`, `nao`, `pelo_menos` e os átomos `concluido`, `capitulo_minimo`, `personagem`, `variavel`, `contagem`. |
| RF-001-06 | `condicoes_momento` DEVE aceitar `horario`, `clima`, `veiculo`, `livre` e NÃO DEVE ser usado na validação de alcançabilidade. |
| RF-001-07 | `disponivel_desde` e `perdivel_apos` DEVEM apontar para uma missão principal ou um marco, com `momento` `inicio` ou `conclusao`. |
| RF-001-08 | Toda variável usada num átomo `variavel` DEVE estar declarada em `variaveis.yaml` com tipo, opções e nível de spoiler; variável declarada e não usada DEVE gerar aviso. |
| RF-001-09 | A validação DEVE cobrir todas as regras de docs/04 §8. |
| RF-001-10 | O build DEVE comparar com o `catalog.json` da última versão publicada para detectar IDs removidos. |
| RF-001-11 | A compilação DEVE ser determinística. |
| RF-001-12 | O comando `pnpm catalog:check` DEVE rodar validação, compilação em memória e cenários-ouro (pasta `golden/`), e é o mesmo usado pelo CI. |
| RF-001-13 | O `catalog.json` DEVE incluir o mapa de aliases e os nós depreciados marcados. |
| RF-001-14 | O build DEVE gerar notas de versão a partir da diferença entre versões. |
| RF-001-15 | Posições DEVEM estar em pixels da imagem-base de `data/mapa.yaml`, dentro do recorte declarado, com `qualidade` e `representa` preenchidos. |
| RF-001-16 | O catálogo PODE incluir `area` (polígono) para itens de área; nesse caso `posicao` DEVE ser o centroide. |
| RF-001-17 | Cada categoria DEVE declarar `total` e `regra_100` (`{ tipo: itens, minimo }` ou `{ tipo: conjuntos_completos, minimo }`); itens de categorias por conjunto DEVEM ter `conjunto`, e o CI DEVE validar que o mínimo não excede o total. |
| RF-001-18 | `mapa.yaml` DEVE declarar a edição da imagem-base (id, origem, tamanho, recorte, tiles) e, a partir da segunda edição, a transformação afim da edição anterior. |

## 5. Requisitos não funcionais

| ID | Requisito | Meta |
|---|---|---|
| RNF-001-01 | Tempo do `pnpm catalog:check` completo no CI | < 60 s para 5 mil nós |
| RNF-001-02 | Tamanho do `catalog.json` com gzip | < 150 KB para 2 mil nós |
| RNF-001-03 | Tamanho do `precomputed.json` com gzip | < 80 KB para 2 mil nós |
| RNF-001-04 | Mensagens de erro de validação | 100% com arquivo, caminho do campo e, quando possível, linha |
| RNF-001-05 | Cache dos artefatos | Nome com versão, `Cache-Control` imutável; só o `manifest.json` com cache curto (≤ 5 min) |

## 6. Casos de borda e falhas

- Missão principal com dois caminhos paralelos: a ordem topológica tem empate; o índice usado para "missões até perder" é o menor número de principais ainda exigidas para chegar ao `perdivel_apos`.
- `qualquer` em que só uma alternativa é viável antes do `perdivel_apos`: válido, desde que exista ao menos uma.
- Item com `perdivel_apos` apontando para um marco que nunca é concluído por nenhuma missão: aviso, não erro.
- Nó depreciado referenciado em `requer` de nó ativo: erro.
- Alias que aponta para outro alias: resolvido em cadeia no build; ciclo de aliases é erro.
- Duas pessoas criam o mesmo ID em PRs paralelos: o segundo merge falha no CI por ID duplicado.
- Primeira versão publicada (sem anterior para comparar): a checagem de IDs removidos é ignorada com aviso.
- Arquivo YAML com caracteres inválidos ou tabulação: erro de parse com linha.
- Categoria com total declarado 0 (categoria futura): permitida, oculta no app.

## 7. Entidades e eventos (conceitual)

- **Categoria**: id, nome, cor, ícone, total, conta_para_100, ordem.
- **Região**: id, nome, limites (retângulo ou polígono), ordem.
- **Capítulo**: número, nome (com spoiler), missões principais que o compõem.
- **Variável**: nome, tipo (booleano, escolha, número), opções, disponível a partir de, spoiler.
- **Nó**: campos de docs/04 §2; relaciona-se com categoria, região, outros nós (via `requer`) e missões principais ou marcos (via janelas).
- **Aresta**: derivada de `requer` (dependência) e das janelas; não é escrita à mão.
- **Versão do catálogo**: identificador, data, hash dos artefatos, notas.
- **Artefatos compilados**: `manifest`, `catalog`, `precomputed`, `search-index`.

## 8. Cenários-ouro (se toca o motor ou o agente)

| ID | Estado de entrada | Resultado esperado | Como é verificado |
|---|---|---|---|
| CO-001-01 | Catálogo de exemplo da cadeia de docs/04 §7 | `precomputed.perdiveis["missao:principal-015"].inicio` contém a oculta e o easter egg | Asserção determinística |
| CO-001-02 | Mesmo catálogo | Valor de desbloqueio do gatilho = 2 descendentes, 2 perdíveis | Asserção determinística |
| CO-001-03 | Catálogo com B fundido em A | `aliases["item:b"] = "item:a"` e B fora dos nós ativos | Asserção determinística |
| CO-001-04 | Catálogo com item que nasce perdido | `catalog:check` falha com código `NASCE_PERDIDO` | Asserção determinística |
| CO-001-05 | Catálogo com ciclo A→B→A | `catalog:check` falha com código `CICLO` e o ciclo listado | Asserção determinística |

## 9. Métricas de sucesso

- Nenhuma versão publicada com referência quebrada ou item impossível (zero incidentes)
- Tempo entre merge de dados e catálogo no ar menor que 5 minutos
- Cobertura: 95% dos nós com fonte e nível de spoiler desde a primeira versão; 95% `confirmado` em 60 dias (meta de docs/01)
- Nenhum progresso perdido por mudança de ID

## 10. Checagem contra a constituição

- [x] Ajuda a decidir o próximo passo (princípio 1): o grafo é a base do motor
- [x] Perdíveis avisados antes (2) e nível de spoiler respeitado (3): janelas e `spoiler` obrigatórios, mapa de perdíveis pré-calculado
- [x] Funciona sem IA e sem token (4)
- [x] Dado com origem, confiança e ID estável (6, 7): `fontes`, `status`, aliases, depreciação, checagem de IDs removidos
- [x] Decisão no motor determinístico, não no modelo (9, 11): build determinístico
- [x] Cabe no plano gratuito (13): artefatos estáticos na CDN
- [ ] RLS e teste de acesso cruzado, se toca dado de usuário (16): não se aplica

## 11. Perguntas em aberto

- [A ESCLARECER: GTA VI usa capítulos de forma explícita? Se não, `capitulos.yaml` passa a ser um agrupamento editorial das missões principais.]
- [A ESCLARECER: troca de personagem é livre ou imposta? Muda só o preenchimento do estado, mas pode exigir átomo `personagem_disponivel`.]
- [A ESCLARECER: dividir `catalog.json` por região (carga parcial) já no MVP ou só se passar de 150 KB?]
- [A ESCLARECER: valor de N para confirmação automática e se ele fica em `categorias.yaml` ou em configuração global.]
