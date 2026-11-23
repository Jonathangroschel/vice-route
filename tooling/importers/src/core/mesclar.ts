import type { Fonte, NoEntrada } from '@vice-route/catalog-schema'

/** Item normalizado vindo de uma fonte, antes de virar nó do catálogo. */
export interface ItemFonte {
  id_fonte: string
  categoria: string
  subtipo: 'colecionavel' | 'atividade' | 'crime'
  conjunto?: string
  nome: string
  posicao: { x: number; y: number }
  regiao?: string
  dica?: string
  status: 'referencia' | 'nao_confirmado'
  fonte: Fonte
}

export type Resultado = 'novo' | 'mantido' | 'movido' | 'atualizado'

export interface Mesclagem {
  nos: NoEntrada[]
  resultados: {
    id: string
    id_fonte: string
    categoria: string
    resultado: Resultado
    deslocamento?: number
  }[]
  ausentes: { id: string; id_fonte: string; removido_na_fonte: boolean }[]
}

const LIMITE_MOVIDO_PX = 5

/**
 * Mescla itens de uma fonte com os nós existentes (spec 002 H2):
 * - casa pelo `ids_fonte[fonte]` (chave estável), nunca por posição quando há chave
 * - campos de fonte (nome_original, posição não confirmada, regiao, a própria fonte) são atualizados
 * - campos de curadoria (nome traduzido, dicas, requer, janelas, status confirmado...) são preservados
 * - itens ausentes na fonte nunca são removidos; vão para o relatório
 * - IDs novos: item:<categoria>-<NNN>, seguindo a numeração existente (sem reaproveitar)
 */
export function mesclar(
  nomeFonte: string,
  existentes: NoEntrada[],
  itens: ItemFonte[],
  removidosNaFonte: Set<string>,
): Mesclagem {
  const porChave = new Map<string, NoEntrada>()
  for (const n of existentes) {
    const k = n.ids_fonte?.[nomeFonte]
    if (k) porChave.set(k, n)
  }
  const usados = new Set<string>(existentes.flatMap((n) => [n.id, ...(n.aliases ?? [])]))
  const proximo = new Map<string, number>()
  const novoId = (categoria: string) => {
    let n = proximo.get(categoria) ?? 1
    while (usados.has(`item:${categoria}-${String(n).padStart(3, '0')}`)) n++
    const id = `item:${categoria}-${String(n).padStart(3, '0')}`
    usados.add(id)
    proximo.set(categoria, n + 1)
    return id
  }

  const resultados: Mesclagem['resultados'] = []
  const vistos = new Set<string>()
  const saida = new Map<string, NoEntrada>(existentes.map((n) => [n.id, n]))
  const ordenados = [...itens].sort(
    (a, b) =>
      a.categoria.localeCompare(b.categoria) ||
      a.id_fonte.localeCompare(b.id_fonte, 'en', { numeric: true }),
  )

  for (const it of ordenados) {
    vistos.add(it.id_fonte)
    const anterior = porChave.get(it.id_fonte)
    const fontes = (anteriores: Fonte[] = []) => [
      ...anteriores.filter((f) => f.nome !== it.fonte.nome),
      it.fonte,
    ]
    const posicao = {
      x: it.posicao.x,
      y: it.posicao.y,
      qualidade: 'aproximada' as const,
      representa: 'ponto' as const,
    }
    if (!anterior) {
      const id = novoId(it.categoria)
      saida.set(id, {
        id,
        tipo: 'item',
        subtipo: it.subtipo,
        categoria: it.categoria,
        ...(it.conjunto ? { conjunto: it.conjunto } : {}),
        nome: it.nome,
        ...(it.regiao ? { regiao: it.regiao } : {}),
        posicao,
        spoiler: 1,
        ...(it.dica ? { dicas: [{ texto: it.dica, spoiler: 1 }] } : {}),
        fontes: [it.fonte],
        ids_fonte: { [nomeFonte]: it.id_fonte },
        status: it.status,
      })
      resultados.push({ id, id_fonte: it.id_fonte, categoria: it.categoria, resultado: 'novo' })
      continue
    }
    const confirmado =
      anterior.status === 'confirmado' || anterior.posicao?.qualidade === 'verificada'
    const desloc = anterior.posicao
      ? Math.hypot(anterior.posicao.x - posicao.x, anterior.posicao.y - posicao.y)
      : Infinity
    const nomeFoiTraduzido = anterior.nome !== (anterior.nome_original ?? anterior.nome)
    const atualizado: NoEntrada = {
      ...anterior,
      categoria: it.categoria,
      ...(it.conjunto ? { conjunto: it.conjunto } : {}),
      ...(nomeFoiTraduzido ? { nome_original: it.nome } : { nome: it.nome }),
      ...(it.regiao ? { regiao: it.regiao } : {}),
      posicao: confirmado ? anterior.posicao : posicao,
      fontes: fontes(anterior.fontes),
      status:
        anterior.status === 'referencia' || anterior.status === 'nao_confirmado'
          ? it.status
          : anterior.status,
    }
    saida.set(anterior.id, atualizado)
    const movido = !confirmado && desloc > LIMITE_MOVIDO_PX
    const mudou = JSON.stringify(atualizado) !== JSON.stringify(anterior)
    resultados.push({
      id: anterior.id,
      id_fonte: it.id_fonte,
      categoria: it.categoria,
      resultado: movido ? 'movido' : mudou ? 'atualizado' : 'mantido',
      ...(movido ? { deslocamento: Math.round(desloc) } : {}),
    })
  }

  const ausentes: Mesclagem['ausentes'] = []
  for (const [chave, n] of porChave) {
    if (!vistos.has(chave))
      ausentes.push({ id: n.id, id_fonte: chave, removido_na_fonte: removidosNaFonte.has(chave) })
  }
  return {
    nos: [...saida.values()].sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true })),
    resultados,
    ausentes,
  }
}
