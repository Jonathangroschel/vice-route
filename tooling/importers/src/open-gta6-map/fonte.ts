import { baixar, commitAtual } from '../core/arquivos.ts'

export const REPO = 'fbritoferreira/gta6'
export const NOME_FONTE = 'open-gta6-map'

export interface LocalFonte {
  id: string
  kind: string
  type: string
  x: number
  y: number
  name: string
  description: string
  screenshot: string | null
  area?: string
  region?: string | null
  confidence?: string | null
}

export interface LugarFonte {
  id: string
  kind: string
  x: number
  y: number
  name: string
}

const arquivo = async <T>(commit: string, caminho: string, nome: string): Promise<T> =>
  JSON.parse(
    await baixar(
      `https://raw.githubusercontent.com/${REPO}/${commit}/${caminho}`,
      NOME_FONTE,
      commit,
      nome,
    ),
  ) as T

export async function carregarFonte() {
  const commit = await commitAtual(REPO)
  const [locais, removidos, lugares, rotulos] = await Promise.all([
    arquivo<LocalFonte[]>(commit, 'public/data/locations.json', 'locations.json'),
    arquivo<unknown>(commit, 'public/data/removed.json', 'removed.json'),
    arquivo<LugarFonte[]>(commit, 'public/data/places.json', 'places.json'),
    arquivo<{ name: string; x: number; y: number }[]>(
      commit,
      'public/data/labels.json',
      'labels.json',
    ),
  ])
  // removed.json: lista de { id, reason } ou mapa id → motivo
  const ids = Array.isArray(removidos)
    ? removidos.map((r) => (typeof r === 'string' ? r : (r as { id: string }).id))
    : Object.keys(removidos as object)
  return { commit, locais, removidos: new Set(ids), lugares, rotulos }
}
