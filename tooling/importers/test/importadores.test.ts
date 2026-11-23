import { describe, expect, it } from 'vitest'
import type { Fonte, NoEntrada } from '@vice-route/catalog-schema'
import { ajustar, ajustarRobusto, aplicar, resumoResiduos, type Par } from '../src/core/afim.ts'
import { mesclar, type ItemFonte } from '../src/core/mesclar.ts'
import { POR_TIPO, CATEGORIAS } from '../src/categorias.ts'

const T = { a: 12, b: 0.1, c: -2000, d: -0.8, e: 12, f: -1600 }
const par = (nome: string, x: number, y: number): Par => ({
  nome,
  fonte: { x, y },
  base: aplicar(T, { x, y }),
})

describe('afim (CO-002-07, CO-002-08)', () => {
  const pares = [
    par('a', 250, 250),
    par('b', 550, 260),
    par('c', 300, 700),
    par('d', 500, 600),
    par('e', 400, 400),
    par('f', 260, 500),
    par('g', 580, 720),
  ]

  it('recupera a transformação com resíduo < 1 px', () => {
    const t = ajustar(pares)
    expect(resumoResiduos(t, pares).maximo).toBeLessThan(1)
    expect(t.a).toBeCloseTo(12, 6)
  })

  it('descarta um ponto de controle com erro grosseiro', () => {
    const ruim: Par = {
      nome: 'ruim',
      fonte: { x: 450, y: 300 },
      base: { x: aplicar(T, { x: 450, y: 300 }).x + 200, y: aplicar(T, { x: 450, y: 300 }).y },
    }
    const { descartados, transformacao } = ajustarRobusto([...pares, ruim])
    expect(descartados.map((p) => p.nome)).toEqual(['ruim'])
    expect(resumoResiduos(transformacao, pares).maximo).toBeLessThan(1)
  })

  it('recusa pontos degenerados', () => {
    expect(() => ajustar([par('a', 1, 1), par('b', 2, 2), par('c', 3, 3)])).toThrow()
  })
})

const fonte: Fonte = {
  tipo: 'aberto',
  nome: 'Fonte X',
  url: 'https://exemplo.org',
  commit: 'abc1234',
  licenca: 'CC-BY-4.0',
}
const item = (id_fonte: string, x = 100, y = 100, nome = `Item ${id_fonte}`): ItemFonte => ({
  id_fonte,
  categoria: 'cartas',
  subtipo: 'colecionavel',
  conjunto: 'delights',
  nome,
  posicao: { x, y },
  status: 'referencia',
  fonte,
})

describe('mesclar (spec 002 H2)', () => {
  it('cria IDs sequenciais por categoria na primeira importação (CO-002-01)', () => {
    const m = mesclar('x', [], [item('b'), item('a')], new Set())
    expect(m.nos.map((n) => n.id)).toEqual(['item:cartas-001', 'item:cartas-002'])
    expect(m.nos[0]!.ids_fonte).toEqual({ x: 'a' })
  })

  it('re-importar a mesma fonte não muda nada (CO-002-02)', () => {
    const primeira = mesclar('x', [], [item('a'), item('b')], new Set())
    const segunda = mesclar('x', primeira.nos, [item('a'), item('b')], new Set())
    expect(segunda.nos).toEqual(primeira.nos)
    expect(segunda.resultados.every((r) => r.resultado === 'mantido')).toBe(true)
  })

  it('mantém o ID e marca como movido quando a posição muda (CO-002-03)', () => {
    const primeira = mesclar('x', [], [item('a', 100, 100)], new Set())
    const segunda = mesclar('x', primeira.nos, [item('a', 120, 100)], new Set())
    expect(segunda.nos[0]!.id).toBe('item:cartas-001')
    expect(segunda.resultados[0]).toMatchObject({ resultado: 'movido', deslocamento: 20 })
  })

  it('preserva campos de curadoria e posição confirmada (CO-002-04)', () => {
    const primeira = mesclar('x', [], [item('a', 100, 100, 'Card A')], new Set())
    const curado: NoEntrada = {
      ...primeira.nos[0]!,
      nome: 'Carta A (traduzida)',
      nome_original: 'Card A',
      status: 'confirmado',
      posicao: { x: 105, y: 99, qualidade: 'verificada', representa: 'ponto' },
      dicas: [{ texto: 'Dentro da garagem', spoiler: 1 }],
    }
    const segunda = mesclar('x', [curado], [item('a', 300, 300, 'Card A v2')], new Set())
    const n = segunda.nos[0]!
    expect(n.nome).toBe('Carta A (traduzida)')
    expect(n.nome_original).toBe('Card A v2')
    expect(n.status).toBe('confirmado')
    expect(n.posicao).toEqual(curado.posicao)
    expect(n.dicas).toEqual(curado.dicas)
  })

  it('atualiza a própria fonte no lugar, sem reordenar fontes de curadoria', () => {
    const primeira = mesclar('x', [], [item('a')], new Set())
    const curado: NoEntrada = {
      ...primeira.nos[0]!,
      fontes: [{ tipo: 'referencia', nome: 'Guia', url: 'https://guia.org' }, fonte],
    }
    const nova = { ...fonte, commit: 'def5678' }
    const segunda = mesclar('x', [curado], [{ ...item('a'), fonte: nova }], new Set())
    expect(segunda.nos[0]!.fontes).toEqual([curado.fontes[0], nova])
  })

  it('nunca remove itens ausentes na fonte (CO-002-05)', () => {
    const primeira = mesclar('x', [], [item('a'), item('b')], new Set())
    const segunda = mesclar('x', primeira.nos, [item('a')], new Set(['b']))
    expect(segunda.nos).toHaveLength(2)
    expect(segunda.ausentes).toEqual([
      { id: 'item:cartas-002', id_fonte: 'b', removido_na_fonte: true },
    ])
  })

  it('não reaproveita IDs de aliases nem de itens depreciados', () => {
    const existente: NoEntrada = {
      id: 'item:cartas-001',
      tipo: 'item',
      subtipo: 'colecionavel',
      categoria: 'cartas',
      nome: 'Antiga',
      spoiler: 1,
      fontes: [fonte],
      status: 'depreciado',
      aliases: ['item:cartas-002'],
    }
    const m = mesclar('x', [existente], [item('novo')], new Set())
    expect(m.nos.map((n) => n.id)).toContain('item:cartas-003')
  })
})

describe('categorias', () => {
  it('cada tipo da fonte aponta para uma só categoria', () => {
    const tipos = CATEGORIAS.flatMap((c) => c.tipos)
    expect(new Set(tipos).size).toBe(tipos.length)
    expect(POR_TIPO.get('card|Delights card')).toMatchObject({ conjunto: 'delights' })
  })
})
