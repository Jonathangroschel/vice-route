import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from 'yaml'
import { verificar } from './index.ts'

/**
 * Cenário-ouro do catálogo: pasta `golden/catalogo/<nome>/` com `data/` e `esperado.yaml`:
 *
 *   erros: [NASCE_PERDIDO]            # códigos que DEVEM aparecer (vazio = catálogo válido)
 *   verificar:                         # asserções sobre o pré-cálculo ou o catálogo compilado
 *     - caminho: [perdiveis_por_missao, "missao:principal-015", inicio]
 *       contem: ["missao:oculta-exemplo-01"]
 *     - caminho: [valor_desbloqueio, "gatilho:loja-x-noite"]
 *       igual: { total: 2, conta_100: 2, perdiveis: 2 }
 */
interface Esperado {
  descricao?: string
  erros?: string[]
  verificar?: {
    alvo?: 'precalculo' | 'catalogo'
    caminho: string[]
    contem?: unknown[]
    igual?: unknown
    ausente?: boolean
  }[]
}

export interface ResultadoCenario {
  nome: string
  ok: boolean
  falhas: string[]
}

const pegar = (obj: unknown, caminho: string[]): unknown =>
  caminho.reduce<unknown>(
    (o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined),
    obj,
  )

export function rodarCenarios(dir: string): ResultadoCenario[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(dir, d.name, 'esperado.yaml')))
    .map((d) => d.name)
    .sort()
    .map((nome) => {
      const base = join(dir, nome)
      const esperado = parse(readFileSync(join(base, 'esperado.yaml'), 'utf8')) as Esperado
      const v = verificar(join(base, 'data'))
      const falhas: string[] = []
      const codigos = new Set(v.problemas.filter((p) => p.nivel === 'erro').map((p) => p.codigo))
      const esperados = esperado.erros ?? []
      for (const c of esperados) if (!codigos.has(c as never)) falhas.push(`esperava erro ${c}`)
      if (!esperados.length && !v.ok) {
        falhas.push(
          `catálogo deveria ser válido: ${v.problemas
            .filter((p) => p.nivel === 'erro')
            .map((p) => `${p.codigo} ${p.mensagem}`)
            .join('; ')}`,
        )
      }
      for (const a of esperado.verificar ?? []) {
        if (!v.artefatos) {
          falhas.push(`sem artefatos para verificar ${a.caminho.join('.')}`)
          continue
        }
        const raiz = a.alvo === 'catalogo' ? v.artefatos.catalogo : v.artefatos.precalculo
        const valor = pegar(raiz, a.caminho)
        const rot = a.caminho.join(' › ')
        if (a.ausente && valor !== undefined) falhas.push(`${rot}: deveria estar ausente`)
        if (a.igual !== undefined && JSON.stringify(valor) !== JSON.stringify(a.igual)) {
          falhas.push(
            `${rot}: esperado ${JSON.stringify(a.igual)}, obtido ${JSON.stringify(valor)}`,
          )
        }
        for (const item of a.contem ?? []) {
          if (
            !Array.isArray(valor) ||
            !valor.some((x) => JSON.stringify(x) === JSON.stringify(item))
          ) {
            falhas.push(
              `${rot}: deveria conter ${JSON.stringify(item)}, obtido ${JSON.stringify(valor)}`,
            )
          }
        }
      }
      return { nome, ok: falhas.length === 0, falhas }
    })
}
