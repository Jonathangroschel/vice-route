import type { Condicao } from '@vice-route/catalog-schema'
import { duracao, type Contexto } from './contexto.ts'
import type { AtomoFaltante, Status } from './tipos.ts'

export interface Avaliacao {
  ok: boolean
  /** Conjunto mínimo de átomos que faltam (vazio quando ok). */
  faltantes: AtomoFaltante[]
  /** Soma das durações dos faltantes: escolhe a alternativa mais barata em `qualquer` e `pelo_menos`. */
  custo: number
  /** Nunca poderá ser satisfeita nesta jogada (escolha feita, pré-requisito perdido). */
  excluido: boolean
}

const OK: Avaliacao = { ok: true, faltantes: [], custo: 0, excluido: false }
const falta = (a: AtomoFaltante, custo: number): Avaliacao => ({
  ok: false,
  faltantes: [a],
  custo,
  excluido: false,
})
const EXCLUIDO = (id?: string): Avaliacao => ({
  ok: false,
  faltantes: [{ tipo: 'caminho_excluido', ...(id ? { id } : {}) }],
  custo: Number.POSITIVE_INFINITY,
  excluido: true,
})
const CUSTO_NAO_ACIONAVEL = 1e6

const chave = (a: Avaliacao) => a.faltantes.map((f) => JSON.stringify(f)).join('|')
const maisBarata = (a: Avaliacao, b: Avaliacao) =>
  a.custo - b.custo || chave(a).localeCompare(chave(b))

function unir(partes: Avaliacao[]): Avaliacao {
  const vistos = new Set<string>()
  const faltantes: AtomoFaltante[] = []
  for (const p of partes) {
    for (const f of p.faltantes) {
      const k = JSON.stringify(f)
      if (!vistos.has(k)) {
        vistos.add(k)
        faltantes.push(f)
      }
    }
  }
  return {
    ok: partes.every((p) => p.ok),
    faltantes,
    custo: partes.reduce((s, p) => s + p.custo, 0),
    excluido: partes.some((p) => p.excluido),
  }
}

/** Só átomos `concluido` e operadores: negação assim é permanente (escolha já feita). */
function soConcluidos(c: Condicao): boolean {
  if ('todos' in c) return c.todos.every(soConcluidos)
  if ('qualquer' in c) return c.qualquer.every(soConcluidos)
  if ('nao' in c) return soConcluidos(c.nao)
  if ('pelo_menos' in c) return c.pelo_menos.de.every(soConcluidos)
  return 'concluido' in c
}

/**
 * Avaliador de `requer` (spec 008 H2, plano §5). `statusDe` dá o status de outro nó
 * (recursivo, com o grafo acíclico garantido pelo build).
 */
export function avaliar(c: Condicao, ctx: Contexto, statusDe: (id: string) => Status): Avaliacao {
  if ('todos' in c) {
    return unir(c.todos.map((x) => avaliar(x, ctx, statusDe)))
  }
  if ('qualquer' in c) {
    const partes = c.qualquer.map((x) => avaliar(x, ctx, statusDe))
    if (partes.some((p) => p.ok)) return OK
    const viaveis = partes.filter((p) => !p.excluido).sort(maisBarata)
    return viaveis[0] ?? EXCLUIDO()
  }
  if ('pelo_menos' in c) {
    const partes = c.pelo_menos.de.map((x) => avaliar(x, ctx, statusDe))
    const satisfeitas = partes.filter((p) => p.ok).length
    const faltam = c.pelo_menos.n - satisfeitas
    if (faltam <= 0) return OK
    const viaveis = partes.filter((p) => !p.ok && !p.excluido).sort(maisBarata)
    if (viaveis.length < faltam) return EXCLUIDO()
    return unir(viaveis.slice(0, faltam))
  }
  if ('nao' in c) {
    const dentro = avaliar(c.nao, ctx, statusDe)
    if (!dentro.ok) return OK
    // Interno satisfeito: por progresso (permanente) ou por estado mutável (personagem, variável)
    return soConcluidos(c.nao)
      ? EXCLUIDO()
      : falta({ tipo: 'caminho_excluido' }, CUSTO_NAO_ACIONAVEL)
  }
  if ('concluido' in c) {
    const id = ctx.idx.aliases.get(c.concluido) ?? c.concluido
    if (ctx.concluidos.has(id)) return OK
    if (statusDe(id) === 'perdido') return EXCLUIDO(id)
    return falta({ tipo: 'concluido', id }, duracao(ctx, id))
  }
  if ('capitulo_minimo' in c) {
    return ctx.capituloAtual >= c.capitulo_minimo
      ? OK
      : falta({ tipo: 'capitulo_minimo', capitulo: c.capitulo_minimo }, CUSTO_NAO_ACIONAVEL)
  }
  if ('personagem' in c) {
    const p = c.personagem
    if (p === 'ambos' || p === 'qualquer' || ctx.e.personagem === null || ctx.e.personagem === p)
      return OK
    return falta({ tipo: 'personagem', personagem: p }, CUSTO_NAO_ACIONAVEL)
  }
  if ('variavel' in c) {
    const v = c.variavel
    const valor = ctx.e.variaveis[v.nome]
    if (valor === undefined)
      return falta({ tipo: 'variavel_nao_informada', nome: v.nome }, CUSTO_NAO_ACIONAVEL)
    const ok =
      v.igual !== undefined
        ? valor === v.igual
        : v.em !== undefined
          ? v.em.includes(valor as string | number)
          : typeof valor === 'number' && valor >= (v.minimo ?? 0)
    if (ok) return OK
    const esperado =
      v.igual !== undefined
        ? String(v.igual)
        : v.em !== undefined
          ? v.em.join(' ou ')
          : `≥ ${v.minimo}`
    return falta({ tipo: 'variavel', nome: v.nome, esperado }, CUSTO_NAO_ACIONAVEL)
  }
  // contagem
  const { categoria, minimo } = c.contagem
  const atual = contar(ctx, categoria)
  if (atual >= minimo) return OK
  return falta(
    { tipo: 'contagem', categoria, minimo, atual },
    (minimo - atual) * duracaoCategoria(ctx, categoria),
  )
}

const contagens = new WeakMap<Contexto, Map<string, number>>()
export function contar(ctx: Contexto, categoria: string): number {
  let m = contagens.get(ctx)
  if (!m) {
    m = new Map()
    for (const id of ctx.concluidos) {
      const cat = ctx.idx.nos.get(id)?.categoria
      if (cat) m.set(cat, (m.get(cat) ?? 0) + 1)
    }
    for (const [cat, n] of Object.entries(ctx.e.contadores ?? {}))
      m.set(cat, Math.max(m.get(cat) ?? 0, n))
    contagens.set(ctx, m)
  }
  return m.get(categoria) ?? 0
}

const duracaoCategoria = (ctx: Contexto, categoria: string) =>
  ctx.idx.categorias.get(categoria)?.duracao_padrao_min ?? 5
