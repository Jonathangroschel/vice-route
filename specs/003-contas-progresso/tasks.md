# Tarefas 003: Contas, jogadas e progresso

- **Plano:** [plan.md](plan.md)

Regras: cada tarefa cabe em um PR pequeno, cita a história que atende e tem verificação objetiva. `[P]` marca tarefas que podem rodar em paralelo.

## Fase A: fundação

- [ ] T01 Projeto Supabase criado; login anônimo, Google e GitHub habilitados; `supabase/` com CLI e ambiente local em Docker documentado. Verificação: `supabase start` sobe localmente e o app faz login anônimo contra ele.
- [ ] T02 Migração `0003_contas_progresso.sql` com `perfis`, `jogadas`, `estado_jogada`, `progresso`, índices e RLS. Verificação: `supabase db reset` aplica sem erro.
- [ ] T03 Teste de acesso cruzado (CO-003-03) para as quatro tabelas, em `.github/workflows/rls.yml`. Verificação: teste passa; removendo uma política, ele falha.
- [ ] T04 [P] Trigger de usuário novo (perfil + jogada padrão + estado) e trigger de limite de jogadas (H1, H6). Verificação: teste de integração cria usuário e confere as três linhas; a 11ª jogada é recusada.
- [ ] T05 [P] Esquema zod `Operacao` e `JogadaExportada v1` em `packages/catalog-schema`. Verificação: fixtures válidas e inválidas.
- [ ] T06 [P] `normalizarIds(concluidos, aliases)` em `packages/engine` (H8). Verificação: CO-003-01.

## Fase B: H1 e H3, começar e marcar

- [ ] T07 Store de sessão: login anônimo automático no primeiro acesso, aviso de progresso só local (H1). Verificação: E2E abre o app limpo e encontra a jogada padrão sem formulário.
- [ ] T08 Store de progresso com estado em memória + IndexedDB e desfazer de 5 s (H3). Verificação: teste de componente mede < 50 ms entre o toque e a mudança visual; desfazer registra `concluido = false`.
- [ ] T09 RPC `sync_progresso` com LWW, idempotência por `op_id` e motivos de ignorado (H3, H4). Verificação: CO-003-02 e teste de reenvio do mesmo lote sem efeito duplicado.

## Fase C: H4, offline

- [ ] T10 Fila persistente em IndexedDB, envio em lotes de até 500, limpeza só após confirmação (H4). Verificação: unitário com falha de rede simulada não perde operações.
- [ ] T11 RPC `puxar_alteracoes` e puxada ao abrir, ao focar e a cada 30 s (H2.3, RF-003-17). Verificação: integração com dois clientes; alteração em um aparece no outro.
- [ ] T12 Coordenação entre abas com Web Locks e BroadcastChannel. Verificação: E2E com duas abas não duplica envio.
- [ ] T13 Indicador de pendências e de erro de sync. Verificação: E2E offline mostra "N alterações pendentes" e zera ao religar.

## Fase D: H2, vínculo de conta

- [ ] T14 Vínculo com `linkIdentity` para identidade nova (H2.1). Verificação: E2E anônimo com 5 marcações vincula e mantém as 5.
- [ ] T15 Fluxo "juntar ou descartar" quando a identidade já existe (H2.2). Verificação: E2E nos dois caminhos; nada é apagado sem confirmação.

## Fase E: H5, estado da jogada

- [ ] T16 Tela Estado da jogada: última principal, principal em andamento, personagem, perfil (H5); posição só em IndexedDB. Verificação: alteração sincroniza e dispara `estado.alterado`.
- [ ] T17 Variáveis declaradas lidas de `variaveis.yaml`, filtradas por campanha e spoiler, validadas por tipo (H5.2, RF-003-12). Verificação: unitário com variável fora das opções é recusada.

## Fase F: H6, H7, H8, H9

- [ ] T18 Tela Jogadas: criar, renomear, trocar ativa, excluir com confirmação; RPC `duplicar_jogada` (H6). Verificação: E2E de cada ação; troca de ativa sem recarregar.
- [ ] T19 [P] Exportar e importar JSON com relatório de IDs desconhecidos (H7). Verificação: CO-003-04 e importação de arquivo inválido recusada.
- [ ] T20 [P] Aplicação de aliases e lista de "itens removidos do catálogo" na carga de nova versão (H8). Verificação: catálogo de teste com fusão e depreciação.
- [ ] T21 RPC `excluir_conta` e tela de exclusão com confirmação por apelido (H9). Verificação: integração confere que nada do usuário resta e que reportes ficam anonimizados.

## Fase G: fechamento

- [ ] T22 Cenários-ouro CO-003-* na suíte do CI.
- [ ] T23 `supabase-keepalive.yml` agendado a cada 3 dias. Verificação: execução manual da Action com sucesso.
- [ ] T24 Documentação: README de `supabase/` (configuração do projeto, provedores, migrações) e seção de sincronização em `docs/03-arquitetura.md`.
