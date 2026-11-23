import { z } from 'zod'

const semHtml = (s: string) => !/<[a-z/!][^>]*>/i.test(s)

/** Texto curto exibido ao jogador: sem HTML, com limite de tamanho. */
export const texto = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .refine(semHtml, { message: 'HTML não é permitido em textos do catálogo' })

export const PREFIXOS_NO = ['missao', 'item', 'gatilho', 'marco'] as const
export type PrefixoNo = (typeof PREFIXOS_NO)[number]

const KEBAB = '[a-z0-9]+(?:-[a-z0-9]+)*'

export const IdNo = z.string().regex(new RegExp(`^(${PREFIXOS_NO.join('|')}):${KEBAB}$`), {
  message: 'ID de nó deve ser <tipo>:<kebab-case>, com tipo missao, item, gatilho ou marco',
})

export const IdRegiao = z
  .string()
  .regex(new RegExp(`^regiao:${KEBAB}$`), { message: 'ID de região deve ser regiao:<kebab-case>' })

export const IdSimples = z
  .string()
  .regex(new RegExp(`^${KEBAB}$`), { message: 'ID deve estar em kebab-case' })

export const NivelSpoiler = z.number().int().min(0).max(3)

export const TIPOS_FONTE = [
  'oficial',
  'trofeu',
  'referencia',
  'aberto',
  'comunidade',
  'jogado',
] as const

export const Fonte = z.strictObject({
  tipo: z.enum(TIPOS_FONTE),
  nome: z.string().min(1).max(120).optional(),
  url: z.url({ protocol: /^https$/, message: 'URL de fonte deve usar https' }).optional(),
  commit: z.string().min(4).max(64).optional(),
  licenca: z.string().min(2).max(40).optional(),
  data: z.iso.date().optional(),
  /** Observação de curadoria. Não vai para o catálogo compilado. */
  obs: z.string().max(500).optional(),
})
export type Fonte = z.infer<typeof Fonte>

export const STATUS = [
  'nao_confirmado',
  'referencia',
  'confirmado',
  'contestado',
  'depreciado',
] as const
export const Status = z.enum(STATUS)
export type Status = z.infer<typeof Status>

/** Posição em pixels da imagem-base original (ADR 003): origem no canto superior esquerdo, y para baixo. */
export const Posicao = z.strictObject({
  x: z.number().finite(),
  y: z.number().finite(),
  qualidade: z.enum(['verificada', 'aproximada']),
  representa: z.enum(['ponto', 'entrada', 'area_busca']),
})
export type Posicao = z.infer<typeof Posicao>

export const Personagem = z.enum(['jason', 'lucia', 'ambos', 'qualquer'])
export type Personagem = z.infer<typeof Personagem>
