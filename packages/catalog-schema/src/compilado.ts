import type { Categoria, Capitulo, Regiao, Variavel, ImagemBase } from './estrutura.ts'
import type { No } from './no.ts'
import type { Fonte } from './comum.ts'

/** Nó como publicado no catalog.json: sem observações de curadoria nem IDs de fontes externas. */
export type NoCompilado = Omit<No, 'fontes' | 'ids_fonte'> & {
  fontes: Omit<Fonte, 'obs'>[]
}

export type CategoriaCompilada = Omit<Categoria, 'obs' | 'fontes'> & {
  fontes: Omit<Fonte, 'obs'>[]
  /** Pinos ativos (não depreciados) no catálogo. */
  no_catalogo: number
}

export interface CatalogoCompilado {
  versao: string
  mapa: ImagemBase
  categorias: CategoriaCompilada[]
  regioes: Regiao[]
  capitulos: Capitulo[]
  variaveis: Variavel[]
  nos: NoCompilado[]
  /** alias → id final (cadeias resolvidas). */
  aliases: Record<string, string>
}

export interface PreCalculo {
  versao: string
  ordem_principais: { id: string; indice: number }[]
  descendentes: Record<string, string[]>
  valor_desbloqueio: Record<string, { total: number; conta_100: number; perdiveis: number }>
  perdiveis_por_missao: Record<string, { inicio: string[]; conclusao: string[] }>
  clusters: { regiao: string | null; centro: { x: number; y: number }; nos: string[] }[]
}

export interface EntradaBusca {
  id: string
  nome: string
  nome_original?: string
  categoria: string | null
  aliases: string[]
  spoiler: number
}

export interface Manifest {
  versao: string
  gerado_em: string
  arquivos: Record<string, { caminho: string; sha256: string; bytes: number }>
}
