import { describe, expect, it } from 'vitest'
import type { CatalogoCompilado } from '@vice-route/catalog-schema'
import { agrupar, anel } from '../app/utils/agrupar'
import { calcularProgresso } from '../app/utils/progresso'
import { nomeVisivel, normalizar } from '../app/utils/textos'

describe('agrupar (spec 004 RF-004-03)', () => {
  const pontos = [
    { id: 'a', x: 100, y: 100, cor: '#f00' },
    { id: 'b', x: 120, y: 110, cor: '#0f0' },
    { id: 'c', x: 3000, y: 3000, cor: '#f00' },
  ]
  it('agrupa pontos da mesma célula em zoom baixo', () => {
    const m = agrupar(pontos, 0)
    const grupo = m.find((x) => x.tipo === 'grupo')
    expect(grupo && grupo.tipo === 'grupo' && grupo.ids.sort()).toEqual(['a', 'b'])
    expect(m.filter((x) => x.tipo === 'no')).toHaveLength(1)
  })
  it('não agrupa no zoom máximo', () => {
    expect(agrupar(pontos, 5).every((x) => x.tipo === 'no')).toBe(true)
  })
  it('anel tem um segmento por cor, proporcional', () => {
    expect(
      anel([
        { cor: '#f00', n: 3 },
        { cor: '#0f0', n: 1 },
      ]),
    ).toBe('conic-gradient(#f00 0.0deg 270.0deg, #0f0 270.0deg 360.0deg)')
  })
})

describe('progresso pela regra de 100% (spec 005)', () => {
  const no = (id: string, categoria: string, conjunto?: string) => ({
    id,
    tipo: 'item',
    categoria,
    conjunto,
    status: 'referencia',
  })
  const c = {
    categorias: [
      { id: 'flamingos', grupo: 'colecionaveis', regra_100: { tipo: 'itens', minimo: 2 } },
      {
        id: 'cartas',
        grupo: 'colecionaveis',
        regra_100: { tipo: 'conjuntos_completos', minimo: 1 },
      },
      { id: 'pesca', grupo: 'atividades', regra_100: { tipo: 'nenhuma' } },
    ],
    nos: [
      no('f1', 'flamingos'),
      no('f2', 'flamingos'),
      no('f3', 'flamingos'),
      no('c1', 'cartas', 'x'),
      no('c2', 'cartas', 'x'),
      no('c3', 'cartas', 'y'),
      no('p1', 'pesca'),
    ],
  } as unknown as CatalogoCompilado

  it('conta o exigido, não o total, e fecha a categoria ao cumprir', () => {
    const p = calcularProgresso(c, new Set(['f1', 'f2', 'c1']))
    const fl = p.categorias.find((x) => x.categoria.id === 'flamingos')!
    expect(fl.fechada).toBe(true)
    expect(p.porcentagem).toBe(66) // 2/2 flamingos + 0/1 conjunto = 2/3
    expect(p.achados).toBe(3)
    expect(p.totalPinos).toBe(7)
  })
  it('conjunto completo conta para a regra de conjuntos', () => {
    expect(
      calcularProgresso(c, new Set(['c1', 'c2'])).categorias.find(
        (x) => x.categoria.id === 'cartas',
      )!.rumo,
    ).toBe(1)
  })
})

describe('textos e spoiler (spec 009)', () => {
  const missao = {
    id: 'missao:x',
    tipo: 'missao',
    subtipo: 'principal',
    nome: 'Tourist Trap',
    spoiler: 2,
    capitulo_referencia: 1,
  } as never
  it('esconde nome acima do teto e mostra rótulo neutro', () => {
    expect(nomeVisivel(missao, 1, [])).toBe('Missão principal · capítulo 1')
    expect(nomeVisivel(missao, 2, [])).toBe('Tourist Trap')
    expect(nomeVisivel(missao, 1, ['missao:x'])).toBe('Tourist Trap')
  })
  it('normaliza acentos e caixa para busca', () => {
    expect(normalizar('Ação NÃO')).toBe('acao nao')
  })
})
