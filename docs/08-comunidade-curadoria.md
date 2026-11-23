# 08. Comunidade e curadoria

A comunidade participa desde o primeiro dia por dois caminhos, ambos terminando no mesmo lugar: um pull request que altera `data/` e passa pelo CI.

## 1. Dois caminhos de contribuição

| Caminho | Para quem | Como |
|---|---|---|
| **No app** | Qualquer jogador, sem conhecer git | Botões no detalhe do nó: **confirmar**, **reportar erro** (posição, nome, requisito, janela, duplicado, não existe), **sugerir item novo** (toque no mapa + formulário) |
| **Pull request** | Quem conhece git ou quer documentar uma cadeia inteira (missão oculta, gatilhos) | Editar YAML em `data/`, abrir PR; o CI valida e a Vercel gera um preview com o mapa já alterado |

## 2. Do app para o catálogo

```
Jogador reporta no app ──► tabela reportes (Supabase)
                                │ GitHub Action agendada (diária) ou manual
                                ▼
                      Issue no GitHub por nó (agrupando reportes do mesmo nó)
                                │ curador avalia
                                ▼
                      PR alterando data/ ──► CI ──► preview ──► merge ──► nova versão do catálogo
                                │
                      reportes marcados como resolvidos, com link da versão
```

- **Confirmações** não geram issue. São contadas por nó numa view agregada; ao atingir N confirmações independentes (proposta: 3), uma Action abre um PR mudando `status` para `confirmado`.
- **Reportes repetidos** sobre o mesmo campo do mesmo nó viram uma única issue com contagem.
- Limites por usuário (ex.: 30 reportes por dia) e contas anônimas só confirmam, não reportam. [A ESCLARECER: exigir conta social para reportar?]

## 3. Papéis

| Papel | Quem | Pode |
|---|---|---|
| Jogador | Qualquer conta, inclusive anônima | Marcar progresso, confirmar itens |
| Contribuidor | Conta social | Reportar, sugerir itens; crédito por apelido nas notas da versão |
| Curador | Mantenedores com permissão no repositório | Revisar e fazer merge de PRs, publicar versões do catálogo |

## 4. Versões do catálogo

- Cada merge em `main` que altera `data/` gera uma versão (`AAAA.MM.DD-N`) e notas automáticas (itens adicionados, corrigidos, confirmados, depreciados).
- O app mostra "Catálogo atualizado: 12 correções" com link para as notas.
- Nunca se apaga um ID: remoção vira `status: depreciado`; fusão de duplicados usa `aliases`. O progresso de quem marcou o ID antigo migra sozinho (princípio 7).

## 5. Guia do contribuidor (resumo para o CONTRIBUTING.md)

1. Um PR por assunto (uma categoria, uma cadeia de missão)
2. Toda alteração com `fontes[]` (URL ou "jogado em <data>, plataforma")
3. Respeitar o nível de spoiler: nome de missão é no mínimo nível 2
4. Rodar `pnpm catalog:check` localmente (esquema, referências, ciclos, cenários-ouro)
5. Conferir o preview da Vercel antes de pedir revisão

## 6. Riscos

| Risco | Mitigação |
|---|---|
| Vandalismo (posições falsas) | Nada entra sem PR revisado; contas anônimas não reportam |
| Spam de reportes | Limite por usuário, agrupamento por nó |
| Curador como gargalo | Templates de PR, validação automática forte, confirmações automáticas viram PR pronto |
| Divergência com a referência | Importador re-executável mostra a diferença entre a referência e o catálogo (spec 002) |
