import { carregarCatalogo, type FonteCatalogo } from './carregar.ts'
import { compilar, type Artefatos } from './compilar.ts'
import type { Problema } from './problemas.ts'
import { validarCatalogo, type Indices } from './validar.ts'

export * from './carregar.ts'
export * from './compilar.ts'
export * from './problemas.ts'
export * from './validar.ts'
export * from './grafo.ts'
export { preCalcular } from './precalculo.ts'
export { rodarCenarios } from './golden.ts'

export interface Verificacao {
  fonte: FonteCatalogo
  problemas: Problema[]
  indices?: Indices
  artefatos?: Artefatos
  ok: boolean
}

/** Carrega, valida e compila em memória. É o núcleo do `catalog:check` (RF-001-12). */
export function verificar(
  raizData: string,
  opcoes: { versao?: string; idsAnteriores?: Set<string> } = {},
): Verificacao {
  const fonte = carregarCatalogo(raizData)
  const problemas = [...fonte.problemas]
  if (problemas.some((p) => p.nivel === 'erro') || !fonte.mapa)
    return { fonte, problemas, ok: false }
  const { problemas: doGrafo, indices } = validarCatalogo(fonte, opcoes.idsAnteriores)
  problemas.push(...doGrafo)
  if (problemas.some((p) => p.nivel === 'erro')) return { fonte, problemas, indices, ok: false }
  const artefatos = compilar(fonte, indices, opcoes.versao ?? 'dev')
  return { fonte, problemas, indices, artefatos, ok: true }
}
