# Spec NNN: [Nome da funcionalidade]

- **Status:** rascunho | em revisão | aprovada | implementada
- **Responsável:** [nome]
- **Depende de:** [specs]
- **Última revisão:** [data]

## 1. Contexto e problema

Que problema resolvemos, para quem, e por que agora. Duas a cinco frases.

## 2. Objetivos e não objetivos

**Objetivos**
- ...

**Fora do escopo**
- ...

## 3. Histórias de usuário

Cada história é independente e entregável sozinha. Ordenar por prioridade.

### H1 (P1): [título]

Como [persona], quero [capacidade], para [resultado].

**Critérios de aceite**
1. Dado [contexto], quando [ação], então [resultado observável].
2. ...

### H2 (P2): ...

## 4. Requisitos funcionais

| ID | Requisito |
|---|---|
| RF-NNN-01 | O sistema DEVE ... |
| RF-NNN-02 | O sistema DEVE ... |

Use DEVE, NÃO DEVE, PODE. Marque dúvidas como `[A ESCLARECER: pergunta]`.

## 5. Requisitos não funcionais

| ID | Requisito | Meta |
|---|---|---|
| RNF-NNN-01 | Latência ... | p95 < X |
| RNF-NNN-02 | Disponibilidade ... | X % |

## 6. Casos de borda e falhas

- O que acontece quando ...?

## 7. Entidades e eventos (conceitual)

Sem esquema físico. Só o que existe e como se relaciona.

## 8. Cenários-ouro (se toca o motor ou o agente)

| ID | Estado de entrada | Resultado esperado | Como é verificado |
|---|---|---|---|
| CO-NNN-01 | ... | ... | asserção determinística no motor / rubrica para o agente |

## 9. Métricas de sucesso

Como saberemos, em produção, que funcionou.

## 10. Checagem contra a constituição

- [ ] Ajuda a decidir o próximo passo (princípio 1)
- [ ] Perdíveis avisados antes (2) e nível de spoiler respeitado (3)
- [ ] Funciona sem IA e sem token (4)
- [ ] Dado com origem, confiança e ID estável (6, 7)
- [ ] Decisão no motor determinístico, não no modelo (9, 11)
- [ ] Cabe no plano gratuito (13)
- [ ] RLS e teste de acesso cruzado, se toca dado de usuário (16)

## 11. Perguntas em aberto

- ...
