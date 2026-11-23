import type { CatalogoCompilado, CategoriaCompilada } from '@vice-route/catalog-schema'

export interface ProgressoCategoria {
  categoria: CategoriaCompilada
  feitos: number
  /** Pinos no catálogo (não depreciados). */
  pinos: number
  /** Valor que conta para a regra de 100%: itens, conjuntos completos ou contador. */
  rumo: number
  exigido: number | null
  fechada: boolean
}

export interface Progresso {
  categorias: ProgressoCategoria[]
  achados: number
  totalPinos: number
  porcentagem: number
}

/**
 * Progresso pela regra de 100% de cada categoria (docs/04 §1, spec 005 RF-005-11): o anel conta
 * o exigido, não o total; a contagem bruta "achados / pinos" aparece à parte.
 */
export function calcularProgresso(
  c: CatalogoCompilado,
  concluidos: Set<string>,
  contadores: Record<string, number> = {},
): Progresso {
  const porCat = new Map<
    string,
    { feitos: number; pinos: number; conjuntos: Map<string, { t: number; f: number }> }
  >()
  for (const n of c.nos) {
    if (!n.categoria || n.status === 'depreciado' || n.tipo === 'gatilho' || n.tipo === 'marco')
      continue
    const x = porCat.get(n.categoria) ?? { feitos: 0, pinos: 0, conjuntos: new Map() }
    x.pinos++
    const feito = concluidos.has(n.id)
    if (feito) x.feitos++
    if (n.conjunto) {
      const cj = x.conjuntos.get(n.conjunto) ?? { t: 0, f: 0 }
      cj.t++
      if (feito) cj.f++
      x.conjuntos.set(n.conjunto, cj)
    }
    porCat.set(n.categoria, x)
  }
  let somaRumo = 0
  let somaExigido = 0
  let achados = 0
  let totalPinos = 0
  const categorias = c.categorias.map((cat) => {
    const x = porCat.get(cat.id) ?? { feitos: 0, pinos: 0, conjuntos: new Map() }
    const r = cat.regra_100
    let rumo = x.feitos
    let exigido: number | null = null
    if (r.tipo === 'itens') exigido = r.minimo
    if (r.tipo === 'contador') {
      exigido = r.minimo
      rumo = contadores[cat.id] ?? 0
    }
    if (r.tipo === 'conjuntos_completos') {
      exigido = r.minimo
      rumo = [...x.conjuntos.values()].filter((cj) => cj.t > 0 && cj.f === cj.t).length
    }
    if (exigido !== null) {
      somaRumo += Math.min(rumo, exigido)
      somaExigido += exigido
    }
    if (cat.grupo !== 'missoes') {
      achados += x.feitos
      totalPinos += x.pinos
    }
    return {
      categoria: cat,
      feitos: x.feitos,
      pinos: x.pinos,
      rumo,
      exigido,
      fechada: exigido !== null && rumo >= exigido,
    }
  })
  return {
    categorias,
    achados,
    totalPinos,
    porcentagem: somaExigido ? Math.floor((somaRumo / somaExigido) * 100) : 0,
  }
}
