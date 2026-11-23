import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, relative, basename } from 'node:path'
import { LineCounter, parseDocument, type Document, type Node as YamlNode } from 'yaml'
import type { z } from 'zod'
import { Capitulo, Categoria, ImagemBase, No, Regiao, Variavel } from '@vice-route/catalog-schema'
import type {
  No as NoT,
  Categoria as CategoriaT,
  Capitulo as CapituloT,
  Regiao as RegiaoT,
  Variavel as VariavelT,
  ImagemBase as ImagemBaseT,
} from '@vice-route/catalog-schema'
import { type Problema, erro } from './problemas.ts'

export interface Origem {
  arquivo: string
  linha?: number
}

export interface NoCarregado {
  no: NoT
  origem: Origem
}

export interface FonteCatalogo {
  raiz: string
  mapa: ImagemBaseT | null
  categorias: CategoriaT[]
  regioes: RegiaoT[]
  capitulos: CapituloT[]
  variaveis: VariavelT[]
  nos: NoCarregado[]
  problemas: Problema[]
}

const ARQUIVOS_DE_NOS = [
  'gatilhos.yaml',
  'marcos.yaml',
  'missoes/principais.yaml',
  'missoes/secundarias.yaml',
  'missoes/ocultas.yaml',
]

function linhaDe(doc: Document, lc: LineCounter, caminho: (string | number)[]): number | undefined {
  for (let n = caminho.length; n >= 0; n--) {
    const no = doc.getIn(caminho.slice(0, n), true) as YamlNode | undefined
    if (no && typeof no === 'object' && 'range' in no && no.range)
      return lc.linePos(no.range[0]).line
  }
  return undefined
}

interface Lido {
  doc: Document
  lc: LineCounter
  dados: unknown
  arquivo: string
}

function ler(raiz: string, rel: string, problemas: Problema[]): Lido | null {
  const caminho = join(raiz, rel)
  if (!existsSync(caminho)) return null
  const lc = new LineCounter()
  const doc = parseDocument(readFileSync(caminho, 'utf8'), { lineCounter: lc, prettyErrors: false })
  if (doc.errors.length) {
    for (const e of doc.errors) {
      problemas.push(erro('YAML', e.message, { arquivo: rel, linha: lc.linePos(e.pos[0]).line }))
    }
    return null
  }
  return { doc, lc, dados: doc.toJS() ?? [], arquivo: rel }
}

function validarItem<S extends z.ZodType>(
  esquema: S,
  valor: unknown,
  lido: Lido,
  caminhoBase: (string | number)[],
  problemas: Problema[],
): z.infer<S> | null {
  const r = esquema.safeParse(valor)
  if (r.success) return r.data
  for (const issue of r.error.issues) {
    const caminho = [...caminhoBase, ...(issue.path as (string | number)[])]
    problemas.push(
      erro('ESQUEMA', issue.message, {
        arquivo: lido.arquivo,
        linha: linhaDe(lido.doc, lido.lc, caminho),
        campo: caminho.join('.'),
      }),
    )
  }
  return null
}

function lista<S extends z.ZodType>(
  esquema: S,
  lido: Lido | null,
  problemas: Problema[],
): { valor: z.infer<S>; linha?: number }[] {
  if (!lido) return []
  if (!Array.isArray(lido.dados)) {
    problemas.push(erro('ESQUEMA', 'o arquivo deve conter uma lista', { arquivo: lido.arquivo }))
    return []
  }
  const out: { valor: z.infer<S>; linha?: number }[] = []
  lido.dados.forEach((v, i) => {
    const ok = validarItem(esquema, v, lido, [i], problemas)
    if (ok) out.push({ valor: ok, linha: linhaDe(lido.doc, lido.lc, [i]) })
  })
  return out
}

/** Carrega e valida por esquema todos os arquivos de `data/`. */
export function carregarCatalogo(raiz: string): FonteCatalogo {
  const problemas: Problema[] = []
  const lidoMapa = ler(raiz, 'mapa.yaml', problemas)
  let mapa: ImagemBaseT | null = null
  if (lidoMapa) mapa = validarItem(ImagemBase, lidoMapa.dados, lidoMapa, [], problemas)
  else problemas.push(erro('ARQUIVO_AUSENTE', 'mapa.yaml é obrigatório', { arquivo: 'mapa.yaml' }))

  const categorias = lista(Categoria, ler(raiz, 'categorias.yaml', problemas), problemas).map(
    (x) => x.valor,
  )
  const regioes = lista(Regiao, ler(raiz, 'regioes.yaml', problemas), problemas).map((x) => x.valor)
  const capitulos = lista(Capitulo, ler(raiz, 'capitulos.yaml', problemas), problemas).map(
    (x) => x.valor,
  )
  const variaveis = lista(Variavel, ler(raiz, 'variaveis.yaml', problemas), problemas).map(
    (x) => x.valor,
  )

  const nos: NoCarregado[] = []
  const arquivosNos = [...ARQUIVOS_DE_NOS]
  const dirItens = join(raiz, 'itens')
  if (existsSync(dirItens)) {
    for (const f of readdirSync(dirItens)
      .filter((f) => f.endsWith('.yaml'))
      .sort())
      arquivosNos.push(`itens/${f}`)
  }
  for (const rel of arquivosNos) {
    const lido = ler(raiz, rel, problemas)
    for (const { valor, linha } of lista(No, lido, problemas)) {
      nos.push({ no: valor, origem: { arquivo: rel, linha } })
      if (rel.startsWith('itens/')) {
        const esperada = basename(rel, '.yaml')
        if (valor.categoria !== esperada) {
          problemas.push(
            erro(
              'CATEGORIA_ARQUIVO',
              `nó ${valor.id} declara categoria "${valor.categoria}" no arquivo da categoria "${esperada}"`,
              {
                arquivo: rel,
                linha,
                campo: 'categoria',
              },
            ),
          )
        }
      }
    }
  }
  return {
    raiz: relative(process.cwd(), raiz) || '.',
    mapa,
    categorias,
    regioes,
    capitulos,
    variaveis,
    nos,
    problemas,
  }
}
