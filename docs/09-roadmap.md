# 09. Roadmap

Duas fases. Prazos são estimativas para uma pessoa com agente de codificação, em tempo parcial.

## Fase MVP: mapa, missões e perdíveis com recomendação sem IA (6 a 8 semanas)

**Objetivo:** paridade com a referência (mapa + checklist) e o diferencial essencial: missões com dependências, alerta de perdíveis e próximos passos calculados no navegador.

| Onda | Entregas | Specs |
|---|---|---|
| 0. Fundação (semana 1) | Monorepo, CI, Vercel + Supabase, esquema do catálogo, primeiro `catalog:check` | 001 |
| 1. Dados (semanas 1 a 3, contínua) | Importador do Vice Atlas, categorias e itens de mapa; espinha da campanha; primeira leva de secundárias, ocultas, gatilhos e janelas | 002 |
| 2. Jogador (semanas 2 a 4) | Contas anônimas e sociais, jogadas, progresso offline e sync | 003 |
| 3. Mapa e progresso (semanas 3 a 5) | Mapa com camadas e agrupamento, detalhe, marcar, aba Progresso | 004, 005 |
| 4. Motor (semanas 4 a 6) | `packages/engine`, cenários-ouro, aba Próximos | 008 |
| 5. Missões e perdíveis (semanas 5 a 7) | Aba Missões com árvore, aba Capítulo, alerta de ponto sem retorno | 006, 007 |
| 6. Transversal (semanas 6 a 8) | Spoilers em todas as telas, contribuir no app, Action de reportes → issues | 009, 010 |

**Caminho crítico:** 001 → 002 (dados suficientes para testar) → 008 → 007. Sem dados de janelas e dependências, o motor não tem o que recomendar.

**Critérios de saída do MVP**
- 100% dos itens da referência no catálogo, com posição e categoria
- Missões principais completas em ordem, com capítulo
- Pelo menos 80% das secundárias e ocultas conhecidas publicamente, com gatilhos e janelas
- Alerta de perdível funcionando em todos os cenários-ouro de perdíveis
- Recomendações < 100 ms em celular intermediário
- Custo de infraestrutura zero

## Fase V2: planejador, agente opcional e calibração (4 a 6 semanas)

| Entregas | Specs |
|---|---|
| Planejador de sessão com rota otimizada (orientação) | 011 |
| Agente de IA opcional com chave do jogador | 012 |
| Sincronização de progresso por captura de tela (via agente) | 013 |
| Calibração das recomendações com dados agregados da comunidade | 014 |

Ordem sugerida: 011 (maior valor sem custo) → 014 (precisa de algumas semanas de dados de uso) → 012 → 013.

**Critérios de saída da V2**
- Rota de sessão gerada em < 200 ms, aceita (pelo menos metade dos itens marcados) em 40% das sessões
- Agente responde citando só IDs válidos em 100% dos cenários de `golden/agente/`
- `priors.json` publicado diariamente, com durações medianas para pelo menos 70% dos nós

## Fora das duas fases

PSN e troféus, Rockstar Social Club, app nativo, moderação dentro do app, GTA Online. Ver [01-visao-produto.md](01-visao-produto.md) §9.
