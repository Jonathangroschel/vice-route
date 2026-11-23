import { join } from 'node:path'
import { verificar } from '@vice-route/catalog-build'
import type { Catalogo, EstadoJogada, Precomputed } from '../src/index.ts'

export const RAIZ = join(import.meta.dirname, '../../..')

const cache = new Map<string, { c: Catalogo; p: Precomputed }>()

/** Compila um catálogo de `golden/catalogo/<nome>/data` (ou `data/` para "real") com o catalog-build. */
export function catalogo(nome: string): { c: Catalogo; p: Precomputed } {
  const ja = cache.get(nome)
  if (ja) return ja
  const dir = nome === 'real' ? join(RAIZ, 'data') : join(RAIZ, 'golden/catalogo', nome, 'data')
  const v = verificar(dir, { versao: 'teste' })
  if (!v.artefatos)
    throw new Error(`catálogo ${nome} inválido: ${v.problemas.map((p) => p.mensagem).join('; ')}`)
  const r = { c: v.artefatos.catalogo, p: v.artefatos.precalculo }
  cache.set(nome, r)
  return r
}

export const estado = (parcial: Partial<EstadoJogada> = {}): EstadoJogada => ({
  concluidos: [],
  ultimaPrincipal: null,
  principalEmAndamento: null,
  personagem: null,
  variaveis: {},
  posicao: null,
  perfil: 'cacador100',
  categoriasFavoritas: [],
  categoriasIgnoradas: [],
  tetoSpoiler: 3,
  revelados: [],
  ...parcial,
})
