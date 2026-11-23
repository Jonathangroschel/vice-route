/** Ponto visível no mapa, em pixels da imagem-base. */
export interface PontoMapa {
  id: string
  x: number
  y: number
  cor: string
}

export type Marcador =
  | { tipo: 'no'; ponto: PontoMapa }
  | {
      tipo: 'grupo'
      x: number
      y: number
      ids: string[]
      cores: { cor: string; n: number }[]
      limites: [number, number, number, number]
    }

/**
 * Agrupamento em grade no espaço da imagem-base (spec 004 RF-004-03). Supercluster assume coordenadas
 * geográficas; aqui a célula tem `celulaPx` px de tela, convertidos para px da imagem pela escala do
 * zoom (16 / 2^zoom px da imagem por px de tela).
 */
export function agrupar(
  pontos: PontoMapa[],
  zoom: number,
  celulaPx = 72,
  zoomSemAgrupar = 4.5,
): Marcador[] {
  if (zoom >= zoomSemAgrupar) return pontos.map((ponto) => ({ tipo: 'no', ponto }))
  const celula = (celulaPx * 16) / 2 ** zoom
  const celulas = new Map<string, PontoMapa[]>()
  for (const p of pontos) {
    const k = `${Math.floor(p.x / celula)}:${Math.floor(p.y / celula)}`
    const lista = celulas.get(k)
    if (lista) lista.push(p)
    else celulas.set(k, [p])
  }
  const saida: Marcador[] = []
  for (const lista of celulas.values()) {
    if (lista.length === 1) {
      saida.push({ tipo: 'no', ponto: lista[0]! })
      continue
    }
    const cores = new Map<string, number>()
    let sx = 0
    let sy = 0
    let x0 = Infinity
    let y0 = Infinity
    let x1 = -Infinity
    let y1 = -Infinity
    for (const p of lista) {
      cores.set(p.cor, (cores.get(p.cor) ?? 0) + 1)
      sx += p.x
      sy += p.y
      x0 = Math.min(x0, p.x)
      y0 = Math.min(y0, p.y)
      x1 = Math.max(x1, p.x)
      y1 = Math.max(y1, p.y)
    }
    saida.push({
      tipo: 'grupo',
      x: sx / lista.length,
      y: sy / lista.length,
      ids: lista.map((p) => p.id),
      cores: [...cores.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([cor, n]) => ({ cor, n })),
      limites: [x0, y0, x1, y1],
    })
  }
  return saida
}

/** Anel segmentado proporcional às categorias contidas (conic-gradient). */
export function anel(cores: { cor: string; n: number }[]): string {
  const total = cores.reduce((s, c) => s + c.n, 0)
  let acc = 0
  const partes = cores.map((c) => {
    const ini = (acc / total) * 360
    acc += c.n
    return `${c.cor} ${ini.toFixed(1)}deg ${((acc / total) * 360).toFixed(1)}deg`
  })
  return `conic-gradient(${partes.join(', ')})`
}
