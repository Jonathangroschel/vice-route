export type CodigoErro =
  | 'YAML'
  | 'ARQUIVO_AUSENTE'
  | 'ESQUEMA'
  | 'ID_DUPLICADO'
  | 'REF_QUEBRADA'
  | 'CICLO'
  | 'JANELA_ALVO'
  | 'JANELA_INVERTIDA'
  | 'NASCE_PERDIDO'
  | 'ID_REMOVIDO'
  | 'ALIAS_DUPLICADO'
  | 'ALIAS_CICLO'
  | 'SPOILER_MINIMO'
  | 'FORA_DO_MAPA'
  | 'DEPRECIADO_REFERENCIADO'
  | 'CATEGORIA_ARQUIVO'
  | 'CONJUNTO'

export type CodigoAviso =
  | 'VARIAVEL_NAO_USADA'
  | 'MARCO_INALCANCAVEL'
  | 'SEM_POSICAO'
  | 'COBERTURA_INCOMPLETA'
  | 'TOTAL_EXCEDIDO'
  | 'SEM_CONJUNTO'

export interface Problema {
  nivel: 'erro' | 'aviso'
  codigo: CodigoErro | CodigoAviso
  mensagem: string
  arquivo?: string
  linha?: number
  campo?: string
}

type Local = Pick<Problema, 'arquivo' | 'linha' | 'campo'>

export const erro = (codigo: CodigoErro, mensagem: string, local: Local = {}): Problema => ({
  nivel: 'erro',
  codigo,
  mensagem,
  ...local,
})

export const aviso = (codigo: CodigoAviso, mensagem: string, local: Local = {}): Problema => ({
  nivel: 'aviso',
  codigo,
  mensagem,
  ...local,
})

export function formatar(p: Problema, github = false): string {
  const onde = [p.arquivo, p.linha].filter((x) => x !== undefined).join(':')
  if (github) {
    const props = [p.arquivo && `file=data/${p.arquivo}`, p.linha && `line=${p.linha}`]
      .filter(Boolean)
      .join(',')
    return `::${p.nivel === 'erro' ? 'error' : 'warning'} ${props}::${p.codigo} ${p.campo ? `${p.campo}: ` : ''}${p.mensagem}`
  }
  return `${p.nivel === 'erro' ? '✖' : '⚠'} ${p.codigo.padEnd(24)} ${onde ? `${onde} ` : ''}${p.campo ? `[${p.campo}] ` : ''}${p.mensagem}`
}
