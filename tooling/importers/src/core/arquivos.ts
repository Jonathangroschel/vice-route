import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Document, isMap, isSeq, parse, visit } from 'yaml'

export const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')
export const DATA = join(RAIZ, 'data')
export const CACHE = join(RAIZ, 'tooling/importers/cache')
export const RELATORIOS = join(RAIZ, 'tooling/importers/relatorios')

/** Chaves cujo valor fica em estilo de fluxo ({ x: 1, y: 2 }) para o YAML ficar compacto e legível. */
const FLUXO = new Set([
  'posicao',
  'disponivel_desde',
  'perdivel_apos',
  'ids_fonte',
  'regra_100',
  'origem',
  'tamanho',
  'recorte',
  'base',
  'fonte',
])

export function paraYaml(dados: unknown, cabecalho?: string): string {
  const doc = new Document(dados, { aliasDuplicateObjects: false })
  visit(doc, {
    Pair(_, par) {
      const chave = String((par.key as { value?: unknown })?.value ?? par.key)
      if (FLUXO.has(chave) && isMap(par.value)) par.value.flow = true
      if (chave === 'fontes' && isSeq(par.value))
        par.value.items.forEach((i) => isMap(i) && (i.flow = true))
      if (chave === 'dicas' && isSeq(par.value))
        par.value.items.forEach((i) => isMap(i) && (i.flow = true))
    },
  })
  if (cabecalho) doc.commentBefore = ' ' + cabecalho.split('\n').join('\n ')
  return doc.toString({ lineWidth: 0, flowCollectionPadding: true })
}

/** Escrita atômica: grava num temporário e renomeia (RF-002-06). */
export function escreverAtomico(caminho: string, conteudo: string) {
  mkdirSync(dirname(caminho), { recursive: true })
  const tmp = `${caminho}.tmp-${process.pid}`
  writeFileSync(tmp, conteudo)
  renameSync(tmp, caminho)
}

export function lerYaml<T>(caminho: string, padrao: T): T {
  if (!existsSync(caminho)) return padrao
  return (parse(readFileSync(caminho, 'utf8')) as T) ?? padrao
}

/** Baixa um arquivo com cache em disco por fonte e versão (o cache fica fora do git). */
export async function baixar(
  url: string,
  fonte: string,
  versao: string,
  nome: string,
): Promise<string> {
  const destino = join(CACHE, fonte, versao, nome)
  if (existsSync(destino)) return readFileSync(destino, 'utf8')
  const r = await fetch(url, { headers: { 'user-agent': 'vice-route-importer' } })
  if (!r.ok) throw new Error(`falha ao baixar ${url}: HTTP ${r.status}`)
  const texto = await r.text()
  escreverAtomico(destino, texto)
  return texto
}

/** SHA do último commit de um repositório público no GitHub (para fixar a versão da fonte, RF-002-13). */
export async function commitAtual(repo: string, ref = 'HEAD'): Promise<string> {
  const fixo = process.env.FONTE_COMMIT
  if (fixo) return fixo
  const r = await fetch(`https://api.github.com/repos/${repo}/commits/${ref}`, {
    headers: { accept: 'application/vnd.github+json', 'user-agent': 'vice-route-importer' },
  })
  if (!r.ok) throw new Error(`não consegui ler o commit de ${repo}: HTTP ${r.status}`)
  return ((await r.json()) as { sha: string }).sha
}
