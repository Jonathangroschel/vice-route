/**
 * pnpm import:open-gta6-map [--dry-run]
 * Importa os pinos de colecionáveis, atividades e crimes do Open GTA 6 Map (CC BY 4.0) para
 * data/itens/<categoria>.yaml, convertendo as posições para a imagem-base (spec 002 H1b).
 */
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import type { Fonte, NoEntrada, Regiao } from '@vice-route/catalog-schema'
import { CATEGORIAS, POR_TIPO } from '../categorias.ts'
import { ajustar, aplicar, resumoResiduos } from '../core/afim.ts'
import { DATA, RELATORIOS, escreverAtomico, lerYaml, paraYaml } from '../core/arquivos.ts'
import { mesclar, type ItemFonte } from '../core/mesclar.ts'
import { ARQ_CONTROLE, type ArquivoControle } from './controle.ts'
import { NOME_FONTE, REPO, carregarFonte } from './fonte.ts'

const LIMITE_RESIDUO_MEDIO_PX = Number(process.env.LIMITE_RESIDUO_PX ?? 100)
const dryRun = process.argv.includes('--dry-run')

/** Códigos de região da fonte → regiões do catálogo. */
const REGIOES: Record<string, { id: string; nome: string }> = {
  vice: { id: 'regiao:vice-city', nome: 'Vice City' },
  keys: { id: 'regiao:leonida-keys', nome: 'Leonida Keys' },
  gellhorn: { id: 'regiao:port-gellhorn', nome: 'Port Gellhorn' },
  hamlet: { id: 'regiao:hamlet', nome: 'Hamlet' },
  ambrosia: { id: 'regiao:ambrosia', nome: 'Ambrosia' },
  capri: { id: 'regiao:capri', nome: 'Capri' },
  watson: { id: 'regiao:watson-bay', nome: 'Watson Bay' },
  kalaga: { id: 'regiao:mount-kalaga', nome: 'Mount Kalaga' },
  grassrivers: { id: 'regiao:grassrivers', nome: 'Grassrivers' },
  leonard: { id: 'regiao:leonard', nome: 'Leonard' },
  lummox: { id: 'regiao:lummox-county', nome: 'Lummox County' },
  mariana: { id: 'regiao:mariana-county', nome: 'Mariana County' },
  kelly: { id: 'regiao:kelly-county', nome: 'Kelly County' },
  redhill: { id: 'regiao:red-hill', nome: 'Red Hill' },
}

const limpar = (s: string, max: number) => {
  const t = s
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t
}

async function main() {
  const { commit, locais, removidos } = await carregarFonte()
  const controle = lerYaml<ArquivoControle | null>(ARQ_CONTROLE, null)
  if (!controle?.pares.length)
    throw new Error('controle.yaml ausente: rode pnpm import:controle primeiro')
  const t = ajustar(controle.pares)
  const res = resumoResiduos(t, controle.pares)
  if (res.medio > LIMITE_RESIDUO_MEDIO_PX) {
    throw new Error(
      `resíduo médio ${res.medio.toFixed(1)} px acima do limite ${LIMITE_RESIDUO_MEDIO_PX} px; nada foi escrito`,
    )
  }

  const fonte: Fonte = {
    tipo: 'aberto',
    nome: 'Open GTA 6 Map',
    url: `https://github.com/${REPO}`,
    commit: commit.slice(0, 12),
    licenca: 'CC-BY-4.0',
  }
  const foraDoEscopo = new Map<string, number>()
  const itens: ItemFonte[] = []
  const regioesUsadas = new Set<string>()
  for (const l of locais) {
    if (removidos.has(l.id)) continue
    const alvo = POR_TIPO.get(`${l.kind}|${l.type}`)
    if (!alvo) {
      foraDoEscopo.set(l.type, (foraDoEscopo.get(l.type) ?? 0) + 1)
      continue
    }
    const p = aplicar(t, { x: l.x, y: l.y })
    const reg = l.region ? REGIOES[l.region] : undefined
    if (l.region && !reg) console.warn(`região desconhecida na fonte: ${l.region}`)
    if (reg) regioesUsadas.add(l.region!)
    itens.push({
      id_fonte: l.id,
      categoria: alvo.categoria.id,
      subtipo: alvo.categoria.subtipo,
      ...(alvo.conjunto ? { conjunto: alvo.conjunto } : {}),
      nome: limpar(l.name, 120),
      posicao: { x: Math.round(p.x), y: Math.round(p.y) },
      ...(reg ? { regiao: reg.id } : {}),
      ...(l.description?.trim() ? { dica: limpar(l.description, 280) } : {}),
      status: l.confidence ? 'referencia' : 'nao_confirmado',
      fonte,
    })
  }

  // Catálogo atual de itens
  const dirItens = join(DATA, 'itens')
  const existentes: NoEntrada[] = existsSync(dirItens)
    ? readdirSync(dirItens)
        .filter((f) => f.endsWith('.yaml'))
        .flatMap((f) => lerYaml<NoEntrada[]>(join(dirItens, f), []))
    : []
  const m = mesclar(NOME_FONTE, existentes, itens, removidos)

  // Relatório
  const hoje = new Date().toISOString().slice(0, 10)
  const conta = (r: string) => m.resultados.filter((x) => x.resultado === r).length
  const porCat = new Map<string, Record<string, number>>()
  for (const r of m.resultados) {
    const c = (porCat.get(r.categoria) ?? {}) as Record<string, number>
    c[r.resultado] = (c[r.resultado] ?? 0) + 1
    porCat.set(r.categoria, c)
  }
  const rel = [
    `# Importação Open GTA 6 Map: ${hoje}${dryRun ? ' (simulação)' : ''}`,
    '',
    `Fonte: ${REPO}@${commit.slice(0, 12)} (CC BY 4.0). ${locais.length} locais na fonte, ${removidos.size} IDs em removed.json.`,
    `Transformação afim com ${res.n} pontos de controle: resíduo médio ${res.medio.toFixed(1)} px, mediano ${res.mediano.toFixed(1)} px, máximo ${res.maximo.toFixed(1)} px (limite ${LIMITE_RESIDUO_MEDIO_PX} px).`,
    '',
    `Novos: ${conta('novo')} · mantidos: ${conta('mantido')} · atualizados: ${conta('atualizado')} · movidos: ${conta('movido')} · ausentes na fonte: ${m.ausentes.length}`,
    '',
    '| Categoria | Novos | Mantidos | Atualizados | Movidos |',
    '|---|---:|---:|---:|---:|',
    ...CATEGORIAS.filter((c) => porCat.has(c.id)).map((c) => {
      const x = porCat.get(c.id)!
      return `| ${c.nome} | ${x.novo ?? 0} | ${x.mantido ?? 0} | ${x.atualizado ?? 0} | ${x.movido ?? 0} |`
    }),
    '',
    '## Movidos (posição mudou mais de 5 px)',
    '',
    ...(m.resultados
      .filter((r) => r.resultado === 'movido')
      .map((r) => `- ${r.id} (${r.id_fonte}): ${r.deslocamento} px`) || []),
    '',
    '## Ausentes na fonte (não removidos do catálogo; decidir depreciação)',
    '',
    ...m.ausentes.map(
      (a) =>
        `- ${a.id} (${a.id_fonte})${a.removido_na_fonte ? ': removido de propósito na fonte (removed.json)' : ''}`,
    ),
    '',
    '## Fora do escopo (tipos não mapeados em src/categorias.ts)',
    '',
    [...foraDoEscopo.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([tipo, n]) => `${tipo} (${n})`)
      .join(', '),
    '',
  ].join('\n')

  if (!dryRun) {
    const cab = (cat: string) =>
      `Itens da categoria ${cat}. Pinos importados de Open GTA 6 Map (${REPO}, CC BY 4.0) por pnpm import:open-gta6-map,\ncom posições convertidas para a imagem-base. Campos de curadoria editados à mão são preservados na re-importação.`
    const porCategoria = new Map<string, NoEntrada[]>()
    for (const n of m.nos)
      porCategoria.set(n.categoria!, [...(porCategoria.get(n.categoria!) ?? []), n])
    for (const [cat, nos] of porCategoria)
      escreverAtomico(join(dirItens, `${cat}.yaml`), paraYaml(nos, cab(cat)))
    // Regiões: mantém as existentes e acrescenta as novas
    const arqReg = join(DATA, 'regioes.yaml')
    const regioes = new Map(lerYaml<Regiao[]>(arqReg, []).map((r) => [r.id, r]))
    for (const cod of regioesUsadas) {
      const r = REGIOES[cod]!
      if (!regioes.has(r.id)) regioes.set(r.id, { id: r.id, nome: r.nome })
    }
    escreverAtomico(
      arqReg,
      paraYaml(
        [...regioes.values()].sort((a, b) => a.id.localeCompare(b.id)),
        'Regiões de Leonida usadas pelo catálogo.',
      ),
    )
    escreverAtomico(join(RELATORIOS, `open-gta6-map-${hoje}.md`), rel)
  }
  console.log(rel.split('\n').slice(0, 9).join('\n'))
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
