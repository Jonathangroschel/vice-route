# Tarefas 008: Motor de recomendação

- **Plano:** [plan.md](plan.md)

Regras: cada tarefa cabe em um PR pequeno, cita a história que atende e tem verificação objetiva. `[P]` marca tarefas que podem rodar em paralelo.

## Fase A: fundação

- [ ] T01 Criar `packages/engine` (tsconfig, Vitest, exports, sem dependências de execução). Verificação: `pnpm --filter engine test` roda vazio e o pacote entra no `pnpm verify`.
- [ ] T02 Tipos públicos (`EstadoJogada`, `Parametros`, `Resultado`, `ResultadoNo`, `Motivo`, `Aviso`) importando `Condicao` e `Atomo` de `catalog-schema`. Verificação: typecheck passa; teste de tipo com fixture.
- [ ] T03 [P] Fixtures mínimas em `packages/engine/test/fixtures/` (cadeia de docs/04 §7, campanha linear de 20 principais, `qualquer`, `pelo_menos`, `nao`). Verificação: fixtures validam no esquema zod.
- [ ] T04 [P] Formato e runner de cenários-ouro (`golden/motor/*.yaml`, asserções declarativas). Verificação: um cenário de exemplo falhando, como esperado, sem implementação.

## Fase B: classificação e o que falta (H1, H2)

- [ ] T05 Índice denso de IDs e `ordemTopologica` das principais (H1). Verificação: unitário com campanha com trecho paralelo.
- [ ] T06 Normalização: aliases, fecho implícito, pré-requisitos de concluídos (H1, critérios 5 e 6). Verificação: CO-008-03 e CO-008-10 passam.
- [ ] T07 Janelas com `momento` início/conclusão e status `futuro`/`perdido` (H1, critérios 2 e 3). Verificação: tabela de casos unitários.
- [ ] T08 Avaliador de `requer` com todos os operadores e átomos, devolvendo faltantes mínimos e custo (H2). Verificação: 100% de ramos; CO-008-04 passa.
- [ ] T09 Status base, personagem, `variavel_nao_informada`, `CAMINHO_EXCLUIDO` (H1 critério 7, H2 critérios 5 e 6). Verificação: unitários.
- [ ] T10 `oQueFalta` recursivo em ordem de execução, sem repetição (H2 critério 4). Verificação: unitário na cadeia de docs/04 §7.

## Fase C: risco e perdíveis (H3)

- [ ] T11 `missoesAtePerder`, `em_risco` com K configurável (H3 critérios 1 e 2). Verificação: CO-008-02 passa.
- [ ] T12 Propagação de risco pelos faltantes (H3 critério 3). Verificação: CO-008-01 passa.
- [ ] T13 `perdiveis()` e `antesDeAvancar(missao)` separando início e conclusão (H3 critério 5). Verificação: unitário.

## Fase D: pontuação, ranking e motivos (H4, H5, H6, H7)

- [ ] T14 Pesos por perfil e fórmula de pontuação com sobrescrita e `priors` opcional (H4). Verificação: unitário de cada parcela.
- [ ] T15 Ordenação com regra fixa de perdível na próxima principal e desempate por ID (H3 critério 4, H4 critério 5). Verificação: CO-008-05, CO-008-06 e CO-008-09 passam.
- [ ] T16 Motivos codificados e templates pt-BR (H4). Verificação: snapshot das frases.
- [ ] T17 Aplicação do teto de spoiler e de `revelados` em toda saída textual (H7). Verificação: CO-008-07 passa.
- [ ] T18 [P] `checklistCapitulo` agrupado por região, com seção de perdidos (H5). Verificação: unitário.
- [ ] T19 [P] `pertoDeMim` com distância a ponto e a polígono (H6). Verificação: unitário.
- [ ] T20 Stub `planoSessao` devolvendo `nao_implementado` (RF-008-13). Verificação: teste de contrato.

## Fase E: pré-cálculo, app e CI

- [ ] T21 Funções de build (`descendentes`, `valorDesbloqueio`, `perdiveisPorMissaoBuild`, `clusters`) usadas pelo `catalog-build` para gerar `precomputed.json`. Verificação: build do catálogo gera o arquivo; motor recusa versão incompatível.
- [ ] T22 Worker com Comlink, `useMotor()` e store com debounce de 150 ms no `apps/web`. Verificação: teste de integração com Worker real calculando um estado.
- [ ] T23 Testes de propriedade com fast-check (exclusividade de status, determinismo). Verificação: 1.000 grafos aleatórios sem falha.
- [ ] T24 Benchmark com catálogo real e limite de regressão de 20% no CI (RNF-008-01). Verificação: CO-008-11 passa em Node de referência.
- [ ] T25 Job `golden` no CI disparado por `packages/engine/**` e `data/**` (RF-008-15). Verificação: PR de teste que quebra um perdível falha o build.

## Fase F: fechamento

- [ ] T26 Cenários-ouro CO-008-01 a CO-008-11 na suíte do CI.
- [ ] T27 Documentação: README do pacote (API, como escrever cenário-ouro) e atualização de docs/05 se algo mudou.
