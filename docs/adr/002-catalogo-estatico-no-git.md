# ADR 002: Catálogo estático, versionado no repositório

- **Status:** aceito
- **Data:** 23/11/2026

## Contexto

O catálogo (itens, missões, gatilhos, dependências, janelas) é o ativo central, é igual para todos os jogadores, muda por correções frequentes nas primeiras semanas e precisa receber contribuições da comunidade com revisão.

## Decisão

O catálogo vive em YAML em `data/`, validado por esquema zod e por cenários-ouro no CI, compilado no build para JSON estático com hash no nome e servido pela CDN da Vercel. Contribuições entram por pull request; reportes feitos no app viram issues por uma Action. O Supabase não guarda catálogo.

## Consequências

**Positivas**
- Revisão, histórico e reversão de graça (git)
- Preview da Vercel por PR mostra o mapa já com a alteração
- Leitura do catálogo não toca o banco: cabe no plano gratuito com folga
- Cliente faz cache por versão; funciona offline

**Negativas**
- Correção só aparece após merge e deploy (minutos, não segundos)
- Contribuidor sem git depende do caminho do app e de um curador
- Arquivo compilado precisa ficar pequeno; exige separar campos de exibição dos de curadoria (fontes, observações) no build
