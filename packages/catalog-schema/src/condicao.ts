import { z } from 'zod'
import { IdNo, IdSimples, Personagem } from './comum.ts'

/**
 * Linguagem de pré-requisitos (docs/04 §3). Cada condição é um objeto com exatamente
 * uma chave: um operador (todos, qualquer, nao, pelo_menos) ou um átomo.
 */
export const OPERADORES = ['todos', 'qualquer', 'nao', 'pelo_menos'] as const
export const ATOMOS = [
  'concluido',
  'capitulo_minimo',
  'personagem',
  'variavel',
  'contagem',
] as const
const ACEITOS = [...OPERADORES, ...ATOMOS]

export type Condicao =
  | { todos: Condicao[] }
  | { qualquer: Condicao[] }
  | { nao: Condicao }
  | { pelo_menos: { n: number; de: Condicao[] } }
  | { concluido: string }
  | { capitulo_minimo: number }
  | { personagem: z.infer<typeof Personagem> }
  | {
      variavel: {
        nome: string
        igual?: string | number | boolean
        em?: (string | number)[]
        minimo?: number
      }
    }
  | { contagem: { categoria: string; minimo: number } }

const AtomoVariavel = z
  .strictObject({
    nome: IdSimples,
    igual: z.union([z.string(), z.number(), z.boolean()]).optional(),
    em: z
      .array(z.union([z.string(), z.number()]))
      .min(1)
      .optional(),
    minimo: z.number().optional(),
  })
  .refine((v) => [v.igual, v.em, v.minimo].filter((x) => x !== undefined).length === 1, {
    message: 'variavel precisa de exatamente um entre igual, em e minimo',
  })

export const Condicao: z.ZodType<Condicao> = z.lazy(() =>
  z
    .record(z.string(), z.unknown())
    .superRefine((obj, ctx) => {
      const chaves = Object.keys(obj)
      if (chaves.length !== 1 || !ACEITOS.includes(chaves[0] as (typeof ACEITOS)[number])) {
        ctx.addIssue({
          code: 'custom',
          message: `condição deve ter exatamente uma chave entre: ${ACEITOS.join(', ')} (recebido: ${chaves.join(', ') || 'nada'})`,
        })
      }
    })
    .pipe(
      z.union([
        z.strictObject({ todos: z.array(Condicao).min(1) }),
        z.strictObject({ qualquer: z.array(Condicao).min(1) }),
        z.strictObject({ nao: Condicao }),
        z.strictObject({
          pelo_menos: z.strictObject({ n: z.number().int().min(1), de: z.array(Condicao).min(1) }),
        }),
        z.strictObject({ concluido: IdNo }),
        z.strictObject({ capitulo_minimo: z.number().int().min(0) }),
        z.strictObject({ personagem: Personagem }),
        z.strictObject({ variavel: AtomoVariavel }),
        z.strictObject({
          contagem: z.strictObject({ categoria: IdSimples, minimo: z.number().int().min(1) }),
        }),
      ]),
    ),
) as z.ZodType<Condicao>

/** Condições que o app não consegue verificar; viram instrução, não bloqueio (docs/04 §4). */
export const CondicaoMomento = z.union([
  z.strictObject({
    horario: z.strictObject({
      de: z.number().int().min(0).max(23),
      ate: z.number().int().min(0).max(23),
    }),
  }),
  z.strictObject({ clima: z.enum(['sol', 'chuva', 'tempestade', 'neblina', 'nublado']) }),
  z.strictObject({ veiculo: z.string().min(1).max(40) }),
  z.strictObject({ livre: z.string().min(1).max(200) }),
])
export type CondicaoMomento = z.infer<typeof CondicaoMomento>

/** Percorre a condição chamando `visitar` em cada átomo. */
export function paraCadaAtomo(c: Condicao, visitar: (atomo: Condicao) => void): void {
  if ('todos' in c) c.todos.forEach((x) => paraCadaAtomo(x, visitar))
  else if ('qualquer' in c) c.qualquer.forEach((x) => paraCadaAtomo(x, visitar))
  else if ('nao' in c) paraCadaAtomo(c.nao, visitar)
  else if ('pelo_menos' in c) c.pelo_menos.de.forEach((x) => paraCadaAtomo(x, visitar))
  else visitar(c)
}

/** IDs de nós citados em átomos `concluido`. */
export function idsReferenciados(c: Condicao | undefined): string[] {
  if (!c) return []
  const ids: string[] = []
  paraCadaAtomo(c, (a) => {
    if ('concluido' in a) ids.push(a.concluido)
  })
  return ids
}
