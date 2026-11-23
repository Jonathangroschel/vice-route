import type { No, PreCalculo } from '@vice-route/catalog-schema'
import { dependencias } from './grafo.ts'
import type { Indices } from './validar.ts'

const RAIO_CLUSTER = 150 // px da imagem-base (plano 001 §5)

/** Tudo que depende só do catálogo e pode ir pronto para o navegador (spec 001 H5). */
export function preCalcular(versao: string, idx: Indices): PreCalculo {
  const ativos = [...idx.ativos.values()].sort((a, b) => a.id.localeCompare(b.id))

  // Descendentes: quem depende (direta ou transitivamente) de cada nó
  const filhos = new Map<string, string[]>()
  for (const no of ativos) {
    for (const d of dependencias(no)) {
      if (!idx.ativos.has(d)) continue
      filhos.set(d, [...(filhos.get(d) ?? []), no.id])
    }
  }
  const descendentes: Record<string, string[]> = {}
  const valor: PreCalculo['valor_desbloqueio'] = {}
  for (const no of ativos) {
    const vistos = new Set<string>()
    const fila = [...(filhos.get(no.id) ?? [])]
    while (fila.length) {
      const f = fila.pop()!
      if (vistos.has(f)) continue
      vistos.add(f)
      fila.push(...(filhos.get(f) ?? []))
    }
    if (!vistos.size) continue
    const lista = [...vistos].sort()
    descendentes[no.id] = lista
    const nos = lista.map((id) => idx.ativos.get(id)!)
    valor[no.id] = {
      total: nos.length,
      conta_100: nos.filter((n) => n.conta_para_100).length,
      perdiveis: nos.filter((n) => n.perdivel_apos).length,
    }
  }

  // Perdíveis por missão
  const perdiveis: PreCalculo['perdiveis_por_missao'] = {}
  for (const no of ativos) {
    if (!no.perdivel_apos) continue
    const m = (perdiveis[no.perdivel_apos.missao] ??= { inicio: [], conclusao: [] })
    m[no.perdivel_apos.momento].push(no.id)
  }

  return {
    versao,
    ordem_principais: idx.ordem,
    descendentes,
    valor_desbloqueio: valor,
    perdiveis_por_missao: perdiveis,
    clusters: agrupar(ativos.filter((n) => n.posicao)),
  }
}

/** Agrupamento guloso por região com raio fixo: determinístico e suficiente para densidade. */
function agrupar(nos: No[]): PreCalculo['clusters'] {
  const porRegiao = new Map<string, No[]>()
  for (const n of nos) {
    const r = n.regiao ?? ''
    porRegiao.set(r, [...(porRegiao.get(r) ?? []), n])
  }
  const clusters: PreCalculo['clusters'] = []
  for (const regiao of [...porRegiao.keys()].sort()) {
    const restantes = [...porRegiao.get(regiao)!].sort(
      (a, b) =>
        a.posicao!.x - b.posicao!.x || a.posicao!.y - b.posicao!.y || a.id.localeCompare(b.id),
    )
    const usados = new Set<string>()
    for (const semente of restantes) {
      if (usados.has(semente.id)) continue
      const membros = restantes.filter(
        (n) =>
          !usados.has(n.id) &&
          Math.hypot(n.posicao!.x - semente.posicao!.x, n.posicao!.y - semente.posicao!.y) <=
            RAIO_CLUSTER,
      )
      membros.forEach((m) => usados.add(m.id))
      const cx = membros.reduce((s, m) => s + m.posicao!.x, 0) / membros.length
      const cy = membros.reduce((s, m) => s + m.posicao!.y, 0) / membros.length
      clusters.push({
        regiao: regiao || null,
        centro: { x: Math.round(cx), y: Math.round(cy) },
        nos: membros.map((m) => m.id).sort(),
      })
    }
  }
  return clusters
}
