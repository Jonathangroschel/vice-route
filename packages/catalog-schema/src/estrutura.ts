import { z } from 'zod'
import { Fonte, IdNo, IdRegiao, IdSimples, NivelSpoiler, texto } from './comum.ts'
import { Janela } from './no.ts'

/**
 * Regra de 100% de uma categoria (docs/04 §1, decisão D9):
 * - itens: mínimo de itens concluídos
 * - conjuntos_completos: mínimo de conjuntos com todos os itens concluídos
 * - contador: progresso informado pelo jogador como número (ex.: veículos escaneados), sem pinos
 * - nenhuma: categoria não conta para 100%
 */
export const RegraCem = z.discriminatedUnion('tipo', [
  z.strictObject({ tipo: z.literal('itens'), minimo: z.number().int().min(1) }),
  z.strictObject({ tipo: z.literal('conjuntos_completos'), minimo: z.number().int().min(1) }),
  z.strictObject({
    tipo: z.literal('contador'),
    minimo: z.number().int().min(1),
    descricao: texto(200),
  }),
  z.strictObject({ tipo: z.literal('nenhuma') }),
])
export type RegraCem = z.infer<typeof RegraCem>

export const Conjunto = z.strictObject({
  id: IdSimples,
  nome: texto(80),
  nome_original: texto(80).optional(),
  total: z.number().int().min(1).optional(),
})

export const GRUPOS = ['colecionaveis', 'atividades', 'crimes', 'missoes', 'outros'] as const

export const Categoria = z
  .strictObject({
    id: IdSimples,
    nome: texto(80),
    nome_original: texto(80).optional(),
    grupo: z.enum(GRUPOS),
    cor: z.string().regex(/^#[0-9a-f]{6}$/i),
    ordem: z.number().int().min(1),
    /** Total no jogo, segundo as fontes. Pode diferir dos pinos no catálogo (cobertura, cópias). */
    total: z.number().int().min(0).nullable(),
    regra_100: RegraCem,
    conjuntos: z.array(Conjunto).optional(),
    duracao_padrao_min: z.number().positive().max(120).optional(),
    fontes: z.array(Fonte).min(1),
    obs: z.string().max(500).optional(),
  })
  .superRefine((c, ctx) => {
    const r = c.regra_100
    if (r.tipo === 'itens' && c.total !== null && r.minimo > c.total) {
      ctx.addIssue({
        code: 'custom',
        path: ['regra_100', 'minimo'],
        message: `mínimo ${r.minimo} maior que o total ${c.total}`,
      })
    }
    if (r.tipo === 'conjuntos_completos') {
      const n = c.conjuntos?.length ?? 0
      if (r.minimo > n) {
        ctx.addIssue({
          code: 'custom',
          path: ['regra_100', 'minimo'],
          message: `mínimo ${r.minimo} maior que os ${n} conjuntos declarados`,
        })
      }
    }
  })
export type Categoria = z.infer<typeof Categoria>

export const Regiao = z.strictObject({
  id: IdRegiao,
  nome: texto(80),
  nome_original: texto(80).optional(),
})
export type Regiao = z.infer<typeof Regiao>

export const Capitulo = z.strictObject({
  numero: z.number().int().min(0),
  titulo: texto(80),
  regiao: texto(120).optional(),
  esconderijo: texto(120).optional(),
  missoes_aprox: z.number().int().min(0).optional(),
  spoiler: NivelSpoiler,
  fontes: z.array(Fonte).min(1),
})
export type Capitulo = z.infer<typeof Capitulo>

export const Variavel = z.strictObject({
  nome: IdSimples,
  rotulo: texto(120),
  tipo: z.enum(['escolha', 'booleano', 'numero']),
  opcoes: z.array(z.strictObject({ valor: z.string(), rotulo: texto(80) })).optional(),
  disponivel_desde: Janela.optional(),
  spoiler: NivelSpoiler,
  fontes: z.array(Fonte).min(1),
})
export type Variavel = z.infer<typeof Variavel>

/** Imagem-base do mapa (ADR 003). */
export const ImagemBase = z.strictObject({
  edicao: IdSimples,
  titulo: texto(120),
  origem: z.strictObject({
    url: z.url({ protocol: /^https$/ }),
    credito: texto(200),
    publicada: z.iso.date(),
  }),
  tamanho: z.strictObject({
    largura: z.number().int().positive(),
    altura: z.number().int().positive(),
  }),
  recorte: z.strictObject({
    x: z.number().int().min(0),
    y: z.number().int().min(0),
    largura: z.number().int().positive(),
    altura: z.number().int().positive(),
  }),
  tiles: z.strictObject({
    url: z.string().min(1),
    tamanho: z.number().int().positive(),
    zoom_nativo_max: z.number().int().min(0),
    zoom_max: z.number().int().min(0),
  }),
  escala_m_por_px: z.number().positive().optional(),
  transformacao_da_edicao_anterior: z
    .strictObject({
      de: IdSimples,
      a: z.number(),
      b: z.number(),
      c: z.number(),
      d: z.number(),
      e: z.number(),
      f: z.number(),
    })
    .optional(),
})
export type ImagemBase = z.infer<typeof ImagemBase>

/** Arquivo com lista de IDs que referenciam nós (para validar que existem). */
export const ListaIds = z.array(IdNo)
