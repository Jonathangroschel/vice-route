/**
 * pnpm import:limiares
 * Gera data/categorias.yaml e data/capitulos.yaml a partir das definições do Vice Route
 * (src/categorias.ts) e dos limiares de 100% do GTA6Maps (CC BY 4.0, docs/02 §1.6).
 */
import { join } from 'node:path'
import type { Categoria, Capitulo, Fonte } from '@vice-route/catalog-schema'
import { CATEGORIAS, ORDEM } from '../categorias.ts'
import {
  DATA,
  RELATORIOS,
  baixar,
  commitAtual,
  escreverAtomico,
  lerYaml,
  paraYaml,
} from '../core/arquivos.ts'

const REPO = 'duanhesen/gta6-leonida-map-data'
const ARQ = 'data/completion-100-thresholds.json'

interface Limiares {
  source: string
  license: string
  updated: string
  in_game_checklist_unlock?: string
  missable_items?: boolean
  story_chapters: {
    chapter: number
    title: string
    approx_missions?: number
    setting?: string
    safehouse?: string
  }[]
  thresholds: { category: string; required_for_100: number; total_in_game: number }[]
}

async function main() {
  const commit = await commitAtual(REPO)
  const bruto = await baixar(
    `https://raw.githubusercontent.com/${REPO}/${commit}/${ARQ}`,
    'gta6maps',
    commit,
    'thresholds.json',
  )
  const dados = JSON.parse(bruto) as Limiares
  const fonteLimiares: Fonte = {
    tipo: 'aberto',
    nome: 'GTA6Maps: 100% Completion Thresholds',
    url: `https://github.com/${REPO}`,
    commit: commit.slice(0, 12),
    licenca: 'CC-BY-4.0',
    data: dados.updated,
  }
  const porLimiar = new Map(dados.thresholds.map((t) => [t.category, t]))
  const existentes = new Map(
    lerYaml<Categoria[]>(join(DATA, 'categorias.yaml'), []).map((c) => [c.id, c]),
  )
  const relatorio: string[] = []
  const usados = new Set<string>()

  const categorias: Categoria[] = CATEGORIAS.map((def) => {
    const lim = def.limiar ? porLimiar.get(def.limiar) : undefined
    if (def.limiar && !lim)
      relatorio.push(`- ⚠ limiar "${def.limiar}" não encontrado na fonte; mantido o padrão local`)
    if (lim) usados.add(lim.category)
    let total = def.total
    let regra = def.regra
    if (lim && regra.tipo !== 'nenhuma') {
      const novoTotal =
        regra.tipo === 'conjuntos_completos'
          ? total
          : regra.tipo === 'contador' && total === null
            ? null
            : lim.total_in_game
      if (novoTotal !== total && total !== null)
        relatorio.push(`- ${def.id}: total local ${total}, fonte ${lim.total_in_game}`)
      if (lim.required_for_100 !== regra.minimo)
        relatorio.push(
          `- ${def.id}: mínimo local ${regra.minimo}, fonte ${lim.required_for_100}; vale o mais exigente`,
        )
      total = novoTotal
      regra = { ...regra, minimo: Math.max(regra.minimo, lim.required_for_100) }
    }
    const anterior = existentes.get(def.id)
    const fontes: Fonte[] = [
      ...(lim ? [fonteLimiares] : []),
      {
        tipo: 'referencia',
        nome: 'PowerPyx: 100% completion checklist',
        url: 'https://www.powerpyx.com/gta-6-100-completion-checklist/',
      },
      ...(def.tipos.length
        ? [
            {
              tipo: 'aberto' as const,
              nome: 'Open GTA 6 Map',
              url: 'https://github.com/fbritoferreira/gta6',
              licenca: 'CC-BY-4.0',
            },
          ]
        : []),
    ]
    return {
      id: def.id,
      nome: anterior?.nome ?? def.nome,
      ...(def.nome_original ? { nome_original: def.nome_original } : {}),
      grupo: def.grupo,
      cor: anterior?.cor ?? def.cor,
      ordem: ORDEM.get(def.id)!,
      total,
      regra_100: regra,
      ...(def.conjuntos ? { conjuntos: def.conjuntos.map(({ id, nome }) => ({ id, nome })) } : {}),
      ...(def.duracao_padrao_min ? { duracao_padrao_min: def.duracao_padrao_min } : {}),
      fontes,
      ...(def.obs ? { obs: def.obs } : {}),
    } satisfies Categoria
  })
  for (const t of dados.thresholds)
    if (!usados.has(t.category))
      relatorio.push(`- ⚠ categoria da fonte sem correspondência: "${t.category}"`)

  const capitulos: Capitulo[] = dados.story_chapters.map((c) => ({
    numero: c.chapter,
    titulo: c.title,
    ...(c.setting ? { regiao: c.setting } : {}),
    ...(c.safehouse ? { esconderijo: c.safehouse } : {}),
    ...(c.approx_missions ? { missoes_aprox: c.approx_missions } : {}),
    spoiler: 1,
    fontes: [fonteLimiares],
  }))

  const cab = `Gerado por pnpm import:limiares (fonte: ${REPO}@${commit.slice(0, 12)}, CC BY 4.0).\nNome e cor podem ser editados à mão; total e regra_100 são atualizados pela fonte.`
  escreverAtomico(join(DATA, 'categorias.yaml'), paraYaml(categorias, cab))
  escreverAtomico(join(DATA, 'capitulos.yaml'), paraYaml(capitulos, cab))
  const hoje = new Date().toISOString().slice(0, 10)
  const texto = [
    `# Importação de limiares: ${hoje}`,
    '',
    `Fonte: ${REPO}@${commit.slice(0, 12)} (${dados.license}), atualizada em ${dados.updated}.`,
    `Checklist do jogo: ${dados.in_game_checklist_unlock ?? '—'}. A fonte declara missable_items = ${dados.missable_items}; guias de perdíveis discordam (docs/02 §1.6).`,
    '',
    `${categorias.length} categorias, ${capitulos.length} capítulos.`,
    '',
    '## Divergências e avisos',
    '',
    ...(relatorio.length ? relatorio : ['Nenhuma.']),
    '',
  ].join('\n')
  escreverAtomico(join(RELATORIOS, `limiares-${hoje}.md`), texto)
  console.log(texto)
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
