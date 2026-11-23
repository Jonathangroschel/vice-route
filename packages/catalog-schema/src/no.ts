import { z } from 'zod'
import {
  Fonte,
  IdNo,
  IdRegiao,
  IdSimples,
  NivelSpoiler,
  Personagem,
  Posicao,
  Status,
  texto,
} from './comum.ts'
import { Condicao, CondicaoMomento } from './condicao.ts'

export const TIPOS_NO = ['missao', 'item', 'gatilho', 'marco'] as const
export const SUBTIPOS = {
  missao: ['principal', 'secundaria', 'oculta'],
  item: ['colecionavel', 'atividade', 'crime'],
  gatilho: ['gatilho'],
  marco: ['marco'],
} as const

/** Janela de disponibilidade: aponta para uma missão principal ou um marco (RF-001-07). */
export const Janela = z.strictObject({
  missao: IdNo,
  momento: z.enum(['inicio', 'conclusao']),
})
export type Janela = z.infer<typeof Janela>

export const Dica = z.strictObject({
  texto: texto(280),
  spoiler: NivelSpoiler,
})

export const No = z
  .strictObject({
    id: IdNo,
    tipo: z.enum(TIPOS_NO),
    subtipo: z.string(),
    categoria: IdSimples.nullable().default(null),
    conjunto: IdSimples.optional(),
    nome: texto(120),
    nome_original: texto(120).optional(),
    personagem: Personagem.default('qualquer'),
    regiao: IdRegiao.optional(),
    posicao: Posicao.nullable().default(null),
    area: z
      .array(z.tuple([z.number(), z.number()]))
      .min(3)
      .optional(),
    capitulo_referencia: z.number().int().min(0).optional(),
    ordem: z.number().int().min(1).optional(),
    disponivel_desde: Janela.optional(),
    perdivel_apos: Janela.optional(),
    requer: Condicao.optional(),
    condicoes_momento: z.array(CondicaoMomento).default([]),
    duracao_min: z.number().positive().max(600).optional(),
    repetivel: z.boolean().default(false),
    conta_para_100: z.boolean().default(true),
    spoiler: NivelSpoiler,
    trofeu: IdSimples.optional(),
    dicas: z.array(Dica).default([]),
    fontes: z.array(Fonte).min(1, { message: 'todo nó precisa de ao menos uma fonte' }),
    /** IDs do mesmo item em fontes externas, para re-importação (ex.: { "open-gta6-map": "stunt-jump-001" }). */
    ids_fonte: z.record(IdSimples, z.string().min(1).max(80)).optional(),
    status: Status,
    aliases: z.array(IdNo).default([]),
  })
  .superRefine((no, ctx) => {
    const prefixo = no.id.split(':')[0]
    if (prefixo !== no.tipo) {
      ctx.addIssue({
        code: 'custom',
        path: ['id'],
        message: `prefixo do ID (${prefixo}) difere do tipo (${no.tipo})`,
      })
    }
    const validos = SUBTIPOS[no.tipo] as readonly string[]
    if (!validos.includes(no.subtipo)) {
      ctx.addIssue({
        code: 'custom',
        path: ['subtipo'],
        message: `subtipo "${no.subtipo}" inválido para ${no.tipo}; aceitos: ${validos.join(', ')}`,
      })
    }
    if (no.tipo === 'item' && !no.categoria) {
      ctx.addIssue({ code: 'custom', path: ['categoria'], message: 'item precisa de categoria' })
    }
    if ((no.tipo === 'gatilho' || no.tipo === 'marco') && no.conta_para_100) {
      ctx.addIssue({
        code: 'custom',
        path: ['conta_para_100'],
        message: 'gatilhos e marcos não contam para 100%',
      })
    }
  })
export type No = z.infer<typeof No>
export type NoEntrada = z.input<typeof No>
