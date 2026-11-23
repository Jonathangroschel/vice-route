import type { NoCompilado } from '@vice-route/catalog-schema'
import type { Status } from '@vice-route/engine'

/** Nome exibível respeitando o teto de spoiler e as revelações individuais (spec 009). */
export function nomeVisivel(
  no: NoCompilado | undefined,
  teto: number,
  revelados: string[],
): string {
  if (!no) return 'Item desconhecido'
  if (no.spoiler <= teto || revelados.includes(no.id)) return no.nome
  if (no.tipo === 'missao') {
    const qual =
      no.subtipo === 'principal'
        ? 'Missão principal'
        : no.subtipo === 'oculta'
          ? 'Missão oculta'
          : 'Missão secundária'
    return no.capitulo_referencia !== undefined
      ? `${qual} · capítulo ${no.capitulo_referencia}`
      : qual
  }
  if (no.tipo === 'gatilho') return 'Ação escondida'
  return 'Item escondido'
}

export const ocultoPorSpoiler = (no: NoCompilado | undefined, teto: number, revelados: string[]) =>
  !!no && no.spoiler > teto && !revelados.includes(no.id)

export const ROTULO_STATUS: Record<Status, string> = {
  concluido: 'Concluído',
  disponivel: 'Disponível',
  bloqueado: 'Bloqueado',
  futuro: 'Ainda não liberado',
  perdido: 'Perdido',
}

export const ROTULO_REGIAO = (id: string | undefined) =>
  id
    ? id
        .replace('regiao:', '')
        .split('-')
        .map((p) => p[0]!.toUpperCase() + p.slice(1))
        .join(' ')
    : 'Sem região'

/** Normaliza para busca: sem acento, sem caixa. */
export const normalizar = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
