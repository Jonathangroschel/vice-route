import {
  idsReferenciados,
  paraCadaAtomo,
  type Condicao,
  type Janela,
  type No,
} from '@vice-route/catalog-schema'

/** Arestas de dependência: nó → nós exigidos por ele (`requer` e janelas). */
export function dependencias(no: No): string[] {
  const ids = new Set(idsReferenciados(no.requer))
  if (no.disponivel_desde) ids.add(no.disponivel_desde.missao)
  return [...ids].sort()
}

/** Componentes fortemente conexos com mais de um nó (ou laço próprio): ciclos. Tarjan iterativo. */
export function ciclos(ids: string[], arestas: Map<string, string[]>): string[][] {
  let indice = 0
  const idx = new Map<string, number>()
  const low = new Map<string, number>()
  const naPilha = new Set<string>()
  const pilha: string[] = []
  const resultado: string[][] = []

  for (const inicio of ids) {
    if (idx.has(inicio)) continue
    const trabalho: { v: string; i: number }[] = [{ v: inicio, i: 0 }]
    idx.set(inicio, indice)
    low.set(inicio, indice++)
    pilha.push(inicio)
    naPilha.add(inicio)
    while (trabalho.length) {
      const topo = trabalho[trabalho.length - 1]!
      const viz = arestas.get(topo.v) ?? []
      if (topo.i < viz.length) {
        const w = viz[topo.i++]!
        if (!arestas.has(w)) continue
        if (!idx.has(w)) {
          idx.set(w, indice)
          low.set(w, indice++)
          pilha.push(w)
          naPilha.add(w)
          trabalho.push({ v: w, i: 0 })
        } else if (naPilha.has(w)) {
          low.set(topo.v, Math.min(low.get(topo.v)!, idx.get(w)!))
        }
      } else {
        trabalho.pop()
        if (trabalho.length) {
          const pai = trabalho[trabalho.length - 1]!.v
          low.set(pai, Math.min(low.get(pai)!, low.get(topo.v)!))
        }
        if (low.get(topo.v) === idx.get(topo.v)) {
          const comp: string[] = []
          let w: string
          do {
            w = pilha.pop()!
            naPilha.delete(w)
            comp.push(w)
          } while (w !== topo.v)
          const lacoProprio = comp.length === 1 && (arestas.get(comp[0]!) ?? []).includes(comp[0]!)
          if (comp.length > 1 || lacoProprio) resultado.push(comp.sort())
        }
      }
    }
  }
  return resultado
}

/**
 * Ordem da campanha. Cada missão principal recebe um índice; o tempo de uma janela é
 * 2·índice para `inicio` e 2·índice + 1 para `conclusao`.
 */
export function ordemPrincipais(principais: No[]): { id: string; indice: number }[] {
  const porId = new Map(principais.map((p) => [p.id, p]))
  const grau = new Map<string, number>()
  const saidas = new Map<string, string[]>()
  for (const p of principais) {
    const deps = idsReferenciados(p.requer).filter((d) => porId.has(d))
    grau.set(p.id, deps.length)
    for (const d of deps) saidas.set(d, [...(saidas.get(d) ?? []), p.id])
  }
  const chave = (id: string) => [porId.get(id)!.ordem ?? Number.MAX_SAFE_INTEGER, id] as const
  const cmp = (a: string, b: string) => {
    const [oa, ia] = chave(a)
    const [ob, ib] = chave(b)
    return oa - ob || ia.localeCompare(ib)
  }
  const prontos = principais
    .filter((p) => grau.get(p.id) === 0)
    .map((p) => p.id)
    .sort(cmp)
  const out: { id: string; indice: number }[] = []
  while (prontos.length) {
    const id = prontos.shift()!
    out.push({ id, indice: out.length + 1 })
    for (const s of saidas.get(id) ?? []) {
      grau.set(s, grau.get(s)! - 1)
      if (grau.get(s) === 0) {
        prontos.push(s)
        prontos.sort(cmp)
      }
    }
  }
  return out
}

export const tempoJanela = (
  j: Janela,
  indicePrincipal: Map<string, number>,
  tempoMarco: (id: string) => number,
): number => {
  const i = indicePrincipal.get(j.missao)
  if (i !== undefined) return 2 * i + (j.momento === 'conclusao' ? 1 : 0)
  return tempoMarco(j.missao)
}

/**
 * Menor tempo de campanha em que um nó pode estar concluído, supondo que o jogador
 * conclui cada nó assim que ele entra na janela (plano 001 §5, NASCE_PERDIDO).
 */
export function criarCalculoAlcance(
  nos: Map<string, No>,
  indicePrincipal: Map<string, number>,
  inicioCapitulo: (n: number) => number,
) {
  const memo = new Map<string, number>()
  const visitando = new Set<string>()

  const tempoNo = (id: string): number => {
    const ja = memo.get(id)
    if (ja !== undefined) return ja
    const no = nos.get(id)
    if (!no || visitando.has(id)) return Number.POSITIVE_INFINITY
    visitando.add(id)
    let t: number
    const i = indicePrincipal.get(id)
    if (i !== undefined) {
      t = 2 * i + 1
    } else {
      const desde = no.disponivel_desde
        ? tempoJanela(no.disponivel_desde, indicePrincipal, tempoNo)
        : 0
      t = Math.max(desde, no.requer ? tempoCondicao(no.requer) : 0)
    }
    visitando.delete(id)
    memo.set(id, t)
    return t
  }

  const tempoCondicao = (c: Condicao): number => {
    if ('todos' in c) return Math.max(...c.todos.map(tempoCondicao))
    if ('qualquer' in c) return Math.min(...c.qualquer.map(tempoCondicao))
    if ('pelo_menos' in c) {
      const ts = c.pelo_menos.de.map(tempoCondicao).sort((a, b) => a - b)
      return ts[c.pelo_menos.n - 1] ?? Number.POSITIVE_INFINITY
    }
    if ('concluido' in c) return tempoNo(c.concluido)
    if ('capitulo_minimo' in c) return inicioCapitulo(c.capitulo_minimo)
    return 0 // nao, personagem, variavel, contagem: satisfazíveis desde o início
  }

  return { tempoNo, tempoCondicao }
}

/** Átomos `concluido` que definem o tempo mais tardio de uma condição (para explicar NASCE_PERDIDO). */
export function atomosTardios(
  c: Condicao,
  tempoNo: (id: string) => number,
  limite: number,
): string[] {
  const out: string[] = []
  paraCadaAtomo(c, (a) => {
    if ('concluido' in a && tempoNo(a.concluido) >= limite) out.push(a.concluido)
  })
  return out
}
