import type { CatalogoCompilado, CondicaoMomento, PreCalculo } from '@vice-route/catalog-schema'

export const ENGINE_VERSION = '0.1.0'

export type Catalogo = CatalogoCompilado
export type Precomputed = PreCalculo

export type Perfil = 'cacador100' | 'equilibrio' | 'historiaPrimeiro'
export type NivelSpoiler = 0 | 1 | 2 | 3

export interface Ponto {
  x: number
  y: number
}

export interface EstadoJogada {
  versaoCatalogo?: string
  /** IDs marcados como concluídos; podem conter aliases de IDs antigos. */
  concluidos: ReadonlyArray<string>
  /** Última missão principal concluída. */
  ultimaPrincipal: string | null
  /** Missão principal iniciada e não concluída (janelas com momento: inicio). */
  principalEmAndamento?: string | null
  personagem: 'jason' | 'lucia' | null
  variaveis: Readonly<Record<string, string | number | boolean>>
  /** Contadores informados pelo jogador para categorias sem pinos (ex.: veículos escaneados). */
  contadores?: Readonly<Record<string, number>>
  posicao?: Ponto | null
  perfil: Perfil
  categoriasFavoritas: ReadonlyArray<string>
  categoriasIgnoradas: ReadonlyArray<string>
  tetoSpoiler: NivelSpoiler
  /** Nós revelados individualmente pelo jogador (spec 009). */
  revelados: ReadonlyArray<string>
}

export interface Pesos {
  risco: number
  desbloqueio: number
  proximidade: number
  densidade: number
  preferencia: number
  historia: number
  tempo: number
}

/** Ajustes vindos da comunidade (spec 014). */
export interface Priors {
  duracao_min?: Record<string, number>
  ajuste_risco?: Record<string, number>
}

export interface Parametros {
  /** Missões principais à frente para marcar "em risco" (padrão 2). */
  kRisco?: number
  /** Quantidade de próximos passos (padrão 10). */
  n?: number
  pesos?: Partial<Pesos>
  priors?: Priors | null
}

export type Status = 'concluido' | 'perdido' | 'futuro' | 'bloqueado' | 'disponivel'

export type AtomoFaltante =
  | { tipo: 'concluido'; id: string }
  | { tipo: 'capitulo_minimo'; capitulo: number }
  | { tipo: 'personagem'; personagem: string }
  | { tipo: 'variavel'; nome: string; esperado: string }
  | { tipo: 'variavel_nao_informada'; nome: string }
  | { tipo: 'contagem'; categoria: string; minimo: number; atual: number }
  | { tipo: 'caminho_excluido'; id?: string }
  | { tipo: 'ciclo_no_catalogo' }

export type CodigoMotivo =
  | 'PERDIVEL_EM'
  | 'DESTRAVA'
  | 'PERTO'
  | 'CLUSTER'
  | 'FAVORITA'
  | 'PROXIMA_HISTORIA'
  | 'CAMINHO_EXCLUIDO'
  | 'CATEGORIA_FECHADA'

export interface Motivo {
  codigo: CodigoMotivo
  params: Record<string, string | number>
  frase: string
}

export type CodigoAviso =
  'ESTADO_INCONSISTENTE' | 'JANELA_SUSPEITA' | 'CICLO_NO_CATALOGO' | 'ID_DESCONHECIDO'

export interface Aviso {
  codigo: CodigoAviso
  id?: string
  mensagem: string
}

export interface ResultadoNo {
  id: string
  status: Status
  emRisco: boolean
  /** Missões principais até o nó sumir (própria janela). */
  missoesAtePerder: number | null
  /** Urgência herdada de um dependente perdível que precisa deste nó. */
  missoesAtePerderHerdado: number | null
  faltantes: ReadonlyArray<AtomoFaltante>
  instrucoes: ReadonlyArray<CondicaoMomento>
  pontuacao: number
  motivos: ReadonlyArray<Motivo>
}

export interface GrupoPerdivel {
  missao: string
  momento: 'inicio' | 'conclusao'
  missoesAtePerder: number | null
  nos: string[]
}

export interface Resultado {
  versaoCatalogo: string
  /** Índice da última missão principal concluída (0 = nenhuma). */
  indiceCampanha: number
  capituloAtual: number
  nos: ReadonlyMap<string, ResultadoNo>
  proximos: ReadonlyArray<string>
  perdiveisPorMissao: ReadonlyArray<GrupoPerdivel>
  avisos: ReadonlyArray<Aviso>
}

export interface ChecklistCapitulo {
  capitulo: number
  porRegiao: { regiao: string | null; nos: { id: string; perdivel: boolean; status: Status }[] }[]
  perdidos: string[]
}

export class ErroMotor extends Error {
  constructor(
    readonly codigo: 'versao_incompativel',
    mensagem: string,
  ) {
    super(mensagem)
  }
}
