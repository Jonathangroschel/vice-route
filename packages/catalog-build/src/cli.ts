import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { CatalogoCompilado, Manifest } from '@vice-route/catalog-schema'
import { criarManifest, proximaVersao } from './compilar.ts'
import { rodarCenarios } from './golden.ts'
import { formatar, type Problema } from './problemas.ts'
import { verificar } from './index.ts'

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const DATA = join(RAIZ, 'data')
const SAIDA = join(RAIZ, 'apps/web/public/catalog')
const GOLDEN = join(RAIZ, 'golden/catalogo')
const github = !!process.env.GITHUB_ACTIONS

const kb = (s: string) =>
  `${(Buffer.byteLength(s) / 1024).toFixed(0)} KB (gzip ${(gzipSync(s).length / 1024).toFixed(0)} KB)`

function imprimir(problemas: Problema[]) {
  const erros = problemas.filter((p) => p.nivel === 'erro')
  const avisos = problemas.filter((p) => p.nivel === 'aviso')
  const agrupados = new Map<string, number>()
  for (const p of avisos) agrupados.set(p.codigo, (agrupados.get(p.codigo) ?? 0) + 1)
  for (const p of erros) console.log(formatar(p, github))
  // Avisos numerosos (ex.: SEM_POSICAO) aparecem resumidos; os demais, por extenso
  for (const p of avisos) if ((agrupados.get(p.codigo) ?? 0) <= 10) console.log(formatar(p, github))
  for (const [c, n] of agrupados)
    if (n > 10) console.log(`⚠ ${c.padEnd(24)} ${n} ocorrências (use catalog:report para a lista)`)
  console.log(`\n${erros.length} erro(s), ${avisos.length} aviso(s)`)
}

function idsAnteriores(): Set<string> | undefined {
  const m = join(SAIDA, 'manifest.json')
  if (!existsSync(m)) return undefined
  const manifest = JSON.parse(readFileSync(m, 'utf8')) as Manifest
  const arq = join(SAIDA, manifest.arquivos['catalog.json']!.caminho)
  if (!existsSync(arq)) return undefined
  const cat = JSON.parse(readFileSync(arq, 'utf8')) as CatalogoCompilado
  return new Set([...cat.nos.map((n) => n.id), ...Object.keys(cat.aliases)])
}

function check(): boolean {
  const v = verificar(DATA, { idsAnteriores: idsAnteriores() })
  imprimir(v.problemas)
  if (v.artefatos) {
    const a = v.artefatos.arquivos
    console.log(
      `catalog.json ${kb(a['catalog.json'])} · precomputed.json ${kb(a['precomputed.json'])} · search-index.json ${kb(a['search-index.json'])}`,
    )
    console.log(
      `${v.artefatos.catalogo.nos.length} nós, ${v.artefatos.catalogo.categorias.length} categorias`,
    )
  }
  const cenarios = rodarCenarios(GOLDEN)
  for (const c of cenarios) {
    console.log(`${c.ok ? '✔' : '✖'} cenário-ouro ${c.nome}`)
    for (const f of c.falhas) console.log(`    ${f}`)
  }
  return v.ok && cenarios.every((c) => c.ok)
}

function build(): boolean {
  const anterior = existsSync(join(SAIDA, 'manifest.json'))
    ? (JSON.parse(readFileSync(join(SAIDA, 'manifest.json'), 'utf8')) as Manifest)
    : undefined
  const versao = process.env.CATALOGO_VERSAO ?? proximaVersao(new Date(), anterior?.versao)
  const v = verificar(DATA, { versao, idsAnteriores: idsAnteriores() })
  imprimir(v.problemas)
  if (!v.ok || !v.artefatos) return false
  mkdirSync(join(SAIDA, versao), { recursive: true })
  for (const [nome, conteudo] of Object.entries(v.artefatos.arquivos))
    writeFileSync(join(SAIDA, versao, nome), conteudo)
  const manifest = criarManifest(versao, v.artefatos.arquivos, new Date().toISOString())
  writeFileSync(join(SAIDA, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
  console.log(`versão ${versao} gravada em apps/web/public/catalog/`)
  return true
}

function report(): boolean {
  const v = verificar(DATA)
  const nos = [...(v.indices?.ativos.values() ?? [])]
  const linhas: string[] = ['# Relatório de cobertura do catálogo', '']
  linhas.push('| Categoria | No catálogo | Total no jogo | Regra de 100% |', '|---|---:|---:|---|')
  for (const c of v.fonte.categorias.sort((a, b) => a.ordem - b.ordem)) {
    const n = nos.filter((x) => x.categoria === c.id).length
    const r = c.regra_100
    const regra = r.tipo === 'nenhuma' ? '—' : `${r.tipo} ≥ ${r.minimo}`
    linhas.push(`| ${c.nome} (\`${c.id}\`) | ${n} | ${c.total ?? '?'} | ${regra} |`)
  }
  const conta = (f: (n: (typeof nos)[number]) => boolean) => nos.filter(f).length
  linhas.push(
    '',
    `- Nós ativos: ${nos.length}`,
    `- Sem posição (itens): ${conta((n) => n.tipo === 'item' && !n.posicao)}`,
    `- Sem duração: ${conta((n) => n.duracao_min === undefined)}`,
    `- Não confirmados: ${conta((n) => n.status === 'nao_confirmado')}`,
    `- Confirmados: ${conta((n) => n.status === 'confirmado')}`,
    `- Missões: ${conta((n) => n.tipo === 'missao')} · gatilhos: ${conta((n) => n.tipo === 'gatilho')} · com janela de perda: ${conta((n) => !!n.perdivel_apos)}`,
  )
  console.log(linhas.join('\n'))
  return v.ok
}

const comandos: Record<string, () => boolean> = { check, build, report }
const cmd = process.argv[2] ?? 'check'
if (!comandos[cmd]) {
  console.error(`comando desconhecido: ${cmd} (use check, build ou report)`)
  process.exit(2)
}
process.exit(comandos[cmd]() ? 0 : 1)
