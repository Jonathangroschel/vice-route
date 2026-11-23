# 07. Interface web

Mobile-first, tema escuro por padrão (como a referência), com tema claro opcional. O uso típico é o celular ao lado do console; o desktop recebe o mesmo layout com painel lateral em vez de folha inferior.

## 1. Estrutura de navegação

```
┌───────────────────────────────┐
│  Mapa (tela principal)        │   ← sempre ao fundo
│                               │
│  [⚠ alerta de perdível]       │   ← faixa fixa quando há perdível na próxima missão
│                               │
├───────────────────────────────┤
│  Folha inferior (arrastável)  │   ← três alturas: recolhida / média / cheia
│  Busca · olho (camadas) · ▾   │
│  Abas: Progresso | Próximos | │
│        Missões | Capítulo     │
└───────────────────────────────┘
Menu: Jogadas · Estado da jogada · Agente (V2) · Contribuir · Configurações · Sobre
```

## 2. Telas

| Tela | Conteúdo | Spec |
|---|---|---|
| **Mapa** | Tiles, marcadores por categoria com agrupamento (anel colorido por categoria, como na referência), filtro de camadas, ocultar concluídos, toque no marcador abre o detalhe | 004 |
| **Progresso** (aba) | Contador "X / N achados", anel de % do 100% (pela regra de cada categoria), barra segmentada, lista de categorias com coletado, total e exigido | 005 |
| **Próximos** (aba) | Ranking do motor com motivos; seletor de perfil; botão "perto de mim" | 008 |
| **Missões** (aba) | Principais em ordem por capítulo, secundárias e ocultas; filtro por personagem e status; cada missão abre a árvore de dependências | 006 |
| **Capítulo** (aba) | Perdíveis agrupados pela missão que os fecha; "antes de ir para o capítulo seguinte" | 007 |
| **Detalhe do nó** | Nome (com spoiler), categoria, região, status, dicas, "o que falta", condições de momento, fontes e confiança, botões marcar / confirmar / reportar | 004, 006, 010 |
| **Alerta de ponto sem retorno** | Ao mudar a missão atual para uma que fecha itens: lista do que será perdido, com "ver no mapa" e "avançar mesmo assim" | 007 |
| **Estado da jogada** | Última missão principal concluída, personagem, variáveis declaradas, perfil, posição | 003, 008 |
| **Jogadas** | Lista de saves, criar, renomear, duplicar, excluir, exportar/importar JSON | 003 |
| **Planejador de sessão** (V2) | Posição + tempo disponível → rota numerada no mapa e lista ordenada; marcar conforme avança | 011 |
| **Agente** (V2) | Chat com cartões de itens clicáveis; configuração da chave | 012 |
| **Sincronizar por captura** (V2) | Enviar print da tela de estatísticas → revisão do que será marcado | 013 |
| **Contribuir** | Reportar erro, sugerir item, confirmar item; link para o guia de PR | 010 |
| **Configurações** | Nível de spoiler, tema, idioma, conta, exclusão de conta | 003, 009 |

## 3. Comportamentos transversais

- **Marcar é um toque**: no marcador do mapa (toque longo) ou na linha da lista. Desfazer por 5 s.
- **Faixa de alerta x "em risco"**: a faixa fixa no mapa avisa só sobre o que some na **próxima** missão principal (princípio 2). O atributo "em risco" do motor olha K missões à frente (padrão 2) e aparece nas abas Próximos e Capítulo, não na faixa.
- **Spoiler**: nome escondido aparece como "Missão secundária · capítulo 3" com botão "revelar" (spec 009).
- **Selos de confiança**: `não confirmado`, `contestado` e "reporte em análise" (view pública de reportes) com ícone e texto curto.
- **Offline**: indicador discreto; marcações pendentes de sincronização com ícone.
- **Deep link**: `/no/<id>` abre o mapa centrado no nó; `/jogada/<id>/capitulo/<n>` abre o painel.
- **Acessibilidade**: cada cor de categoria acompanha ícone e rótulo; foco visível; alvos de toque de 44 px.

## 4. Fora do escopo da interface

- Editor visual do grafo (a curadoria edita YAML por PR)
- Painel de moderação no app
