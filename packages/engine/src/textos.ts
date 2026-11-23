import type { Contexto } from './contexto.ts'
import type { CodigoMotivo, Motivo } from './tipos.ts'

/**
 * Nome exibível de um nó respeitando o teto de spoiler (spec 008 H7, spec 009).
 * Acima do teto, e sem revelação individual, vira um rótulo neutro.
 */
export function rotulo(ctx: Contexto, id: string): string {
  const no = ctx.idx.nos.get(id)
  if (!no) return 'um item'
  if (no.spoiler <= ctx.e.tetoSpoiler || ctx.e.revelados.includes(id)) return no.nome
  if (no.tipo === 'missao') {
    return no.capitulo_referencia !== undefined
      ? `uma missão do capítulo ${no.capitulo_referencia}`
      : 'uma missão'
  }
  if (no.tipo === 'gatilho') return 'uma ação'
  return 'um item'
}

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`

/** Templates pt-BR dos motivos (docs/05 §3.8). */
export function motivo(
  ctx: Contexto,
  codigo: CodigoMotivo,
  params: Record<string, string | number>,
): Motivo {
  let frase: string
  switch (codigo) {
    case 'PERDIVEL_EM': {
      const n = Number(params.n)
      const acao = params.momento === 'conclusao' ? 'concluir' : 'iniciar'
      const alvo = rotulo(ctx, String(params.missao))
      frase = n <= 1 ? `Some ao ${acao} ${alvo}` : `Some em ${n} missões, ao ${acao} ${alvo}`
      break
    }
    case 'DESTRAVA': {
      const k = Number(params.k)
      const p = Number(params.perdiveis)
      frase = `Libera ${plural(k, 'item', 'itens')}${p > 0 ? ` (${plural(p, 'perdível', 'perdíveis')})` : ''}`
      break
    }
    case 'PERTO':
      frase = params.metros !== undefined ? `A ${params.metros} m de você` : 'Perto de você'
      break
    case 'CLUSTER':
      frase = `${params.k} pendentes por perto`
      break
    case 'FAVORITA':
      frase = 'Categoria favorita'
      break
    case 'PROXIMA_HISTORIA':
      frase = 'Próxima missão da história'
      break
    case 'CAMINHO_EXCLUIDO':
      frase = 'Indisponível nesta jogada por uma escolha ou perda anterior'
      break
    case 'CATEGORIA_FECHADA':
      frase = 'Categoria já completa para os 100%'
      break
  }
  return { codigo, params, frase }
}

export const ORDEM_MOTIVOS: CodigoMotivo[] = [
  'PERDIVEL_EM',
  'DESTRAVA',
  'PROXIMA_HISTORIA',
  'PERTO',
  'CLUSTER',
  'FAVORITA',
  'CATEGORIA_FECHADA',
  'CAMINHO_EXCLUIDO',
]
