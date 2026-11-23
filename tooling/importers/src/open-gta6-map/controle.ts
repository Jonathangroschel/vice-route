/**
 * pnpm import:controle
 * Gera tooling/importers/open-gta6-map/controle.yaml: pares de pontos (unidades do Open GTA 6 Map →
 * pixels da imagem-base) usados na transformação afim (RF-002-15).
 *
 * Os pares saem de nomes de lugares presentes nas duas bases: rótulos e lugares do Open GTA 6 Map
 * casados com os lugares do Vice Atlas, que marca o ponto onde o mapa da Rockstar imprime cada nome.
 * O Vice Atlas é usado só como referência de posição desses rótulos (RF-002-16), nunca importado.
 * Pares podem ser corrigidos ou acrescentados à mão; marque-os com `manual: true` para serem preservados.
 */
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ajustarRobusto, residuos, resumoResiduos, type Par } from '../core/afim.ts'
import { RAIZ, baixar, escreverAtomico, lerYaml, paraYaml } from '../core/arquivos.ts'
import { carregarFonte } from './fonte.ts'

export const ARQ_CONTROLE = join(RAIZ, 'tooling/importers/src/open-gta6-map/controle.yaml')
const URL_VA = 'https://www.vice-atlas.com/map-data/leonida.json'
const TIPOS_PONTUAIS = new Set(['landmark', 'island', 'town', 'city'])

interface VaLugar {
  key: string
  name: string
  kind: string
  aliases?: string[]
  x: number
  y: number
}
export interface ArquivoControle {
  gerado_em: string
  edicao: string
  pares: (Par & { manual?: boolean; erro_px?: number })[]
  descartados?: { nome: string; erro_px: number }[]
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

async function main() {
  const { lugares, rotulos } = await carregarFonte()
  const hoje = new Date().toISOString().slice(0, 10)
  const va = JSON.parse(await baixar(URL_VA, 'vice-atlas', hoje, 'leonida.json')) as {
    basemap: { id: string }
    places: VaLugar[]
  }
  const porNome = new Map<string, VaLugar>()
  for (const p of va.places) {
    porNome.set(norm(p.name), p)
    for (const a of p.aliases ?? []) if (!porNome.has(norm(a))) porNome.set(norm(a), p)
  }
  const candidatos = new Map<string, Par>()
  for (const r of rotulos) {
    const v = porNome.get(norm(r.name))
    if (v)
      candidatos.set(`rotulo:${norm(r.name)}`, {
        nome: `${r.name} (rótulo)`,
        fonte: { x: r.x, y: r.y },
        base: { x: v.x, y: v.y },
      })
  }
  for (const l of lugares) {
    const v = porNome.get(norm(l.name))
    if (v && TIPOS_PONTUAIS.has(v.kind) && !candidatos.has(norm(l.name))) {
      candidatos.set(norm(l.name), {
        nome: l.name,
        fonte: { x: l.x, y: l.y },
        base: { x: v.x, y: v.y },
      })
    }
  }
  const anterior = lerYaml<ArquivoControle | null>(ARQ_CONTROLE, null)
  const manuais = (anterior?.pares ?? []).filter((p) => p.manual)
  const { transformacao, usados, descartados } = ajustarRobusto([...candidatos.values()])
  const finais = [...manuais, ...usados.filter((u) => !manuais.some((m) => m.nome === u.nome))]
  const erros = new Map(residuos(transformacao, finais).map((r) => [r.nome, r.erro]))
  const erroDesc = new Map(residuos(transformacao, descartados).map((r) => [r.nome, r.erro]))
  const arq: ArquivoControle = {
    gerado_em: hoje,
    edicao: va.basemap.id,
    pares: finais.map((p) => ({ ...p, erro_px: Math.round(erros.get(p.nome)!) })),
    descartados: descartados.map((p) => ({
      nome: p.nome,
      erro_px: Math.round(erroDesc.get(p.nome)!),
    })),
  }
  escreverAtomico(
    ARQ_CONTROLE,
    paraYaml(
      arq,
      'Pontos de controle Open GTA 6 Map → imagem-base. Gerado por pnpm import:controle; pares com manual: true são preservados.',
    ),
  )
  const r = resumoResiduos(transformacao, finais)
  console.log(
    `${candidatos.size} candidatos, ${finais.length} usados, ${descartados.length} descartados`,
  )
  console.log(
    `resíduo médio ${r.medio.toFixed(1)} px, mediano ${r.mediano.toFixed(1)} px, máximo ${r.maximo.toFixed(1)} px`,
  )
  console.log(
    'transformação',
    Object.fromEntries(Object.entries(transformacao).map(([k, v]) => [k, +v.toFixed(5)])),
  )
}

if (fileURLToPath(import.meta.url) === resolve(process.argv[1] ?? '')) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e)
    process.exit(1)
  })
}
