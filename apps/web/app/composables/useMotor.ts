import * as Comlink from 'comlink'
import type { AtomoFaltante, ResultadoNo } from '@vice-route/engine'
import type { ApiMotor } from '../workers/motor.worker'

type ResultadoSerial = Awaited<ReturnType<ApiMotor['calcular']>>

const resultado = shallowRef<ResultadoSerial | null>(null)
const porId = shallowRef(new Map<string, ResultadoNo>())
let iniciado = false

/** Liga o estado da jogada ao motor no Worker, com debounce de 150 ms (spec 008 plano §5). */
export function useMotor() {
  if (!iniciado && import.meta.client) {
    iniciado = true
    const { catalogo, precalculo, pronto } = useCatalogo()
    const { paraMotor } = useJogada()
    const worker = new Worker(new URL('../workers/motor.worker.ts', import.meta.url), {
      type: 'module',
    })
    const motor = Comlink.wrap<ApiMotor>(worker)
    let timer: ReturnType<typeof setTimeout> | null = null
    let carregado = false

    const calcular = async () => {
      if (!catalogo.value || !precalculo.value) return
      if (!carregado) {
        await motor.carregar(catalogo.value, precalculo.value)
        carregado = true
      }
      const r = await motor.calcular(JSON.parse(JSON.stringify(paraMotor.value)))
      resultado.value = r
      porId.value = new Map(r.nos.map((n) => [n.id, n]))
    }
    pronto.then(calcular)
    watch(
      paraMotor,
      () => {
        if (timer) clearTimeout(timer)
        timer = setTimeout(calcular, 150)
      },
      { deep: true },
    )
  }

  /** Cadeia de pré-requisitos em ordem de execução, sem repetição (como `oQueFalta` recursivo). */
  function oQueFalta(id: string): AtomoFaltante[] {
    const saida: AtomoFaltante[] = []
    const vistos = new Set<string>()
    const visitar = (alvo: string) => {
      for (const f of porId.value.get(alvo)?.faltantes ?? []) {
        const k = JSON.stringify(f)
        if (vistos.has(k)) continue
        vistos.add(k)
        if (f.tipo === 'concluido') visitar(f.id)
        saida.push(f)
      }
    }
    visitar(id)
    return saida
  }

  return { resultado, porId, oQueFalta }
}
