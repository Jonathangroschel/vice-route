# Plano técnico 003: Contas, jogadas e progresso

- **Spec:** [spec.md](spec.md)
- **Status:** rascunho

## 1. Resumo da abordagem

Supabase Auth com login anônimo habilitado cria um usuário no primeiro acesso; a conta social é vinculada ao mesmo usuário com `linkIdentity`. O cliente é a fonte imediata da verdade: toda alteração vai primeiro para o IndexedDB (estado materializado + fila de operações) e um sincronizador envia lotes para um RPC `sync_progresso` que aplica "último a escrever vence" por (jogada, nó) dentro do Postgres. Leitura incremental usa `atualizado_em` do servidor como cursor. Não há backend próprio: tudo é Postgres com RLS e RPCs `security invoker`. A migração de IDs por aliases acontece no cliente, na carga do catálogo, sem reescrever o servidor.

## 2. Módulos afetados

| Módulo | Mudança |
|---|---|
| `supabase/migrations` | Tabelas `perfis`, `jogadas`, `estado_jogada`, `progresso`; RLS; RPCs `sync_progresso`, `puxar_alteracoes`, `duplicar_jogada`, `excluir_conta` |
| `apps/web/stores/sessao` | Sessão anônima, login social, vínculo, fluxo "juntar ou descartar" |
| `apps/web/stores/jogadas` | CRUD de jogadas, jogada ativa, exportar/importar |
| `apps/web/stores/progresso` | Estado materializado, marcar/desmarcar, desfazer |
| `apps/web/sync/` | Fila em IndexedDB, envio em lote, puxada incremental, coordenação entre abas |
| `packages/catalog-schema` | Esquema zod do arquivo de exportação de jogada (`JogadaExportada v1`) |
| `packages/engine` | Função `normalizarIds(concluidos, aliases)` usada também pelo motor |
| `.github/workflows` | `rls.yml` (testes de acesso cruzado), `supabase-keepalive.yml` |

## 3. Contratos

- **Tabelas e RPCs**: `supabase/migrations/0003_contas_progresso.sql`
- **Tipo `Operacao`** (cliente → RPC):
  ```ts
  type Operacao =
    | { tipo: 'marcacao'; jogada_id: string; no_id: string; concluido: boolean;
        momento: string /* ISO, relógio do cliente */; origem: 'manual'|'sugestao'|'captura'|'importacao';
        versao_catalogo: string; op_id: string /* uuid, idempotência */ }
    | { tipo: 'estado'; jogada_id: string; patch: Partial<EstadoJogada>; momento: string; op_id: string };
  ```
- **RPC `sync_progresso(ops jsonb) returns jsonb`**: aplica em transação, devolve `{ aplicadas: op_id[], ignoradas: {op_id, motivo}[] }`. Motivos: `mais_antiga`, `jogada_inexistente`, `momento_futuro`, `invalida`.
- **RPC `puxar_alteracoes(desde timestamptz) returns jsonb`**: jogadas, estados e marcações do usuário com `atualizado_em > desde`, mais o novo cursor.
- **Arquivo de exportação** `JogadaExportada`: `{ formato: 1, versao_catalogo, exportado_em, jogada: {nome, plataforma}, estado, concluidos: string[] }`.

## 4. Modelo de dados

```sql
-- 0003_contas_progresso.sql (esboço)
create table perfis (
  usuario_id uuid primary key references auth.users on delete cascade,
  apelido text check (char_length(apelido) between 2 and 32),
  nivel_spoiler smallint not null default 1 check (nivel_spoiler between 0 and 3),
  tema text not null default 'escuro',
  idioma text not null default 'pt-BR',
  jogada_ativa uuid,
  criado_em timestamptz not null default now()
);

create table jogadas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users on delete cascade,
  nome text not null check (char_length(nome) between 1 and 60),
  plataforma text,
  versao_catalogo text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index on jogadas (usuario_id);

create table estado_jogada (
  jogada_id uuid primary key references jogadas on delete cascade,
  usuario_id uuid not null references auth.users on delete cascade,   -- desnormalizado para RLS barato
  ultima_principal text,               -- id de nó missao:principal-*
  principal_em_andamento text,         -- janelas com momento: inicio
  personagem text check (personagem in ('jason','lucia')),
  variaveis jsonb not null default '{}',
  perfil_recomendacao text not null default 'equilibrio',
  preferencias jsonb not null default '{}',
  momento timestamptz not null default now(),   -- último momento aplicado (LWW)
  atualizado_em timestamptz not null default now()
);

create table progresso (
  jogada_id uuid not null references jogadas on delete cascade,
  no_id text not null,
  usuario_id uuid not null references auth.users on delete cascade,
  concluido boolean not null,
  momento timestamptz not null,        -- relógio do cliente, usado no LWW
  origem text not null,
  versao_catalogo text not null,
  atualizado_em timestamptz not null default now(),  -- relógio do servidor, cursor de puxada
  primary key (jogada_id, no_id)
);
create index on progresso (usuario_id, atualizado_em);

alter table perfis enable row level security;
alter table jogadas enable row level security;
alter table estado_jogada enable row level security;
alter table progresso enable row level security;

create policy dono on perfis for all using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
create policy dono on jogadas for all using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
create policy dono on estado_jogada for all using (usuario_id = auth.uid())
  with check (usuario_id = auth.uid()
              and exists (select 1 from jogadas j where j.id = jogada_id and j.usuario_id = auth.uid()));
create policy dono on progresso for all using (usuario_id = auth.uid())
  with check (usuario_id = auth.uid()
              and exists (select 1 from jogadas j where j.id = jogada_id and j.usuario_id = auth.uid()));
```

Aplicação do LWW dentro de `sync_progresso` (security invoker, então a RLS vale):

```sql
insert into progresso as p (jogada_id, no_id, usuario_id, concluido, momento, origem, versao_catalogo)
values ($1, $2, auth.uid(), $3, $4, $5, $6)
on conflict (jogada_id, no_id) do update
  set concluido = excluded.concluido, momento = excluded.momento, origem = excluded.origem,
      versao_catalogo = excluded.versao_catalogo, atualizado_em = now()
  where p.momento < excluded.momento;
```

- Trigger `on auth.users insert` cria `perfis` e uma jogada padrão com `estado_jogada`.
- Limite de 10 jogadas por trigger `before insert` em `jogadas`.
- `excluir_conta()` (security definer, restrita ao próprio `auth.uid()`): anonimiza `reportes`/`confirmacoes` (spec 010) e chama a exclusão do usuário em `auth.users`; o `on delete cascade` apaga o resto.
- **Reversão**: migração com `down` que remove RPCs, políticas e tabelas; só usada antes de haver dados reais.

Tamanho estimado: ~120 bytes por linha de `progresso` com índice; 2 mil marcações ≈ 240 KB por jogada completa (dentro do RNF-003-04). Com 10 mil usuários e média de 600 marcações, ≈ 72 MB, folgado nos 500 MB do plano gratuito. Se o volume apertar, ver a alternativa de bitset na seção 6.

## 5. Fluxos

**Marcar (caminho feliz)**
```
UI ── marcar(no) ──► store progresso (estado em memória + IndexedDB, < 50 ms)
                     └─► fila.push(Operacao) ──► sincronizador (debounce 1 s)
                                                   └─► rpc sync_progresso(lote)
                                                         └─► remove op_ids aplicados e ignorados da fila
```

**Puxar alterações**: ao abrir, ao focar a aba e a cada 30 s: `puxar_alteracoes(cursor)`, aplica no estado local só se o `momento` remoto for maior que o local para o mesmo par, salva o novo cursor.

**Vínculo de conta**
```
anônimo ── linkIdentity(google|github) ──► ok: mesmo usuario_id, nada muda
                                     └──► erro "identidade já existe":
                                           UI pergunta juntar | descartar
                                           signIn na conta existente
                                           juntar: reenvia as jogadas locais como novas jogadas (com suas marcações) para a conta
                                           descartar: limpa IndexedDB e puxa a conta
                                           usuário anônimo antigo fica órfão (limpeza agendada)
```

**Carga de nova versão do catálogo**: `normalizarIds` mapeia aliases no estado local; o servidor não é reescrito; marcações de nós depreciados ficam fora dos totais.

**Coordenação entre abas**: `navigator.locks.request('vice-route-sync')` garante um só sincronizador; mudanças em outra aba chegam por `BroadcastChannel`.

## 6. Decisões e alternativas descartadas

| Decisão | Alternativa | Por que não |
|---|---|---|
| Linha por (jogada, nó) | Bitset ou JSON por jogada | Linha permite LWW por nó e puxada incremental simples; bitset depende da ordem do catálogo. Revisar se o volume apertar o plano gratuito. |
| LWW com momento do cliente | CRDT ou relógio híbrido | Conflito real é raro (um jogador, dois dispositivos); LWW resolve e é explicável. Relógio híbrido fica como evolução. |
| RPC em lote | Supabase Realtime | Realtime consome conexões do plano gratuito e não é necessário; puxada a cada 30 s basta. |
| Sessão anônima do Supabase | Progresso só local até logar | Anônimo no servidor permite backup imediato e o mesmo código de sync para todos. |
| Juntar contas no cliente | Função de mesclagem no servidor | O cliente já tem os dados locais; evita lidar com a sessão anônima expirada no servidor. |

## 7. Estratégia de teste

- Unitário: fila (persistência, idempotência por `op_id`), aplicação de puxada com LWW, `normalizarIds`, validação de `JogadaExportada`.
- Integração (Supabase local via CLI, Docker): `sync_progresso` com ordens embaralhadas; trigger de criação de perfil e jogada; limite de jogadas; `excluir_conta`.
- RLS (CO-003-03): dois usuários de teste; A não lê, não insere, não atualiza nem apaga nada de B em todas as tabelas; roda no CI em `rls.yml`.
- Ida e volta de exportação e importação (CO-003-04).
- E2E (Playwright): marcar offline (rede desligada no navegador), recarregar, religar, conferir no banco.
- Desempenho: marcar 100 itens seguidos sem travar a interface; tempo de marcação medido no teste E2E.

## 8. Observabilidade e operação

- Indicador no app: alterações pendentes, última sincronização, erro de sync.
- Logs de erro do cliente no console com código do motivo (sem dados pessoais).
- Painel do Supabase: tamanho do banco e usuários ativos acompanhados mensalmente contra o limite gratuito.
- `supabase-keepalive.yml`: GitHub Action agendada a cada 3 dias que faz uma consulta leve (`select 1` via REST com a chave anônima) para evitar a pausa por inatividade.

## 9. Segurança e privacidade

- Dados pessoais: e-mail e nome do provedor social (no `auth.users`, gerido pelo Supabase); apelido. Nada mais.
- A chave anônima do Supabase fica no cliente; RLS é a única barreira e é testada no CI.
- RPCs `security invoker`, exceto `excluir_conta` (`security definer` com `auth.uid()` fixo e `search_path` definido).
- Importação: limite de tamanho, validação zod, nenhum texto renderizado como HTML.
- Exclusão: cascata apaga jogadas, estado e progresso; IndexedDB limpo no cliente.

## 10. Implantação

- Habilitar login anônimo e provedores Google e GitHub no projeto Supabase (configuração documentada no README do `supabase/`).
- Migração aplicada por `supabase db push` no CI ao fazer merge em `main`, antes do deploy da Vercel.
- Sem feature flag: é fundação do MVP.
- Rollback: reverter deploy da Vercel; a migração é aditiva.

## 11. Checagem contra a constituição

Nenhum princípio violado. Princípios 7 (aliases), 13 (plano gratuito), 15 (offline), 16 (RLS testada) e 17 (dados mínimos, exclusão) atendidos diretamente.
