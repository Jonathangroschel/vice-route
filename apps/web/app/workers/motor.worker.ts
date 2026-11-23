/// <reference lib="webworker" />
import * as Comlink from 'comlink'
import {
  antesDeAvancar,
  recomendar,
  serializar,
  type Catalogo,
  type EstadoJogada,
  type Precomputed,
} from '@vice-route/engine'

let c: Catalogo | null = null
let p: Precomputed | null = null

/** Motor de recomendação no Web Worker (spec 008 RF-008-14): a interface nunca trava. */
const api = {
  carregar(catalogo: Catalogo, precalculo: Precomputed) {
    c = catalogo
    p = precalculo
  },
  calcular(estado: EstadoJogada) {
    if (!c || !p) throw new Error('catálogo não carregado no worker')
    const t0 = performance.now()
    const r = recomendar(c, p, estado)
    const proxima = p.ordem_principais[r.indiceCampanha]?.id ?? null
    return {
      ...serializar(r),
      proximaPrincipal: proxima,
      antes: proxima ? antesDeAvancar(p, r, proxima) : { aoIniciar: [], aoConcluir: [] },
      ms: performance.now() - t0,
    }
  },
}

export type ApiMotor = typeof api
Comlink.expose(api)
