# Plano técnico NNN: [Nome da funcionalidade]

- **Spec:** [link para spec.md]
- **Status:** rascunho | aprovado

## 1. Resumo da abordagem

Três a seis frases: como a spec será atendida e por que este desenho.

## 2. Módulos afetados

| Módulo | Mudança |
|---|---|
| `packages/engine` | ... |

## 3. Contratos

- Esquema do catálogo: `packages/catalog-schema` (zod)
- Funções do motor: `packages/engine` (assinaturas públicas)
- Tabelas e RPCs do Supabase: `supabase/migrations/*.sql`
- Ferramentas do agente: `contracts/tools/*.ts`

Listar aqui o que é novo e o que muda de forma incompatível.

## 4. Modelo de dados

Arquivos do catálogo afetados e/ou tabelas, colunas, índices, políticas de RLS, migrações e plano de reversão.

## 5. Fluxos

Diagramas de sequência para o caminho feliz e para as falhas relevantes.

## 6. Decisões e alternativas descartadas

| Decisão | Alternativa | Por que não |
|---|---|---|

## 7. Estratégia de teste

- Unitário:
- Integração (com quais dublês):
- Contrato:
- Cenários-ouro do motor (CO-NNN-*):
- Desempenho (tempo de cálculo no navegador, tamanho do bundle):

## 8. Observabilidade e operação

Logs, métricas de uso relevantes, limites do plano gratuito afetados.

## 9. Segurança e privacidade

Dados pessoais tocados, RLS, chaves (BYOK), superfície de ataque nova.

## 10. Implantação

Feature flag, migração, ordem de deploy, critério de rollback.

## 11. Checagem contra a constituição

Itens violados (se houver) com justificativa e ADR.
