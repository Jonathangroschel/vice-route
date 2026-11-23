# Spec-Driven Development: como trabalhamos

A spec é a fonte da verdade. O código é a implementação verificável dela. Este diretório guarda o processo, os modelos e o catálogo de specs. Mesmo padrão do Zovix, compatível com o GitHub Spec Kit.

## Estrutura

```
specs/
  constituicao.md            princípios inegociáveis (lidos antes de toda spec)
  README.md                  este arquivo
  _template/                 modelos de spec.md, plan.md e tasks.md
  NNN-nome-da-feature/
    spec.md                  O QUÊ e POR QUÊ (sem tecnologia)
    plan.md                  COMO (pacotes, dados, contratos, testes)
    tasks.md                 passos pequenos, ordenados e verificáveis
```

Cenários-ouro do motor e do agente ficam em `golden/` na raiz, porque são compartilhados por várias specs.

## Fluxo por funcionalidade

| Etapa | Artefato | Critério de saída |
|---|---|---|
| 1. Especificar | `spec.md` | Histórias com critérios de aceite testáveis; nenhuma marca `[A ESCLARECER]` bloqueante |
| 2. Planejar | `plan.md` | Checagem contra a constituição; esquema e contratos definidos; estratégia de teste |
| 3. Fatiar | `tasks.md` | Cada tarefa cabe em um PR pequeno e tem verificação objetiva |
| 4. Implementar | Código + testes + cenários-ouro | Critérios de aceite passam; CI verde |
| 5. Validar | Registro no `spec.md` | Demonstração no preview da Vercel |

Regras práticas:

- A spec descreve comportamento observável. Stack, tabelas e bibliotecas ficam no plano.
- Dúvida não resolvida vira `[A ESCLARECER: pergunta]`. Não se adivinha requisito.
- Funcionalidade que toca o motor ou o agente tem cenários-ouro (`CO-NNN-xx`) que viram teste permanente.
- Mudança de comportamento começa alterando a spec, não o código.
- Com agente de codificação, a sequência é a mesma: o agente recebe constituição + spec + plano e executa as tarefas.

## Definition of Ready

- Histórias priorizadas (P1, P2, P3) e independentes entre si
- Critérios de aceite em formato Dado/Quando/Então
- Requisitos não funcionais com número
- Casos de borda listados
- Dependências de outras specs declaradas

## Definition of Done

- Critérios de aceite automatizados
- Cenários-ouro passando no CI
- RLS e teste de acesso cruzado, se toca dado de usuário
- Funciona offline, se a tela marca progresso
- Doc afetado em `docs/` atualizado

## Catálogo de specs

| # | Spec | Escopo resumido | Depende de | Fase |
|---|---|---|---|---|
| 001 | [Catálogo e grafo](001-catalogo-grafo/spec.md) | Esquema zod, `data/*.yaml`, validações, compilação, versões, aliases | — | MVP |
| 002 | [Levantamento e importação](002-levantamento-importacao/spec.md) | Importador do Vice Atlas, relatório de diferenças, levantamento assistido de missões e gatilhos | 001 | MVP |
| 003 | [Contas e progresso](003-contas-progresso/spec.md) | Auth anônima e social, jogadas, estado da jogada, progresso offline e sync, RLS | 001 | MVP |
| 004 | [Mapa interativo](004-mapa-interativo/spec.md) | Tiles, agrupamento, camadas, busca, detalhe, marcar | 001, 003 | MVP |
| 005 | [Checklist e 100%](005-checklist-100/spec.md) | Aba Progresso, contadores por categoria | 001, 003 | MVP |
| 006 | [Missões e dependências](006-missoes-dependencias/spec.md) | Principais por capítulo, secundárias, ocultas, gatilhos, árvore | 001, 003, 008 | MVP |
| 007 | [Perdíveis e capítulo](007-perdiveis-capitulo/spec.md) | Painel de perdíveis, alerta de ponto sem retorno, checklist do capítulo | 003, 008 | MVP |
| 008 | [Motor de recomendação](008-motor-recomendacao/spec.md) | Classificação, risco, valor, pontuação, motivos, cenários-ouro | 001 | MVP |
| 009 | [Spoilers](009-spoilers/spec.md) | Níveis 0 a 3, teto global, revelar caso a caso | 001, 003 | MVP |
| 010 | [Contribuição](010-contribuicao/spec.md) | Confirmar, reportar, sugerir; reportes → issues; confirmações → PR | 001, 003 | MVP |
| 011 | [Planejador de sessão](011-planejador-sessao/spec.md) | Rota por posição e tempo (orientação) | 004, 008 | V2 |
| 012 | [Agente de IA](012-agente-ia/spec.md) | Chave do jogador, ferramentas do motor, spoiler antes do modelo | 008, 009 | V2 |
| 013 | [Sync por captura](013-sync-captura/spec.md) | Captura da tela do jogo → revisão → marcar | 003, 012 | V2 |
| 014 | [Calibração pela comunidade](014-calibracao-comunidade/spec.md) | Agregados anônimos → `priors.json` diário | 003, 008 | V2 |

Têm plano técnico e tarefas as specs do caminho crítico do MVP: 001, 002, 003, 004 e 008. As demais têm `spec.md`; plano e tarefas são escritos quando entrarem na onda de construção ([docs/09-roadmap.md](../docs/09-roadmap.md)).
