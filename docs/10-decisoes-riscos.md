# 10. Decisões, riscos e perguntas em aberto

## 1. Decisões

| # | Decisão | Alternativa descartada | Por quê | ADR |
|---|---|---|---|---|
| D1 | Motor de recomendação determinístico, rodando no navegador | LLM recomendando a partir do estado; modelo treinado | Regras são conhecidas; exatidão em perdíveis; custo zero; explicável | [001](adr/001-motor-deterministico-no-cliente.md) |
| D2 | Catálogo em YAML no repositório, compilado para JSON estático | Catálogo em tabelas do Supabase com painel de edição | Revisão por PR, histórico, preview, CDN; banco pequeno no plano gratuito | [002](adr/002-catalogo-estatico-no-git.md) |
| D3 | Agente opcional com chave do jogador, chamado do navegador | Chave do projeto com proxy | Custo zero, sem guardar segredo de terceiros | — |
| D4 | Nuxt 4 + pnpm + Turborepo, como no Zovix | Next.js | Padrão já usado nos outros projetos | — |
| D5 | Leaflet com `CRS.Simple` | MapLibre GL | Posições em pixels da imagem-base, sem projeção; volume de marcadores (~2 mil) cabe em Leaflet com agrupamento | — |
| D6 | Curadoria por PR no GitHub | Moderação no app | Menos código; o fluxo de revisão já existe e é público | — |
| D7 | Calibração por estatística offline (Action diária) | Modelo online ou treinado | Sem dados rotulados no início; mantém custo zero | — |
| D8 | Posições em pixels do mapa oficial da Rockstar (mesma base do Vice Atlas); tiles próprios na Vercel | Coordenadas do jogo; tiles em R2 ou GitHub Pages; tiles de terceiros | Sem fonte pública de coordenadas do jogo; importação direta do Vice Atlas; pirâmide de ~20 MB cabe na Vercel | [003](adr/003-coordenadas-imagem-base.md) |
| D9 | Regra de 100% por categoria (mínimo de itens ou de conjuntos) | 100% = soma de todos os itens | O checklist do jogo pede só parte da maioria das categorias | — |
| D10 | Pinos importados do Open GTA 6 Map e limiares do GTA6Maps (ambos CC BY 4.0), com crédito; Vice Atlas e sites de guia só para conferência | Levantamento manual de todos os pinos; copiar dados sem licença | ~3,8 mil locais já publicados com licença aberta; respeita a licença de cada fonte | — |

## 2. Riscos

| Risco | Prob. | Impacto | Mitigação |
|---|---|---|---|
| Dados de missões, gatilhos e janelas incompletos nas primeiras semanas | Alta | Alto | Status de confiança visível; levantamento contínuo; comunidade por PR e reporte |
| Formato do JSON do Vice Atlas muda (`Map Data Schema v1`) ou deixa de ser acessível | Média | Médio | Importação offline com cache bruto; o catálogo já está no repositório |
| Dados abertos com confiança só "comunidade" e sem `source_urls` | Alta | Médio | Status `referencia`, selo na interface, conferência cruzada com GTA6Maps, Vice Atlas e guias; confirmações dos jogadores (spec 010) |
| Fonte aberta muda IDs, licença ou some | Baixa | Alto | Commit fixado na importação; `id_fonte` guardado; o catálogo já está no nosso repositório |
| Divergência de totais e perdíveis entre fontes (ex.: GTA6Maps diz que não há perdíveis; guias listam vários) | Alta | Médio | Registrar as duas fontes, valer a mais conservadora, cenário-ouro para cada perdível |
| Takedown por uso de dados ou arte de terceiros (tiles, posições) | Média | Alto | Projeto pessoal e não comercial; imagem-base oficial com créditos à Rockstar; tiles em pasta própria e versionada por edição, fáceis de trocar; ícones próprios |
| Supabase pausado por inatividade | Média | Médio | Action agendada mantém o projeto ativo; app funciona offline enquanto isso |
| Cota da Vercel estourada pelos tiles | Baixa | Médio | Pirâmide pequena (~20 MB), cache longo; R2 como plano B |
| Curador vira gargalo | Alta | Médio | Validação automática forte; PR automático de confirmações; templates |
| Pesos da pontuação geram sugestões estranhas | Média | Baixo | Cenários-ouro; perfis; calibração V2 |
| Spoiler vazado em nome de missão | Média | Médio | Nível obrigatório no esquema; teste de spoiler nos cenários-ouro |

## 3. Perguntas em aberto

1. Pontos de controle da transformação afim entre o Open GTA 6 Map e a imagem-base (spec 002).
2. Ponto sem retorno do capítulo 1: *Tourist Trap* ou *Recalibration*?
3. Troca de personagem: livre ou imposta por missão ou capítulo?
4. Escala pixel → metro da imagem-base, para o planejador (spec 011).
5. Exigir conta social para reportar erro, ou permitir anônimo com limite mais baixo?
6. Número de confirmações independentes para promover um item a `confirmado` (proposta: 3).

Resolvidas em 23/11/2026:
- Nome do projeto: **Vice Route** (repositório `vice-route`), em inglês e no estilo do Vice Atlas, porque o app sai em pt-BR e inglês; "GTA" fica fora do nome por ser marca registrada.
- URL e formato dos dados do Vice Atlas: `vice-atlas.com/map-data/leonida.json`, Map Data Schema v1 (§1.1 do doc 02).
- Hospedagem dos tiles: Vercel, gerados da imagem oficial da Rockstar (D8, [ADR 003](adr/003-coordenadas-imagem-base.md)).
- Estrutura da campanha: capítulos explícitos e missões numeradas.
- Origem da captura de "901 achados": app independente montado sobre os dados abertos do Open GTA 6 Map (as categorias e totais batem; docs/02 §1.3).
- Fonte dos pinos de colecionáveis e atividades: Open GTA 6 Map, CC BY 4.0 (D10).
- Tela de progresso no jogo: existe (Progresso > Coleções e Progresso > Acrobacias), o que torna a spec 013 viável. O checklist de 100% abre depois da história.
