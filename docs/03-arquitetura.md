# 03. Arquitetura

## 1. Princípio: estático primeiro, motor no cliente

Três escolhas definem a arquitetura e mantêm o projeto no plano gratuito:

1. **O catálogo é estático.** Itens, missões, gatilhos e dependências vivem em YAML no repositório, são validados e compilados no build e servidos como JSON pela CDN da Vercel. Não existe consulta ao banco para ler o catálogo.
2. **O motor roda no navegador.** Disponibilidade, perdíveis, recomendações e rotas são calculados num Web Worker com o catálogo e o progresso locais. O servidor não processa nada por usuário.
3. **O banco só guarda o que é do jogador.** Supabase cuida de autenticação, progresso, estado da jogada e reportes. É pouco dado por usuário (alguns KB).

```
┌───────────────────────────── GitHub (repo público) ─────────────────────────────┐
│ data/*.yaml ──► CI: validar esquema ► compilar ► pré-calcular ► cenários-ouro    │
│ PR da comunidade ─► preview na Vercel ─► revisão do curador ─► merge             │
└──────────────────────────────────────┬──────────────────────────────────────────┘
                                       │ deploy
┌──────────────── Vercel (CDN) ────────▼──────────────┐      ┌──── Supabase ─────┐
│ App Nuxt (SSR mínimo + SPA)                         │      │ Auth (social,     │
│ /catalog/<versao>/catalog.json, precomputed.json    │      │   anônimo)        │
│ tiles do mapa (imagem oficial, ~20 MB)              │      │ Postgres + RLS:   │
└──────────────────────────┬──────────────────────────┘      │  jogadas,         │
                           │                                 │  progresso,       │
┌──────────────── Navegador do jogador ───────────────┐      │  estado, reportes │
│ UI (mapa, listas, painéis)                          │◄────►│                   │
│ IndexedDB: catálogo em cache, progresso, fila sync  │ sync └───────────────────┘
│ Web Worker: motor (packages/engine)                 │
│ Agente opcional ──────── chave do jogador ──────────┼────► API da Anthropic
└─────────────────────────────────────────────────────┘      (direto do navegador)
```

## 2. Stack

Mesmo padrão do Zovix: TypeScript em tudo, monorepo pnpm + Turborepo, Nuxt 4 (Vue 3), Vitest, ESLint, Prettier.

| Camada | Escolha | Motivo |
|---|---|---|
| App web | Nuxt 4 na Vercel | Padrão dos outros projetos; deploy de preview por PR |
| Mapa | Leaflet com `CRS.Simple` + Supercluster | Posições em pixels da imagem-base, sem projeção geográfica ([ADR 003](adr/003-coordenadas-imagem-base.md)); agrupamento como na referência |
| Estado e cache local | Pinia + IndexedDB (via `idb`) | Funciona offline; catálogo e progresso persistentes |
| Motor | `packages/engine`, TS puro, rodando em Web Worker (Comlink) | Determinístico, testável em Node, não trava a interface |
| Esquema do catálogo | `packages/catalog-schema` com zod | Um só esquema para validação no CI, tipos no app e no motor |
| Build do catálogo | `packages/catalog-build` (CLI) | YAML → JSON compilado + artefatos pré-calculados |
| Banco e auth | Supabase (Postgres, Auth, RLS) | Plano gratuito, login social e anônimo |
| Agente (opcional) | API da Anthropic chamada do navegador com a chave do jogador | Custo zero para o projeto; ver [06-agente-ia.md](06-agente-ia.md) |
| CI | GitHub Actions | Validação de dados, testes, cenários-ouro |

## 3. Estrutura do repositório

```
vice-route/
  apps/
    web/                    Nuxt 4: páginas, componentes, worker do motor
      public/tiles/<edicao>/  pirâmide z/x/y.webp gerada por tooling/tiles
  packages/
    catalog-schema/         zod: Nó, Aresta, Condição, Categoria, Região, Capítulo
    engine/                 motor puro: estado, disponibilidade, risco, pontuação, rota
    catalog-build/          CLI: validar, compilar, pré-calcular, gerar relatório
  data/                     catálogo em YAML (fonte da verdade)
    mapa.yaml               imagem-base (edição, tamanho, recorte, tiles, escala)
    categorias.yaml         inclui a regra de 100% de cada categoria
    regioes.yaml
    capitulos.yaml
    itens/<categoria>.yaml
    missoes/{principais,secundarias,ocultas}.yaml
    gatilhos.yaml
    marcos.yaml
    variaveis.yaml
  tooling/
    importers/vice-atlas/   importador offline do map-data JSON (spec 002)
    tiles/                  gera a pirâmide de tiles a partir da imagem oficial
  supabase/
    migrations/             tabelas, RLS, RPCs
  golden/                   cenários-ouro do motor (estado → resultado esperado)
  docs/  specs/
```

## 4. Catálogo compilado

O `catalog-build` produz, por versão do catálogo:

| Artefato | Conteúdo | Tamanho estimado |
|---|---|---|
| `manifest.json` | versão, hash de cada arquivo, data | < 1 KB |
| `catalog.json` | nós, arestas, categorias, regiões, capítulos (só campos de exibição e motor) | 300 a 600 KB (gzip ~80 KB) para ~2 mil nós |
| `precomputed.json` | descendentes transitivos por nó, valor de desbloqueio, perdíveis por missão principal, clusters por região, ordem topológica | 100 a 200 KB |
| `search-index.json` | índice de busca (nome, alias, categoria) | ~100 KB |
| `priors.json` (V2) | durações medianas e ordens frequentes vindas da comunidade (spec 014) | < 100 KB |

O app baixa o `manifest`, compara o hash com o cache do IndexedDB e só baixa o que mudou. A versão do catálogo é gravada junto com cada marcação de progresso, para migrar IDs depreciados.

## 5. Dados no Supabase

Visão conceitual; o esquema físico fica nos planos das specs 003 e 010.

| Tabela | Conteúdo |
|---|---|
| `perfis` | id do usuário, apelido, preferências (nível de spoiler, perfil de recomendação) |
| `jogadas` | uma conta pode ter várias jogadas (saves): nome, plataforma, criada em |
| `estado_jogada` | última missão principal concluída, principal em andamento (para janelas com `momento: inicio`), personagem, variáveis declaradas (escolhas, propriedades), perfil de recomendação. A posição do jogador no mapa fica só no dispositivo (princípio 17) |
| `progresso` | (jogada, nó, concluído, quando, origem: `manual` / `sugestao` / `captura` / `importacao`). Conclusões implícitas (fecho da campanha) não são gravadas: o motor as deriva. `sugestao` é gravada quando o jogador marca a partir de um cartão do motor (abas Próximos, Capítulo, planejador); a spec 014 usa esse sinal |
| `reportes` | erro ou sugestão sobre um nó: tipo, texto, coordenada proposta, status |
| `confirmacoes` | jogador confirma que o item existe onde está; alimenta o status `confirmado` |

Todas com RLS por `auth.uid()`. Reportes e confirmações são legíveis em forma agregada (contagem por nó) por uma view pública.

## 6. Sincronização e offline

- Marcar um item grava no IndexedDB na hora e entra numa fila de operações.
- A fila é enviada ao Supabase em lote (upsert por `(jogada, no)` com carimbo de tempo da operação).
- Conflito: vence a operação mais recente por nó. Desmarcar é uma operação (`concluido = false`), nunca exclusão.
- Sem login, o jogador usa uma sessão anônima do Supabase; ao entrar com conta social, a sessão é vinculada e nada se perde.

## 7. Limites do plano gratuito (hipóteses a conferir)

| Serviço | Limite relevante | Mitigação |
|---|---|---|
| Supabase | 500 MB de banco, 50 mil usuários ativos/mês; projeto pausa após 7 dias sem uso | Linhas pequenas; ação agendada no GitHub para manter o projeto ativo |
| Vercel Hobby | Uso pessoal e não comercial; cota mensal de transferência | Catálogo e tiles (~20 MB no total, ~1 a 3 MB por sessão) com cache longo e versão no caminho |
| API da Anthropic | Não se aplica ao projeto | Chave do jogador (BYOK) |

## 8. Segurança

- Chave anônima do Supabase no cliente; toda proteção é RLS.
- Chave de API do jogador fica só no IndexedDB do navegador dele, nunca vai ao Supabase nem a logs.
- Conteúdo de contribuições é texto puro; nada é renderizado como HTML.
- Testes de RLS (usuário A não lê nem escreve progresso de B) no CI.
