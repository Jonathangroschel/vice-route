import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { proximaVersao, rodarCenarios, verificar, criarManifest } from '../src/index.ts'
import { rodarCenarios as golden } from '../src/golden.ts'

const GOLDEN = join(import.meta.dirname, '../../../golden/catalogo')

describe('catalog-build', () => {
  it('compila de forma determinística (H3.2)', () => {
    const a = verificar(join(GOLDEN, 'cadeia-oculta/data'), { versao: 'x' })
    const b = verificar(join(GOLDEN, 'cadeia-oculta/data'), { versao: 'x' })
    expect(a.ok).toBe(true)
    expect(a.artefatos!.arquivos).toEqual(b.artefatos!.arquivos)
  })

  it('remove observações de curadoria do catálogo compilado (H3.4)', () => {
    const v = verificar(join(GOLDEN, 'cadeia-oculta/data'))
    expect(v.artefatos!.arquivos['catalog.json']).not.toContain('"obs"')
    expect(v.artefatos!.arquivos['catalog.json']).not.toContain('ids_fonte')
  })

  it('incrementa a versão no mesmo dia (H7.1)', () => {
    const d = new Date('2026-11-23T12:00:00Z')
    expect(proximaVersao(d)).toBe('2026.11.23-1')
    expect(proximaVersao(d, '2026.11.23-1')).toBe('2026.11.23-2')
    expect(proximaVersao(d, '2026.11.22-4')).toBe('2026.11.23-1')
  })

  it('manifest traz hash e tamanho de cada arquivo', () => {
    const m = criarManifest('2026.11.23-1', { 'catalog.json': '{}' }, '2026-11-23T00:00:00Z')
    expect(m.arquivos['catalog.json']).toMatchObject({
      caminho: '2026.11.23-1/catalog.json',
      bytes: 2,
    })
  })

  it('detecta ID removido em relação à versão publicada (H2.6)', () => {
    const v = verificar(join(GOLDEN, 'cadeia-oculta/data'), {
      idsAnteriores: new Set(['item:easter-eggs-999']),
    })
    expect(v.problemas.map((p) => p.codigo)).toContain('ID_REMOVIDO')
  })

  it('cenários-ouro do catálogo passam', () => {
    const r = golden(GOLDEN)
    expect(r.length).toBeGreaterThanOrEqual(4)
    expect(r.filter((c) => !c.ok)).toEqual([])
    expect(rodarCenarios).toBe(golden)
  })
})
