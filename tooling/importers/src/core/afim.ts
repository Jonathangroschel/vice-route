/** Transformação afim x' = a·x + b·y + c ; y' = d·x + e·y + f (RF-002-15). */
export interface Afim {
  a: number
  b: number
  c: number
  d: number
  e: number
  f: number
}

export interface Par {
  nome: string
  fonte: { x: number; y: number }
  base: { x: number; y: number }
}

export const aplicar = (t: Afim, p: { x: number; y: number }) => ({
  x: t.a * p.x + t.b * p.y + t.c,
  y: t.d * p.x + t.e * p.y + t.f,
})

function resolver3(A: number[][], b: number[]): number[] {
  const M = A.map((linha, i) => [...linha, b[i]!])
  for (let c = 0; c < 3; c++) {
    let piv = c
    for (let r = c + 1; r < 3; r++) if (Math.abs(M[r]![c]!) > Math.abs(M[piv]![c]!)) piv = r
    ;[M[c], M[piv]] = [M[piv]!, M[c]!]
    if (Math.abs(M[c]![c]!) < 1e-12)
      throw new Error('pontos de controle degenerados (colineares ou repetidos)')
    for (let r = 0; r < 3; r++) {
      if (r === c) continue
      const f = M[r]![c]! / M[c]![c]!
      for (let k = c; k < 4; k++) M[r]![k]! -= f * M[c]![k]!
    }
  }
  return [0, 1, 2].map((i) => M[i]![3]! / M[i]![i]!)
}

/** Ajuste por mínimos quadrados. Exige ao menos 3 pares não colineares. */
export function ajustar(pares: Par[]): Afim {
  if (pares.length < 3)
    throw new Error(`ajuste afim precisa de ao menos 3 pares (recebeu ${pares.length})`)
  let sxx = 0,
    sxy = 0,
    sx = 0,
    syy = 0,
    sy = 0
  let bx = [0, 0, 0],
    by = [0, 0, 0]
  for (const {
    fonte: { x, y },
    base,
  } of pares) {
    sxx += x * x
    sxy += x * y
    sx += x
    syy += y * y
    sy += y
    bx = [bx[0]! + x * base.x, bx[1]! + y * base.x, bx[2]! + base.x]
    by = [by[0]! + x * base.y, by[1]! + y * base.y, by[2]! + base.y]
  }
  const A = [
    [sxx, sxy, sx],
    [sxy, syy, sy],
    [sx, sy, pares.length],
  ]
  const [a, b, c] = resolver3(A, bx) as [number, number, number]
  const [d, e, f] = resolver3(A, by) as [number, number, number]
  return { a, b, c, d, e, f }
}

export function residuos(t: Afim, pares: Par[]): { nome: string; erro: number }[] {
  return pares.map((p) => {
    const q = aplicar(t, p.fonte)
    return { nome: p.nome, erro: Math.hypot(q.x - p.base.x, q.y - p.base.y) }
  })
}

const mediana = (v: number[]) => {
  const s = [...v].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2
}

/**
 * Ajuste robusto: a cada iteração remove só o par de maior erro, se ele passar de max(k·mediana, piso).
 * Remover um de cada vez evita descartar pares bons quando um erro grosseiro distorce o primeiro ajuste.
 */
export function ajustarRobusto(
  pares: Par[],
  k = 2.5,
  piso = 30,
  minimo = 6,
): { transformacao: Afim; usados: Par[]; descartados: Par[] } {
  let usados = [...pares]
  while (usados.length > minimo) {
    const t = ajustar(usados)
    const r = residuos(t, usados)
    const limite = Math.max(k * mediana(r.map((x) => x.erro)), piso)
    let pior = 0
    for (let j = 1; j < r.length; j++) if (r[j]!.erro > r[pior]!.erro) pior = j
    if (r[pior]!.erro <= limite) break
    usados = usados.filter((_, j) => j !== pior)
  }
  const nomes = new Set(usados.map((p) => p.nome))
  return {
    transformacao: ajustar(usados),
    usados,
    descartados: pares.filter((p) => !nomes.has(p.nome)),
  }
}

export function resumoResiduos(t: Afim, pares: Par[]) {
  const r = residuos(t, pares).map((x) => x.erro)
  return {
    n: r.length,
    medio: r.reduce((s, x) => s + x, 0) / r.length,
    mediano: mediana(r),
    maximo: Math.max(...r),
  }
}
