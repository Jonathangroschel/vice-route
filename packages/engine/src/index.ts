export * from './tipos.ts'
export { recomendar } from './motor.ts'
export {
  proximosPassos,
  perdiveis,
  antesDeAvancar,
  checklistCapitulo,
  oQueFalta,
  pertoDeMim,
  planoSessao,
} from './consultas.ts'
export { PESOS, pesosDe } from './pesos.ts'
export { rotulo } from './textos.ts'

import type { Resultado } from './tipos.ts'

/** Forma serializável do resultado, para atravessar a fronteira do Web Worker. */
export function serializar(r: Resultado) {
  return { ...r, nos: [...r.nos.values()] }
}
