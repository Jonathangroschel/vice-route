# Tarefas 001: Catálogo e grafo de progressão

- **Plano:** [plan.md](plan.md)

Regras: cada tarefa cabe em um PR pequeno, cita a história que atende e tem verificação objetiva. `[P]` marca tarefas que podem rodar em paralelo.

## Fase A: fundação

- [x] T01 Monorepo: pnpm workspace, Turborepo, TypeScript, Vitest, ESLint, Prettier, pacotes vazios `catalog-schema` e `catalog-build`. Verificação: `pnpm verify` verde no CI. _(23/11: feito sem ESLint; acrescentar quando entrar o app web.)_
- [x] T02 [P] Esquemas zod de `Categoria`, `Regiao`, `Capitulo`, `Variavel`, `Fonte` (H1). Verificação: testes com fixtures válidas e inválidas.
- [x] T03 [P] Esquema zod de `Condicao` (operadores e átomos) e `CondicaoMomento` (H1). Verificação: operador desconhecido gera erro listando os aceitos (critério H1.3).
- [x] T04 Esquema zod de `No` com `Janela`, limites de tamanho de texto e regra `SPOILER_MINIMO` para missões (H1, H2.7). Verificação: critérios H1.2 e H2.7 automatizados.
- [x] T05 Fixture realista em `data/` e `golden/catalogo/` com a cadeia de docs/04 §7, 2 categorias, 1 região, 2 capítulos. Verificação: arquivos passam no esquema. _(23/11: a fixture da cadeia de docs/04 §7 está em `golden/catalogo/cadeia-oculta/`; `data/` já tem o catálogo real importado.)_

## Fase B: validação (H1, H2)

- [x] T06 Carregador YAML com posição de linha e mensagens `arquivo:linha campo`. Verificação: RNF-001-04 em teste.
- [x] T07 Índice de IDs, aliases e referências (`ID_DUPLICADO`, `REF_QUEBRADA`, `ALIAS_DUPLICADO`, `ALIAS_CICLO`, `DEPRECIADO_REFERENCIADO`). Verificação: critérios H2.1 e H4.3.
- [x] T08 Detecção de ciclos (Tarjan) e ordem topológica das principais (H2.2). Verificação: CO-001-05.
- [x] T09 Validação de janelas (`JANELA_INVERTIDA`) e alcançabilidade (`NASCE_PERDIDO`) (H2.3, H2.4). Verificação: CO-001-04 e casos de `qualquer`/`pelo_menos`.
- [x] T10 [P] Totais por categoria, limites do mapa, variáveis declaradas e usadas (H2.5, RF-001-08, RF-001-15). Verificação: testes com códigos `TOTAL_CATEGORIA`, `FORA_DO_MAPA`, aviso `VARIAVEL_NAO_USADA`.
- [x] T11 Comparação com versão publicada (`ID_REMOVIDO`), com modo "primeira versão" (H2.6). Verificação: teste com duas versões de fixture. _(23/11: compara com o `manifest.json` local; baixar a versão publicada em produção fica para quando houver deploy.)_
- [x] T12 Comando `pnpm catalog:check` com saída em terminal e anotações do GitHub Actions. Verificação: passo no CI falha num PR de teste com referência quebrada.

## Fase C: compilação e pré-cálculo (H3, H4, H5)

- [x] T13 Compilador determinístico de `catalog.json` com aliases resolvidos e campos de curadoria removidos (H3.2, H3.4, H4.1, H4.2). Verificação: build duas vezes, bytes iguais; CO-001-03.
- [x] T14 [P] Pré-cálculo: descendentes, valor de desbloqueio, perdíveis por missão (H5). Verificação: CO-001-01, CO-001-02.
- [x] T15 [P] Clusters espaciais por região (H5.1). Verificação: teste com pontos sintéticos.
- [x] T16 [P] `search-index.json` (nome, nome original, aliases, categoria). Verificação: snapshot.
- [x] T17 `manifest.json` com versão `AAAA.MM.DD-N` e SHA-256 dos arquivos; saída em `apps/web/public/catalog/` (H3.1, H7.1). Verificação: teste de geração e incremento de N no mesmo dia.
- [ ] T18 Teste de desempenho com catálogo sintético de 5 mil nós. Verificação: RNF-001-01 a 03.

## Fase D: cobertura e versões (H6, H7)

- [x] T19 `pnpm catalog:report` com contagens de docs/04 §8 (H6.1). Verificação: snapshot do relatório da fixture.
- [ ] T20 Comentário de relatório antes × depois no PR (H6.2). Verificação: PR de teste recebe e atualiza o comentário.
- [ ] T21 Notas de versão por diferença entre catálogos (H7.2). Verificação: teste com adição, alteração, depreciação e fusão.

## Fase E: fechamento

- [x] T22 Cenários-ouro CO-001-* na suíte do CI.
- [ ] T23 Documentação: README de `catalog-schema` e `catalog-build`, JSON Schema gerado para autocompletar YAML no editor, seção de formato no CONTRIBUTING.md. _(23/11: parcial: DESENVOLVIMENTO.md escrito; JSON Schema para o editor pendente.)_
