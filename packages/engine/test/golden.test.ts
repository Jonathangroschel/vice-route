import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from 'yaml'
import { describe, expect, it } from 'vitest'
import {
  antesDeAvancar,
  oQueFalta,
  recomendar,
  serializar,
  type EstadoJogada,
  type Parametros,
} from '../src/index.ts'
import { RAIZ, catalogo, estado } from './apoio.ts'

/**
 * Cenários-ouro do motor (golden/motor/*.yaml, spec 008 §8). Asserções declarativas:
 * status, em_risco, posicao_em_proximos (máxima, base 1), acima_de, fora_de_proximos, em_perdiveis,
 * motivo, o_que_falta (IDs de átomos `concluido`, em ordem), faltante_tipo, antes_de_avancar,
 * texto_contem e texto_nao_contem (sobre todas as frases do resultado).
 */
interface Cenario {
  id: string
  descricao: string
  catalogo: string
  estado: Partial<EstadoJogada>
  parametros?: Parametros
  espera: {
    status?: Record<string, string>
    em_risco?: string[]
    posicao_em_proximos?: Record<string, number>
    acima_de?: [string, string][]
    fora_de_proximos?: string[]
    em_perdiveis?: string[]
    motivo?: Record<string, string>
    o_que_falta?: Record<string, string[]>
    faltante_tipo?: Record<string, string>
    antes_de_avancar?: { missao: string; ao_iniciar?: string[]; ao_concluir?: string[] }
    texto_contem?: string[]
    texto_nao_contem?: string[]
  }
}

const DIR = join(RAIZ, 'golden/motor')
const cenarios = readdirSync(DIR)
  .filter((f) => f.endsWith('.yaml'))
  .sort()
  .map((f) => parse(readFileSync(join(DIR, f), 'utf8')) as Cenario)

describe('cenários-ouro do motor', () => {
  for (const cen of cenarios) {
    it(`${cen.id}: ${cen.descricao}`, () => {
      const { c, p } = catalogo(cen.catalogo)
      const r = recomendar(c, p, estado(cen.estado), cen.parametros)
      const x = cen.espera
      const no = (id: string) => {
        const n = r.nos.get(id)
        expect(n, `nó ${id} existe`).toBeDefined()
        return n!
      }
      for (const [id, st] of Object.entries(x.status ?? {})) expect(no(id).status, id).toBe(st)
      for (const id of x.em_risco ?? []) expect(no(id).emRisco, `${id} em risco`).toBe(true)
      for (const [id, max] of Object.entries(x.posicao_em_proximos ?? {})) {
        const pos = r.proximos.indexOf(id) + 1
        expect(pos, `${id} nos próximos (posição ${pos})`).toBeGreaterThan(0)
        expect(pos, `${id} até a posição ${max}`).toBeLessThanOrEqual(max)
      }
      for (const [a, b] of x.acima_de ?? [])
        expect(r.proximos.indexOf(a), `${a} acima de ${b}`).toBeLessThan(r.proximos.indexOf(b))
      for (const id of x.fora_de_proximos ?? []) expect(r.proximos).not.toContain(id)
      for (const id of x.em_perdiveis ?? [])
        expect(r.perdiveisPorMissao.flatMap((g) => g.nos)).toContain(id)
      for (const [id, cod] of Object.entries(x.motivo ?? {}))
        expect(no(id).motivos.map((m) => m.codigo)).toContain(cod)
      for (const [id, esperado] of Object.entries(x.o_que_falta ?? {})) {
        const ids = oQueFalta(r, id).flatMap((f) => (f.tipo === 'concluido' ? [f.id] : []))
        expect(ids, `o que falta em ${id}`).toEqual(esperado)
      }
      for (const [id, tipo] of Object.entries(x.faltante_tipo ?? {}))
        expect(no(id).faltantes.map((f) => f.tipo)).toContain(tipo)
      if (x.antes_de_avancar) {
        const a = antesDeAvancar(p, r, x.antes_de_avancar.missao)
        for (const id of x.antes_de_avancar.ao_iniciar ?? []) expect(a.aoIniciar).toContain(id)
        for (const id of x.antes_de_avancar.ao_concluir ?? []) expect(a.aoConcluir).toContain(id)
      }
      const frases = JSON.stringify(
        [...r.nos.values()].flatMap((n) => n.motivos.map((m) => m.frase)),
      )
      for (const t of x.texto_contem ?? []) expect(frases).toContain(t)
      for (const t of x.texto_nao_contem ?? []) expect(frases).not.toContain(t)
    })
  }

  it('CO-008-08: mesmo estado, saída idêntica em 100 execuções', () => {
    const { c, p } = catalogo('cadeia-oculta')
    const e = estado({ ultimaPrincipal: 'missao:principal-011', posicao: { x: 400, y: 400 } })
    const primeira = JSON.stringify(serializar(recomendar(c, p, e)))
    for (let i = 0; i < 100; i++)
      expect(JSON.stringify(serializar(recomendar(c, p, e)))).toBe(primeira)
  })
})
