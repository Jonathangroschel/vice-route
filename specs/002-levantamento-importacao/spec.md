# Spec 002: Levantamento e importação de dados

- **Status:** rascunho para revisão
- **Responsável:** [nome]
- **Depende de:** 001 (formato e validação do catálogo)
- **Referências:** [docs/02-dados-referencias.md](../../docs/02-dados-referencias.md), [docs/04-grafo-progressao.md](../../docs/04-grafo-progressao.md), [docs/08-comunidade-curadoria.md](../../docs/08-comunidade-curadoria.md)
- **Última revisão:** 2026-11-23

## 1. Contexto e problema

O catálogo só tem valor se estiver completo no lançamento do app. O Vice Atlas publica um JSON estático com veículos, armas e lugares (170 pinos, `Map Data Schema v1`, ver docs/02 §1.1) sobre a mesma imagem-base que adotamos; os pinos de colecionáveis, atividades e crimes estão no conjunto aberto do Open GTA 6 Map (3.827 locais, CC BY 4.0, docs/02 §1.5), e as regras de 100% e os capítulos no conjunto aberto do GTA6Maps (CC BY 4.0, §1.6). Missões, gatilhos, janelas e perdíveis estão em guias e detonados sem dados abertos (§1.4). Precisamos trazer os itens de mapa por importação automática e re-executável, sem quebrar IDs quando a referência mudar, e organizar o levantamento manual assistido do resto com a origem de cada informação registrada. O app nunca consulta fontes externas ao vivo (princípio 8): tudo entra no catálogo por esta spec e passa pelo CI da spec 001.

## 2. Objetivos e não objetivos

**Objetivos**
- Importar os pinos do Open GTA 6 Map (`locations.json`) para `data/itens/<categoria>.yaml`, convertendo as coordenadas para a imagem-base por transformação afim, de forma re-executável
- Importar limiares de 100% e capítulos do GTA6Maps (`completion-100-thresholds.json`) para `categorias.yaml` e `capitulos.yaml`
- Importar os pinos do Vice Atlas (`map-data/leonida.json`) para conferência e para preencher veículos, armas e lugares
- Preservar IDs entre execuções, casando primeiro pela chave estável da fonte (`key`) e, na falta dela, por posição e nome
- Levantar categorias, totais e regras de 100% dos colecionáveis (docs/02 §1.2) e os pinos de colecionáveis e atividades por levantamento assistido
- Mostrar a diferença entre a referência e o catálogo (novos, movidos, renomeados, ausentes) antes de aplicar
- Um processo de levantamento assistido para missões, gatilhos, janelas, perdíveis e durações, com `fontes[]` obrigatórias
- Isolar o formato da fonte atrás de um adaptador, para trocar ou somar fontes sem mexer no resto

**Fora do escopo**
- Consulta a fontes externas em tempo de execução pelo app
- Contribuições de jogadores pelo app (spec 010)
- Importação de troféus pela PSN (fora do escopo do projeto); a lista de troféus entra como referência manual
- Calibração de durações com dados da comunidade (spec 014)

## 3. Histórias de usuário

### H1 (P1): importar itens de mapa da referência

Como curador, quero rodar um comando que traga os pinos do Vice Atlas para o catálogo, para ter veículos, armas e lugares no mapa sem digitação.

**Critérios de aceite**
1. Dado um catálogo vazio e a fonte disponível, quando rodo `pnpm import:vice-atlas`, então são gerados `data/categorias.yaml` (se não existir) e um `data/itens/<categoria>.yaml` por categoria, com `id`, `tipo: item`, `subtipo`, `categoria`, `nome`, `nome_original` (quando houver), `posicao`, `regiao` (inferida pelos limites de `regioes.yaml`), `status: referencia`, `spoiler: 1` e `fontes: [{ tipo: referencia, url }]`.
2. Dado a importação concluída, quando rodo `pnpm catalog:check`, então o catálogo passa no esquema e os totais por categoria batem com os totais da referência.
3. Dado uma categoria da referência sem correspondência em `categorias.yaml`, quando importo, então ela é criada com ID proposto em kebab-case e marcada para revisão no relatório.
4. Dado que a fonte está indisponível ou mudou de formato, quando importo, então o comando falha sem alterar nenhum arquivo, com mensagem indicando o adaptador e o ponto da falha.

### H1b (P1): importar pinos do Open GTA 6 Map

Como curador, quero importar os 3.827 locais do Open GTA 6 Map, para ter colecionáveis, atividades e crimes no mapa sem digitação.

**Critérios de aceite**
1. Dado o arquivo `locations.json` de um commit fixado da fonte, quando rodo `pnpm import:open-gta6-map --commit <sha>`, então cada local de um `kind` mapeado vira um nó com `id_fonte` igual ao `id` da fonte, `posicao` convertida pela transformação afim, `qualidade: aproximada`, `status: referencia` (ou `nao_confirmado` se `confidence` vier vazio) e `fontes: [{ tipo: aberto, url, commit, licenca: CC-BY-4.0 }]`.
2. Dado um `kind` sem mapeamento em `mapaCategorias` (ex.: ponto de ônibus, carregador elétrico), quando importo, então os locais são ignorados e contados no relatório como "fora do escopo".
3. Dado IDs listados em `removed.json` da fonte, quando importo, então esses IDs nunca são criados e, se já existirem no catálogo, aparecem no relatório como candidatos a `depreciado`.
4. Dado a transformação afim calculada com os pontos de controle de `tooling/importers/src/open-gta6-map/controle.yaml`, quando o resíduo médio passa do limite (`LIMITE_RESIDUO_PX`, padrão 100 px da imagem-base enquanto os pontos forem rótulos de área; meta de 15 px com pontos medidos à mão), então a importação falha antes de escrever qualquer arquivo.

### H1c (P1): importar regras de 100% e capítulos

Como curador, quero trazer os limiares de 100% e a lista de capítulos de uma fonte aberta, para que contador e motor sigam a regra do jogo.

**Critérios de aceite**
1. Dado o `completion-100-thresholds.json`, quando rodo `pnpm import:limiares`, então cada categoria recebe `total` e `regra_100` e `capitulos.yaml` recebe número, título, região e esconderijo, com `fontes[]`.
2. Dado um limiar que diverge de outra fonte já registrada no nó (ex.: meditação 15/15 contra 15/18), quando importo, então os dois valores ficam em `fontes[]`, o mais exigente vale e o relatório lista a divergência.

### H2 (P1): re-importar sem quebrar IDs

Como jogador, quero que uma atualização da referência não apague nem troque meu progresso, para continuar confiando no app.

**Critérios de aceite**
1. Dado um item já no catálogo e o mesmo item na referência com a mesma chave de fonte (`key`), ou, sem chave, com a mesma posição (tolerância configurável, padrão 5 px da imagem-base) e mesma categoria, quando re-importo, então o ID é mantido e só campos de origem `referencia` são atualizados.
2. Dado um item na referência com posição ligeiramente diferente (dentro de 50 unidades) e nome igual, quando re-importo, então é casado como "movido" e o ID é mantido.
3. Dado um item do catálogo sem par na referência, quando re-importo, então ele NÃO é removido; aparece no relatório como "ausente na referência" para decisão do curador.
4. Dado um item novo na referência, quando re-importo, então recebe o próximo ID livre da categoria (`item:<categoria>-<NNN>`), nunca um ID já usado ou depreciado.
5. Dado um campo editado à mão por um curador ou contribuidor (ex.: `dicas`, `requer`, `duracao_min`, `spoiler`, `status: confirmado`), quando re-importo, então esse campo é preservado.
6. Dado dois candidatos possíveis para casar um item, quando re-importo, então nenhum é casado automaticamente; o caso vai para o relatório como ambíguo.

### H3 (P1): revisar a diferença antes de aplicar

Como curador, quero ver o que a importação vai mudar antes de gravar, para não aceitar regressões da referência.

**Critérios de aceite**
1. Dado `pnpm import:vice-atlas --dry-run`, quando executo, então nenhum arquivo é alterado e recebo um relatório com contagem e lista de: novos, mantidos, movidos (com distância), renomeados, ausentes na referência, ambíguos, categorias novas.
2. Dado a execução sem `--dry-run`, quando termina, então o mesmo relatório é salvo em `tooling/importers/vice-atlas/relatorios/<data>.md` para ir no corpo do PR.
3. Dado um relatório com itens ausentes ou ambíguos, quando abro o PR, então o template do PR exige a decisão do curador para cada um (depreciar, fundir, manter).

### H4 (P1): levantar missões, gatilhos e janelas com origem

Como curador, quero um processo padronizado para transcrever missões, gatilhos, janelas e perdíveis de fontes públicas, para que cada informação tenha origem verificável.

**Critérios de aceite**
1. Dado uma missão principal transcrita, quando valido, então ela tem `capitulo_referencia`, ordem (via `requer` da anterior), personagem, posição de início quando conhecida, `spoiler ≥ 2` e ao menos uma fonte com URL.
2. Dado uma missão oculta, quando transcrita, então todo gatilho que a libera existe como nó `gatilho` com `requer`, `condicoes_momento` e fonte.
3. Dado um item perdível, quando transcrito, então `perdivel_apos` aponta para uma missão principal existente e a fonte que justifica a perda está em `fontes`.
4. Dado uma informação que só uma fonte não oficial afirma, quando transcrita, então o nó fica com `status: referencia`; nunca `confirmado` (regra de docs/02 §2).
5. Dado o guia de levantamento (`docs/levantamento.md` ou seção do CONTRIBUTING), quando um agente de codificação faz a primeira passada, então ele segue o mesmo formato e registra URL de origem em cada nó.

### H5 (P2): estimar durações iniciais

Como motor, quero uma duração estimada para cada nó, para o planejador ter números desde o MVP.

**Critérios de aceite**
1. Dado um nó sem `duracao_min`, quando rodo `pnpm import:duracoes`, então recebe a duração padrão do seu subtipo ou categoria, definida numa tabela em `data/categorias.yaml` (ex.: carta 2 min, salto acrobático 3 min, missão secundária 15 min).
2. Dado um nó com `duracao_min` escrito à mão, quando rodo o comando, então o valor é preservado.

### H6 (P2): somar outras fontes

Como curador, quero adicionar outra fonte de referência (outra wiki ou mapa) sem reescrever o importador.

**Critérios de aceite**
1. Dado um novo adaptador que implementa a interface de fonte, quando registrado, então `pnpm import:<fonte>` funciona com o mesmo casamento, relatório e preservação de campos.
2. Dado duas fontes com o mesmo item, quando importo a segunda, então a fonte é acrescentada a `fontes[]` do nó existente, sem duplicar o nó.

## 4. Requisitos funcionais

| ID | Requisito |
|---|---|
| RF-002-01 | O importador DEVE rodar offline em relação ao app: é um comando de desenvolvimento, nunca chamado pelo app. |
| RF-002-02 | O acesso à fonte DEVE passar por uma interface de adaptador (`FonteAdapter`) com `listarCategorias()` e `listarItens()` devolvendo um formato intermediário normalizado. |
| RF-002-03 | O casamento DEVE usar categoria, distância e similaridade de nome, nesta ordem, com tolerâncias configuráveis. |
| RF-002-04 | O importador NÃO DEVE remover nós nem reaproveitar IDs (princípio 7). |
| RF-002-05 | O importador DEVE atualizar só campos marcados como de origem da fonte e preservar os demais. |
| RF-002-06 | Toda escrita DEVE ser atômica: ou todos os arquivos são atualizados, ou nenhum. |
| RF-002-07 | O importador DEVE produzir relatório de diferenças em `--dry-run` e em execução real. |
| RF-002-08 | Posições da fonte DEVEM estar em pixels da mesma edição de imagem-base de `data/mapa.yaml`; se a edição divergir, o adaptador DEVE aplicar a transformação afim declarada ou falhar. |
| RF-002-09 | O importador DEVE guardar uma cópia bruta da última resposta da fonte em `tooling/importers/vice-atlas/cache/` (fora do git) para reprocessar sem novo acesso. |
| RF-002-10 | Todo nó criado ou alterado por levantamento manual DEVE ter `fontes[]` com `tipo` e `url` (ou "jogado em <data>, plataforma"). |
| RF-002-11 | O processo de levantamento DEVE ter guia escrito e template de PR com checklist (fontes, spoiler, janelas). |
| RF-002-12 | O importador PODE baixar ícones de categoria; NÃO DEVE baixar imagens de itens para o repositório. |
| RF-002-13 | Importações de fontes abertas DEVEM fixar a versão da fonte (commit ou data) e gravá-la em `fontes[]` e no relatório. |
| RF-002-14 | Toda fonte sob CC BY DEVE ser registrada em `data/FONTES.md` com licença, link e alterações feitas, e aparecer na página Créditos do app. |
| RF-002-15 | A conversão de coordenadas entre sistemas DEVE usar transformação afim calculada por mínimos quadrados sobre pontos de controle versionados, com resíduo médio e máximo no relatório. |
| RF-002-16 | Fontes sem licença declarada NÃO DEVEM ser importadas em massa; só PODEM ser usadas para conferência e levantamento assistido, com link em `fontes[]`. |

## 5. Requisitos não funcionais

| ID | Requisito | Meta |
|---|---|---|
| RNF-002-01 | Tempo de importação completa da referência | < 2 min |
| RNF-002-02 | Re-importação sem mudança na fonte | Zero alterações em `data/` (diff vazio) |
| RNF-002-03 | Acessos à fonte | Uma rodada de requisições por execução, com intervalo entre chamadas e cache local |
| RNF-002-04 | Taxa de casamento automático em re-importações | ≥ 99% dos itens mantidos sem intervenção |

## 6. Casos de borda e falhas

- Dois itens da mesma categoria muito próximos (ex.: cartas no mesmo prédio): casamento por nome desempata; se o nome também empata, ambíguo.
- Item que muda de categoria na referência: tratado como ausente em uma e novo na outra; relatório sugere fusão.
- Referência com total diferente do somatório de itens: aviso no relatório; `categorias.yaml` segue o somatório real e o curador decide.
- Fonte com nomes só em inglês: `nome` recebe o original até a tradução; relatório lista itens sem nome em português.
- Coordenada fora dos limites do mapa após conversão: item não é importado e vai para o relatório.
- Fonte retorna parcialmente (timeout no meio): nada é gravado (RF-002-06).
- Levantamento manual divergente entre duas fontes (ex.: janela de perda): registrar as duas em `fontes[]`, usar a mais conservadora (perde mais cedo) e marcar `[A ESCLARECER]` no campo `obs`.

## 7. Entidades e eventos (conceitual)

- **Fonte**: nome, adaptador, URL base, transformação de coordenadas.
- **Item da fonte (normalizado)**: id na fonte, categoria da fonte, nome, nome original, posição, URL.
- **Casamento**: item da fonte ↔ nó do catálogo, com tipo (mantido, movido, renomeado, novo, ambíguo) e distância.
- **Relatório de importação**: data, fonte, contagens, listas por tipo de casamento, decisões pendentes.
- **Guia de levantamento**: formato, fontes aceitas, checklist de PR.

## 8. Cenários-ouro (se toca o motor ou o agente)

| ID | Estado de entrada | Resultado esperado | Como é verificado |
|---|---|---|---|
| CO-002-01 | Catálogo vazio + fixture da fonte com 2 categorias e 10 itens | 10 nós criados, totais corretos, `catalog:check` verde | Asserção determinística |
| CO-002-02 | Catálogo importado + mesma fixture | Diff vazio em `data/` | Asserção determinística |
| CO-002-03 | Catálogo importado + fixture com 1 item deslocado 20 unidades | ID mantido, item listado como movido | Asserção determinística |
| CO-002-04 | Catálogo com item editado à mão (`dicas`, `status: confirmado`) + re-importação | Campos preservados | Asserção determinística |
| CO-002-05 | Fixture sem um item existente no catálogo | Item continua no catálogo; relatório lista como ausente | Asserção determinística |
| CO-002-07 | Fixture do Open GTA 6 Map com 3 pontos de controle conhecidos e 1 ID em `removed.json` | Posições convertidas com resíduo < 1 px; ID removido não criado | Asserção determinística |
| CO-002-08 | Pontos de controle com um erro grosseiro (deslocado 200 px) | Importação falha por resíduo, nenhum arquivo alterado | Asserção determinística |
| CO-002-06 | Fixture com dois candidatos equidistantes e mesmo nome | Nenhum casamento automático; caso ambíguo no relatório | Asserção determinística |

## 9. Métricas de sucesso

- 100% dos pinos do Vice Atlas e todas as categorias de colecionáveis (com total e regra de 100%) no catálogo na primeira versão publicada
- 100% das missões principais transcritas, com ordem e capítulo, antes do lançamento do app
- 100% dos nós com `fontes[]` preenchido
- Zero progresso perdido por re-importação

## 10. Checagem contra a constituição

- [x] Ajuda a decidir o próximo passo (princípio 1): alimenta o grafo do motor
- [x] Perdíveis avisados antes (2) e nível de spoiler respeitado (3): janelas e spoiler exigidos no levantamento
- [x] Funciona sem IA e sem token (4): importação e levantamento não dependem de IA em execução; agente de codificação é só ferramenta de trabalho
- [x] Dado com origem, confiança e ID estável (6, 7): `fontes[]`, `status: referencia`, casamento que preserva IDs
- [x] Decisão no motor determinístico, não no modelo (9, 11): não se aplica diretamente
- [x] Cabe no plano gratuito (13): roda localmente ou no GitHub Actions
- [ ] RLS e teste de acesso cruzado, se toca dado de usuário (16): não se aplica

## 11. Perguntas em aberto

- Resolvido (23/11/2026): fonte é `https://www.vice-atlas.com/map-data/leonida.json`, posições em pixels da mesma imagem-base (transformação identidade, ADR 003); cada entrada traz `directions`, que vira `dicas` com `spoiler: 1`.
- Resolvido (23/11/2026): pinos de colecionáveis e atividades vêm do Open GTA 6 Map (CC BY 4.0); limiares e capítulos do GTA6Maps (CC BY 4.0).
- [A ESCLARECER: quais pontos de controle usar na transformação afim (proposta: 8 a 12 marcos presentes no `places.json` do Open GTA 6 Map e nos rótulos do mapa da Rockstar, espalhados pelo mapa).]
- [A ESCLARECER: tabela inicial de durações padrão por categoria.]
