import type { Perfil, Pesos } from './tipos.ts'

/** Pesos iniciais por perfil (docs/05 §3.5); calibrados depois pela comunidade (spec 014). */
export const PESOS: Record<Perfil, Pesos> = {
  cacador100: {
    risco: 5,
    desbloqueio: 2,
    proximidade: 1.5,
    densidade: 1,
    preferencia: 0.5,
    historia: 0,
    tempo: 1,
  },
  equilibrio: {
    risco: 4,
    desbloqueio: 1.5,
    proximidade: 2,
    densidade: 1,
    preferencia: 1,
    historia: 1,
    tempo: 1,
  },
  historiaPrimeiro: {
    risco: 3,
    desbloqueio: 1,
    proximidade: 1,
    densidade: 0.5,
    preferencia: 1,
    historia: 4,
    tempo: 1,
  },
}

export const pesosDe = (perfil: Perfil, sobrescrita?: Partial<Pesos>): Pesos => ({
  ...PESOS[perfil],
  ...sobrescrita,
})
