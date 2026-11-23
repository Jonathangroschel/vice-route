import type {
  CatalogoCompilado,
  EntradaBusca,
  Manifest,
  NoCompilado,
  PreCalculo,
} from '@vice-route/catalog-schema'

interface EstadoCatalogo {
  carregando: boolean
  erro: string | null
  versao: string | null
}

const estado = reactive<EstadoCatalogo>({ carregando: true, erro: null, versao: null })
const catalogo = shallowRef<CatalogoCompilado | null>(null)
const precalculo = shallowRef<PreCalculo | null>(null)
const busca = shallowRef<EntradaBusca[]>([])
const nos = shallowRef(new Map<string, NoCompilado>())
let promessa: Promise<void> | null = null

/** Catálogo compilado (spec 001): manifest com versão e os três artefatos, servidos pela CDN. */
export function useCatalogo() {
  if (!promessa) {
    promessa = (async () => {
      try {
        const m = await $fetch<Manifest>('/catalog/manifest.json', { cache: 'no-cache' })
        const url = (nome: string) => `/catalog/${m.arquivos[nome]!.caminho}`
        const [c, p, b] = await Promise.all([
          $fetch<CatalogoCompilado>(url('catalog.json')),
          $fetch<PreCalculo>(url('precomputed.json')),
          $fetch<EntradaBusca[]>(url('search-index.json')),
        ])
        catalogo.value = c
        precalculo.value = p
        busca.value = b
        nos.value = new Map(c.nos.map((n) => [n.id, n]))
        estado.versao = m.versao
      } catch (e) {
        estado.erro = e instanceof Error ? e.message : String(e)
      } finally {
        estado.carregando = false
      }
    })()
  }

  const categorias = computed(
    () => new Map((catalogo.value?.categorias ?? []).map((c) => [c.id, c])),
  )
  const resolver = (id: string) => catalogo.value?.aliases[id] ?? id

  return { estado, catalogo, precalculo, busca, nos, categorias, resolver, pronto: promessa }
}
