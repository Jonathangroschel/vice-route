# ADR 001: Motor de recomendação determinístico no navegador

- **Status:** aceito
- **Data:** 23/11/2026

## Contexto

O produto precisa recomendar a cada jogador o próximo passo rumo aos 100%, considerando posição na campanha, itens concluídos, variáveis declaradas, posição no mapa e tempo disponível. O projeto é pessoal, sem orçamento, hospedado em planos gratuitos. Foram consideradas três abordagens:

1. LLM recebe estado + catálogo e recomenda
2. Modelo treinado (aprendizado supervisionado ou por reforço) prevê a melhor próxima ação
3. Motor determinístico sobre o grafo de progressão

## Decisão

Opção 3. Um pacote TypeScript puro (`packages/engine`) que classifica nós, mede risco de perda e valor de desbloqueio, pontua com pesos por perfil, roteiriza e gera motivos por template. Roda num Web Worker no navegador do jogador. Os artefatos que dependem só do catálogo são pré-calculados no build.

## Consequências

**Positivas**
- Exatidão em regra dura (perdíveis, pré-requisitos), verificável por cenários-ouro no CI
- Custo zero de processamento e de tokens; funciona offline
- Cada recomendação tem motivo explícito
- O agente de IA, quando ativado, usa as mesmas funções como ferramentas e não precisa "saber" o jogo

**Negativas**
- Pesos iniciais são palpite; exigem ajuste manual até a calibração da V2
- Perguntas abertas e explicações ricas ficam para o agente opcional
- Qualidade depende integralmente da qualidade do catálogo

## Por que não as outras

- **LLM recomendando:** custo por chamada, latência, alucinação de itens, contexto enorme se o catálogo for no prompt, e não é determinístico.
- **Modelo treinado:** não existem dados rotulados de "melhor sequência"; aprenderia aproximações de regras que já conhecemos com exatidão. Pode voltar como calibração (V2, spec 014) ou modelo pequeno no navegador, se houver evidência de ganho.
