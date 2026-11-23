# Tarefas 002: Levantamento e importação de dados

- **Plano:** [plan.md](plan.md)

Regras: cada tarefa cabe em um PR pequeno, cita a história que atende e tem verificação objetiva. `[P]` marca tarefas que podem rodar em paralelo.

## Fase A: fundação

- [x] T01 Esclarecer formato, URL e coordenadas do Vice Atlas; registrar em docs/02. Verificação: perguntas de spec §11 respondidas (23/11/2026: `map-data/leonida.json`, pixels da imagem-base).
- [x] T02 [P] Tipos `ItemFonte`, `CategoriaFonte`, `FonteAdapter` em `tooling/importers/core`. Verificação: typecheck e adaptador falso compilando. _(23/11: `ItemFonte` e `mesclar` em `core/mesclar.ts`; sem interface de adaptador genérica ainda.)_
- [ ] T03 [P] Fixture no formato Map Data Schema v1 (2 categorias, 10 entradas, 1 em `retired`) e adaptador falso. Verificação: teste lê a fixture.

## Fase B: importação e casamento (H1, H2)

- [ ] T04 Casamento por categoria, distância e nome, com emparelhamento sem repetição (H2.1, H2.2, H2.6). Verificação: CO-002-03 e CO-002-06. _(23/11: casamento por `ids_fonte` implementado; casamento por distância e nome, para fontes sem chave estável, pendente.)_
- [x] T05 Mesclagem com regra de campos de fonte versus curadoria (H2.5). Verificação: CO-002-04.
- [x] T06 Alocação de IDs novos ignorando depreciados e aliases (H2.4). Verificação: teste com ID depreciado no meio da sequência.
- [x] T07 Escrita atômica de YAML com ordenação estável (RF-002-06, RNF-002-02). Verificação: CO-002-02 (diff vazio) e teste de falha no meio.
- [x] T08 Ausentes nunca removidos (H2.3). Verificação: CO-002-05.
- [ ] T09 Adaptador Vice Atlas real (Map Data Schema v1) com cache bruto, mapeamento do plano §3 e falha se `basemap.id` divergir (H1, RF-002-08, RF-002-09). Verificação: execução manual gera todos os pinos da fonte (170 em 23/11/2026) e `catalog:check` verde (H1.2). _(23/11: substituída: o Vice Atlas não tem licença declarada e virou referência para os pontos de controle, não fonte importada (RF-002-16).)_
- [ ] T10 Criação de categorias novas e falha segura com fonte indisponível (H1.3, H1.4). Verificação: testes com adaptador falso que lança erro.

## Fase B2: fontes abertas (H1b, H1c)

- [x] T09a `afim.ts`: ajuste por mínimos quadrados, aplicação e resíduos (RF-002-15). Verificação: CO-002-07 e CO-002-08.
- [ ] T09b `controle.yaml` com 8 a 12 pontos de controle entre Open GTA 6 Map e imagem-base, medidos à mão. Verificação: resíduo médio < 15 px no relatório. _(23/11: pontos gerados por `pnpm import:controle` casando rótulos e lugares das duas bases (31 pares, resíduo mediano 63 px, médio 74 px); limite ajustado para 100 px. Medir à mão no pôster para chegar perto de 15 px.)_
- [x] T09c Adaptador Open GTA 6 Map com commit fixado, `mapaCategorias`, conjuntos de cartas e `removed.json` (H1b). Verificação: importação real gera os locais dos tipos mapeados e `catalog:check` verde.
- [x] T09d Importador de limiares e capítulos do GTA6Maps (H1c). Verificação: `categorias.yaml` com `regra_100` em todas as categorias do §1.6 do docs/02 e divergências no relatório.
- [ ] T09e `data/FONTES.md` e página Créditos com licença, link e alterações (RF-002-14). Verificação: revisão do PR e link de licença em cada fonte CC BY. _(23/11: `data/FONTES.md` escrito; página Créditos depende do app web.)_

## Fase C: relatório (H3)

- [x] T11 Relatório Markdown com contagens e listas por tipo de casamento, `--dry-run` sem escrita (H3.1, H3.2). Verificação: snapshot do relatório da fixture.
- [ ] T12 [P] Template de PR de dados com seção de decisões de importação (H3.3). Verificação: template presente e usado no PR da primeira importação.

## Fase D: levantamento manual (H4, H5)

- [ ] T13 Guia de levantamento no CONTRIBUTING.md: formato, fontes aceitas, níveis de spoiler, janelas, exemplos (H4.5). Verificação: revisão do curador.
- [x] T14 Transcrição das missões principais com ordem, capítulo e fontes (H4.1). Verificação: `catalog:check` verde e 100% com fonte. _(23/11: 91 principais por `pnpm levantamento:missoes`, a partir de `src/levantamento/principais.tsv`.)_
- [x] T15 [P] Transcrição de secundárias e ocultas com gatilhos (H4.2). Verificação: nenhuma oculta sem gatilho ou `requer`. _(23/11: 45 secundárias em 23 linhas, 8 ocultas, 8 gatilhos.)_
- [ ] T16 [P] Janelas e perdíveis a partir de guias de perdíveis (H4.3). Verificação: `NASCE_PERDIDO` não dispara; perdíveis com fonte. _(23/11: parcial: 5 pontos sem retorno, 10 itens e 7 missões perdíveis; pendências em docs/02 §1.7.)_
- [ ] T17 Tabela de durações padrão e comando `import:duracoes` (H5). Verificação: relatório de cobertura sem nós sem duração.

## Fase E: outras fontes (H6)

- [ ] T18 Acrescentar fonte em `fontes[]` de nó existente ao importar de segunda fonte (H6.2). Verificação: teste com dois adaptadores falsos.

## Fase F: fechamento

- [x] T19 Cenários-ouro CO-002-* na suíte do CI. _(CO-002-01 a 05, 07 e 08 em `tooling/importers/test/`.)_
- [ ] T20 README do importador com runbook (rodar, decidir ausentes e ambíguos).
