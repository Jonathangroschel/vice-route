import { indexar } from './contexto.ts'
import type {
  AtomoFaltante,
  Catalogo,
  ChecklistCapitulo,
  Ponto,
  Precomputed,
  Resultado,
  ResultadoNo,
} from './tipos.ts'

/** Próximos passos já ordenados (H4). */
export function proximosPassos(r: Resultado, n = 10): ResultadoNo[] {
  return r.proximos.slice(0, n).map((id) => r.nos.get(id)!)
}

/** Perdíveis agrupados pela missão que os fecha (H3.2). */
export const perdiveis = (r: Resultado) => r.perdiveisPorMissao

/** O que some ao iniciar e ao concluir uma missão principal (H3.5). */
export function antesDeAvancar(
  p: Precomputed,
  r: Resultado,
  missao: string,
): { aoIniciar: string[]; aoConcluir: string[] } {
  const g = p.perdiveis_por_missao[missao]
  const pendente = (id: string) => {
    const s = r.nos.get(id)?.status
    return s === 'disponivel' || s === 'bloqueado' || s === 'futuro'
  }
  return {
    aoIniciar: (g?.inicio ?? []).filter(pendente).sort(),
    aoConcluir: (g?.conclusao ?? []).filter(pendente).sort(),
  }
}

/** O que ainda falta no capítulo, por região, com os perdidos à parte (H5). */
export function checklistCapitulo(
  c: Catalogo,
  p: Precomputed,
  r: Resultado,
  capitulo: number,
): ChecklistCapitulo {
  const idx = indexar(c, p)
  const capDe = (id: string) => idx.nos.get(id)?.capitulo_referencia
  const porRegiao = new Map<string | null, ChecklistCapitulo['porRegiao'][number]['nos']>()
  const perdidos: string[] = []
  for (const no of c.nos) {
    const fecha = no.perdivel_apos ? capDe(no.perdivel_apos.missao) : undefined
    if (no.capitulo_referencia !== capitulo && fecha !== capitulo) continue
    const res = r.nos.get(no.id)
    if (!res || res.status === 'concluido') continue
    if (res.status === 'perdido') {
      perdidos.push(no.id)
      continue
    }
    const lista = porRegiao.get(no.regiao ?? null) ?? []
    lista.push({ id: no.id, perdivel: !!no.perdivel_apos, status: res.status })
    porRegiao.set(no.regiao ?? null, lista)
  }
  return {
    capitulo,
    porRegiao: [...porRegiao.entries()]
      .sort(([a], [b]) => (a ?? '~').localeCompare(b ?? '~'))
      .map(([regiao, nos]) => ({
        regiao,
        nos: nos.sort(
          (a, b) => Number(b.perdivel) - Number(a.perdivel) || a.id.localeCompare(b.id),
        ),
      })),
    perdidos: perdidos.sort(),
  }
}

/** Faltantes de um nó; no modo recursivo, a cadeia inteira em ordem de execução, sem repetição (H2.4). */
export function oQueFalta(
  r: Resultado,
  id: string,
  opts: { recursivo?: boolean } = {},
): AtomoFaltante[] {
  const base = r.nos.get(id)?.faltantes ?? []
  if (!opts.recursivo) return [...base]
  const saida: AtomoFaltante[] = []
  const vistos = new Set<string>()
  const visitar = (alvo: string) => {
    for (const f of r.nos.get(alvo)?.faltantes ?? []) {
      const k = JSON.stringify(f)
      if (vistos.has(k)) continue
      vistos.add(k)
      if (f.tipo === 'concluido') visitar(f.id)
      saida.push(f)
    }
  }
  visitar(id)
  return saida
}

function distanciaPoligono(p: Ponto, poli: [number, number][]): number {
  let dentro = false
  for (let i = 0, j = poli.length - 1; i < poli.length; j = i++) {
    const [xi, yi] = poli[i]!
    const [xj, yj] = poli[j]!
    if (yi > p.y !== yj > p.y && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi) dentro = !dentro
  }
  if (dentro) return 0
  let min = Infinity
  for (let i = 0, j = poli.length - 1; i < poli.length; j = i++) {
    const [ax, ay] = poli[j]!
    const [bx, by] = poli[i]!
    const dx = bx - ax
    const dy = by - ay
    const t = Math.max(
      0,
      Math.min(1, ((p.x - ax) * dx + (p.y - ay) * dy) / (dx * dx + dy * dy || 1)),
    )
    min = Math.min(min, Math.hypot(p.x - (ax + t * dx), p.y - (ay + t * dy)))
  }
  return min
}

/** Disponíveis perto de um ponto, por pontuação com peso de proximidade (H6). Distância em px e, se houver escala, em metros. */
export function pertoDeMim(
  c: Catalogo,
  p: Precomputed,
  r: Resultado,
  pos: Ponto,
  raio: number,
): Array<ResultadoNo & { distancia: number; distanciaM: number | null }> {
  const idx = indexar(c, p)
  const escala = c.mapa.escala_m_por_px ?? null
  const saida: Array<ResultadoNo & { distancia: number; distanciaM: number | null }> = []
  for (const res of r.nos.values()) {
    if (res.status !== 'disponivel') continue
    const no = idx.nos.get(res.id)!
    const d = no.area
      ? distanciaPoligono(pos, no.area)
      : no.posicao
        ? Math.hypot(no.posicao.x - pos.x, no.posicao.y - pos.y)
        : null
    if (d === null || d > raio) continue
    saida.push({
      ...res,
      distancia: Math.round(d),
      distanciaM: escala ? Math.round(d * escala) : null,
    })
  }
  const chave = (x: { pontuacao: number; distancia: number }) =>
    x.pontuacao + 2 / (1 + x.distancia / 500)
  return saida.sort((a, b) => chave(b) - chave(a) || a.id.localeCompare(b.id))
}

/** Ponto de extensão da spec 011 (RF-008-13). */
export function planoSessao(
  _posicao: Ponto,
  _minutos: number,
  _restricoes?: unknown,
): { erro: 'nao_implementado' } {
  return { erro: 'nao_implementado' }
}
