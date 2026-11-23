import { createHash } from 'node:crypto'
import type {
  CatalogoCompilado,
  CategoriaCompilada,
  EntradaBusca,
  Fonte,
  Manifest,
  NoCompilado,
  PreCalculo,
} from '@vice-route/catalog-schema'
import type { FonteCatalogo } from './carregar.ts'
import { preCalcular } from './precalculo.ts'
import type { Indices } from './validar.ts'

/** JSON com chaves ordenadas e sem `undefined`: mesma entrada, mesmos bytes (RF-001-11). */
export function jsonDeterministico(valor: unknown): string {
  const ordenar = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(ordenar)
    if (v && typeof v === 'object') {
      return Object.fromEntries(
        Object.keys(v as object)
          .sort()
          .filter((k) => (v as Record<string, unknown>)[k] !== undefined)
          .map((k) => [k, ordenar((v as Record<string, unknown>)[k])]),
      )
    }
    return v
  }
  return JSON.stringify(ordenar(valor))
}

const semObs = (f: Fonte): Omit<Fonte, 'obs'> => {
  const { obs: _obs, ...resto } = f
  return resto
}

/** Resolve cadeias alias → alias → id até o nó final. */
function resolverAliases(aliases: Map<string, string>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const a of [...aliases.keys()].sort()) {
    let alvo = aliases.get(a)!
    const vistos = new Set([a])
    while (aliases.has(alvo) && !vistos.has(alvo)) {
      vistos.add(alvo)
      alvo = aliases.get(alvo)!
    }
    out[a] = alvo
  }
  return out
}

export interface Artefatos {
  catalogo: CatalogoCompilado
  precalculo: PreCalculo
  busca: EntradaBusca[]
  arquivos: Record<'catalog.json' | 'precomputed.json' | 'search-index.json', string>
}

export function compilar(fonte: FonteCatalogo, idx: Indices, versao: string): Artefatos {
  const nos: NoCompilado[] = [...idx.porId.values()]
    .map((n) => n.no)
    .filter((n) => !idx.aliases.has(n.id)) // fundidos saem dos nós (H4.1); continuam resolvidos pelo mapa de aliases
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((n) => {
      const { ids_fonte: _ids, fontes, ...resto } = n
      return { ...resto, fontes: fontes.map(semObs) }
    })

  const contagem = new Map<string, number>()
  for (const n of idx.ativos.values())
    if (n.categoria) contagem.set(n.categoria, (contagem.get(n.categoria) ?? 0) + 1)
  const categorias: CategoriaCompilada[] = [...fonte.categorias]
    .sort((a, b) => a.ordem - b.ordem || a.id.localeCompare(b.id))
    .map((c) => {
      const { obs: _obs, fontes, ...resto } = c
      return { ...resto, fontes: fontes.map(semObs), no_catalogo: contagem.get(c.id) ?? 0 }
    })

  const catalogo: CatalogoCompilado = {
    versao,
    mapa: fonte.mapa!,
    categorias,
    regioes: [...fonte.regioes].sort((a, b) => a.id.localeCompare(b.id)),
    capitulos: [...fonte.capitulos].sort((a, b) => a.numero - b.numero),
    variaveis: [...fonte.variaveis].sort((a, b) => a.nome.localeCompare(b.nome)),
    nos,
    aliases: resolverAliases(idx.aliases),
  }

  const aliasesPorNo = new Map<string, string[]>()
  for (const [a, alvo] of Object.entries(catalogo.aliases))
    aliasesPorNo.set(alvo, [...(aliasesPorNo.get(alvo) ?? []), a])
  const busca: EntradaBusca[] = nos
    .filter((n) => n.status !== 'depreciado')
    .map((n) => ({
      id: n.id,
      nome: n.nome,
      nome_original: n.nome_original,
      categoria: n.categoria,
      aliases: aliasesPorNo.get(n.id) ?? [],
      spoiler: n.spoiler,
    }))

  const precalculo = preCalcular(versao, idx)
  return {
    catalogo,
    precalculo,
    busca,
    arquivos: {
      'catalog.json': jsonDeterministico(catalogo),
      'precomputed.json': jsonDeterministico(precalculo),
      'search-index.json': jsonDeterministico(busca),
    },
  }
}

export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex')

export function criarManifest(
  versao: string,
  arquivos: Record<string, string>,
  geradoEm: string,
): Manifest {
  return {
    versao,
    gerado_em: geradoEm,
    arquivos: Object.fromEntries(
      Object.entries(arquivos)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([nome, conteudo]) => [
          nome,
          {
            caminho: `${versao}/${nome}`,
            sha256: sha256(conteudo),
            bytes: Buffer.byteLength(conteudo),
          },
        ]),
    ),
  }
}

/** Próxima versão AAAA.MM.DD-N, a partir da anterior publicada (H7.1). */
export function proximaVersao(hoje: Date, anterior?: string): string {
  const d = hoje.toISOString().slice(0, 10).replaceAll('-', '.')
  const m = anterior?.match(/^(\d{4}\.\d{2}\.\d{2})-(\d+)$/)
  const n = m && m[1] === d ? Number(m[2]) + 1 : 1
  return `${d}-${n}`
}
