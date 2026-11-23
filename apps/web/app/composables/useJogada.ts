import type { EstadoJogada, NivelSpoiler, Perfil } from '@vice-route/engine'

/**
 * Estado da jogada guardado no dispositivo. A sincronização com conta (Supabase) entra na spec 003;
 * até lá tudo fica no localStorage, com leitura e escrita protegidas.
 */
export interface Jogada {
  concluidos: string[]
  ultimaPrincipal: string | null
  principalEmAndamento: string | null
  personagem: 'jason' | 'lucia' | null
  perfil: Perfil
  tetoSpoiler: NivelSpoiler
  revelados: string[]
  categoriasFavoritas: string[]
  categoriasIgnoradas: string[]
  posicao: { x: number; y: number; em: number } | null
  filtros: {
    categoriasOcultas: string[]
    ocultarConcluidos: boolean
    mostrarFuturos: boolean
    mostrarPerdidos: boolean
  }
  tema: 'dark' | 'light'
}

const CHAVE = 'vice-route:jogada:v1'
const PADRAO: Jogada = {
  concluidos: [],
  ultimaPrincipal: null,
  principalEmAndamento: null,
  personagem: null,
  perfil: 'cacador100',
  tetoSpoiler: 1,
  revelados: [],
  categoriasFavoritas: [],
  categoriasIgnoradas: [],
  posicao: null,
  filtros: {
    categoriasOcultas: [],
    ocultarConcluidos: false,
    mostrarFuturos: false,
    mostrarPerdidos: true,
  },
  tema: 'dark',
}

function ler(): Jogada {
  try {
    const bruto = localStorage.getItem(CHAVE)
    if (!bruto) return structuredClone(PADRAO)
    const j = JSON.parse(bruto) as Partial<Jogada>
    return { ...structuredClone(PADRAO), ...j, filtros: { ...PADRAO.filtros, ...j.filtros } }
  } catch {
    return structuredClone(PADRAO)
  }
}

const jogada = ref<Jogada>(structuredClone(PADRAO))
let iniciado = false

export function useJogada() {
  if (!iniciado && import.meta.client) {
    iniciado = true
    jogada.value = ler()
    watch(
      jogada,
      (j) => {
        try {
          localStorage.setItem(CHAVE, JSON.stringify(j))
        } catch {
          /* armazenamento indisponível: segue só em memória */
        }
        document.documentElement.dataset.theme = j.tema
      },
      { deep: true, immediate: true },
    )
  }

  const concluidos = computed(() => new Set(jogada.value.concluidos))

  function alternar(id: string): boolean {
    const set = new Set(jogada.value.concluidos)
    const marcou = !set.has(id)
    if (marcou) set.add(id)
    else set.delete(id)
    jogada.value.concluidos = [...set].sort()
    return marcou
  }

  function revelar(id: string) {
    if (!jogada.value.revelados.includes(id)) jogada.value.revelados.push(id)
  }

  /** Estado no formato do motor (a posição fica só no dispositivo, princípio 17). */
  const paraMotor = computed<EstadoJogada>(() => ({
    concluidos: jogada.value.concluidos,
    ultimaPrincipal: jogada.value.ultimaPrincipal,
    principalEmAndamento: jogada.value.principalEmAndamento,
    personagem: jogada.value.personagem,
    variaveis: {},
    posicao: jogada.value.posicao ? { x: jogada.value.posicao.x, y: jogada.value.posicao.y } : null,
    perfil: jogada.value.perfil,
    categoriasFavoritas: jogada.value.categoriasFavoritas,
    categoriasIgnoradas: jogada.value.categoriasIgnoradas,
    tetoSpoiler: jogada.value.tetoSpoiler,
    revelados: jogada.value.revelados,
  }))

  return { jogada, concluidos, alternar, revelar, paraMotor }
}
