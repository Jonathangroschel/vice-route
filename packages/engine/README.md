# @vice-route/engine

Motor de recomendação determinístico (spec 008, docs/05). TypeScript puro, sem DOM, rede ou armazenamento: roda no navegador (Web Worker) e no Node.

## Uso

```ts
import { recomendar, proximosPassos, antesDeAvancar, checklistCapitulo, oQueFalta, pertoDeMim } from '@vice-route/engine'

// catalog.json e precomputed.json gerados por `pnpm catalog:build`
const r = recomendar(catalogo, precomputed, {
  concluidos: ['item:acrobacias-001'],
  ultimaPrincipal: 'missao:principal-011',
  principalEmAndamento: null,
  personagem: 'lucia',
  variaveis: {},
  posicao: { x: 4975, y: 4128 },        // pixels da imagem-base; fica só no dispositivo
  perfil: 'cacador100',                  // cacador100 | equilibrio | historiaPrimeiro
  categoriasFavoritas: [],
  categoriasIgnoradas: ['eventos-aleatorios'],
  tetoSpoiler: 1,
  revelados: [],
})

proximosPassos(r, 10)                    // ranking com motivos e frases prontas
r.perdiveisPorMissao                     // o que some, agrupado pela missão que fecha
antesDeAvancar(precomputed, r, 'missao:principal-015')
oQueFalta(r, 'missao:oculta-x', { recursivo: true })
checklistCapitulo(catalogo, precomputed, r, 2)
pertoDeMim(catalogo, precomputed, r, { x: 4975, y: 4128 }, 600)
```

`serializar(r)` troca o `Map` de nós por array, para atravessar a fronteira do Worker.

## Como decide

1. **Normaliza**: aliases, fecho implícito da campanha (marcar a principal 12 conclui as anteriores) e pré-requisitos obrigatórios de nós concluídos. Janelas não implicam progresso: item marcado antes da janela gera o aviso `JANELA_SUSPEITA`.
2. **Classifica** cada nó em `concluido`, `perdido`, `futuro`, `bloqueado` ou `disponivel`, com os átomos que faltam. `qualquer` e `pelo_menos` escolhem as alternativas de menor duração; uma escolha já feita (`nao`) ou um pré-requisito perdido vira `perdido` com `CAMINHO_EXCLUIDO`.
3. **Risco**: missões principais até o nó sumir; pré-requisitos de um perdível herdam a urgência dele.
4. **Pontua** com os pesos do perfil (`src/pesos.ts`) e **ordena**: o que some na próxima principal vai sempre para o topo; depois pontuação; empate por ID.
5. **Explica** com motivos codificados e frases em pt-BR, trocando nomes acima do teto de spoiler por rótulos neutros.

## Cenários-ouro

Arquivos `golden/motor/*.yaml` usam catálogos de `golden/catalogo/<nome>/data` (ou `real` para `data/`):

```yaml
id: CO-008-06
descricao: Perdível na próxima principal fica acima do não perdível colado no jogador
catalogo: campanha-linear
estado: { ultimaPrincipal: 'missao:principal-004', posicao: { x: 900, y: 900 } }
espera:
  posicao_em_proximos: { 'item:easter-eggs-c': 1 }
  acima_de: [['item:easter-eggs-c', 'item:easter-eggs-b']]
  motivo: { 'item:easter-eggs-c': PERDIVEL_EM }
```

Asserções aceitas: `status`, `em_risco`, `posicao_em_proximos`, `acima_de`, `fora_de_proximos`, `em_perdiveis`, `motivo`, `o_que_falta`, `faltante_tipo`, `antes_de_avancar`, `texto_contem`, `texto_nao_contem`. Rodam em `pnpm test`.
