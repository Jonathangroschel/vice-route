import type { CategoriaCompilada, Condicao, Janela, NoCompilado } from '@vice-route/catalog-schema'
import type { Catalogo, EstadoJogada, Parametros, Precomputed } from './tipos.ts'

const DURACAO_PADRAO_MIN = 5

/** Índices derivados do catálogo: calculados uma vez e reaproveitados entre chamadas (WeakMap). */
export interface IndiceCatalogo {
  nos: Map<string, NoCompilado>
  ids: string[]
  categorias: Map<string, CategoriaCompilada>
  indicePrincipal: Map<string, number>
  principaisOrdenadas: string[]
  /** Nós que dependem de cada nó (inverso de `requer` e `disponivel_desde`). */
  aliases: Map<string, string>
  clusterDe: Map<string, number>
  maxValor: number
}

const cache = new WeakMap<Catalogo, IndiceCatalogo>()

export function indexar(c: Catalogo, p: Precomputed): IndiceCatalogo {
  const ja = cache.get(c)
  if (ja) return ja
  const nos = new Map(c.nos.map((n) => [n.id, n]))
  const clusterDe = new Map<string, number>()
  p.clusters.forEach((cl, i) => cl.nos.forEach((id) => clusterDe.set(id, i)))
  const idx: IndiceCatalogo = {
    nos,
    ids: c.nos.map((n) => n.id).sort(),
    categorias: new Map(c.categorias.map((x) => [x.id, x])),
    indicePrincipal: new Map(p.ordem_principais.map((o) => [o.id, o.indice])),
    principaisOrdenadas: p.ordem_principais.map((o) => o.id),
    aliases: new Map(Object.entries(c.aliases)),
    clusterDe,
    maxValor: Math.max(1, ...Object.values(p.valor_desbloqueio).map((v) => v.total)),
  }
  cache.set(c, idx)
  return idx
}

/** Contexto de um cálculo: índice do catálogo + estado normalizado. */
export interface Contexto {
  c: Catalogo
  p: Precomputed
  idx: IndiceCatalogo
  e: EstadoJogada
  prm: Required<Pick<Parametros, 'kRisco' | 'n'>> & Parametros
  concluidos: Set<string>
  /** Tempo de campanha: 2·i para o início da principal i, 2·i + 1 para a conclusão. */
  tempo: number
  indiceCampanha: number
  capituloAtual: number
}

export const tempoJanela = (ctx: Pick<Contexto, 'idx' | 'concluidos'>, j: Janela): number => {
  const i = ctx.idx.indicePrincipal.get(j.missao)
  if (i !== undefined) return 2 * i + (j.momento === 'conclusao' ? 1 : 0)
  // Marco: alcançado se concluído; senão, ainda não
  return ctx.concluidos.has(j.missao) ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY
}

export function duracao(ctx: Pick<Contexto, 'idx' | 'prm'>, id: string): number {
  const prior = ctx.prm.priors?.duracao_min?.[id]
  if (prior !== undefined) return prior
  const no = ctx.idx.nos.get(id)
  if (!no) return DURACAO_PADRAO_MIN
  return (
    no.duracao_min ??
    (no.categoria ? ctx.idx.categorias.get(no.categoria)?.duracao_padrao_min : undefined) ??
    DURACAO_PADRAO_MIN
  )
}

/** IDs que um nó concluído implica concluídos: átomos `concluido` em caminhos obrigatórios (`todos`). */
export function implicados(c: Condicao | undefined): string[] {
  if (!c) return []
  if ('todos' in c) return c.todos.flatMap(implicados)
  if ('concluido' in c) return [c.concluido]
  return []
}
