import type { NoCompilado } from '@vice-route/catalog-schema'
import { avaliar, contar } from './avaliar.ts'
import { duracao, implicados, indexar, tempoJanela, type Contexto } from './contexto.ts'
import { pesosDe } from './pesos.ts'
import { motivo, ORDEM_MOTIVOS } from './textos.ts'
import {
  ErroMotor,
  type AtomoFaltante,
  type Aviso,
  type Catalogo,
  type EstadoJogada,
  type GrupoPerdivel,
  type Motivo,
  type Parametros,
  type Precomputed,
  type Resultado,
  type ResultadoNo,
  type Status,
} from './tipos.ts'

const ESCALA_PROXIMIDADE_PX = 500

/** Normaliza o estado (RF-008-02): aliases, fecho implícito da campanha e pré-requisitos de concluídos. */
function normalizar(
  c: Catalogo,
  p: Precomputed,
  e: EstadoJogada,
  prm: Contexto['prm'],
): { ctx: Contexto; avisos: Aviso[] } {
  const idx = indexar(c, p)
  const avisos: Aviso[] = []
  const resolver = (id: string) => idx.aliases.get(id) ?? id
  const concluidos = new Set<string>()
  const fila: string[] = []
  const marcar = (id: string) => {
    if (!concluidos.has(id) && idx.nos.has(id)) {
      concluidos.add(id)
      fila.push(id)
    }
  }
  for (const bruto of e.concluidos) {
    const id = resolver(bruto)
    if (idx.nos.has(id)) marcar(id)
    else
      avisos.push({
        codigo: 'ID_DESCONHECIDO',
        id: bruto,
        mensagem: `${bruto} não existe nesta versão do catálogo`,
      })
  }
  const principalValida = (bruto: string | null | undefined): string | null => {
    if (!bruto) return null
    const id = resolver(bruto)
    if (idx.indicePrincipal.has(id)) return id
    avisos.push({
      codigo: 'ESTADO_INCONSISTENTE',
      id: bruto,
      mensagem: `${bruto} não é uma missão principal deste catálogo`,
    })
    return null
  }
  const ultima = principalValida(e.ultimaPrincipal)
  const andamento = principalValida(e.principalEmAndamento)
  if (ultima) marcar(ultima)
  const implicar = (no: NoCompilado) => {
    // Só `requer` implica progresso. A janela não: um item marcado antes dela vira JANELA_SUSPEITA,
    // não avanço de campanha (spec 008 §6).
    for (const d of implicados(no.requer)) marcar(resolver(d))
  }
  if (andamento) implicar(idx.nos.get(andamento)!)
  while (fila.length) implicar(idx.nos.get(fila.pop()!)!)

  let indiceCampanha = 0
  for (const id of concluidos)
    indiceCampanha = Math.max(indiceCampanha, idx.indicePrincipal.get(id) ?? 0)
  const iAndamento = andamento ? idx.indicePrincipal.get(andamento)! : 0
  const tempo = Math.max(2 * indiceCampanha + 1, iAndamento ? 2 * iAndamento : 1)
  const missaoAtual = idx.principaisOrdenadas[Math.max(indiceCampanha, iAndamento) - 1]
  const capituloAtual = missaoAtual ? (idx.nos.get(missaoAtual)?.capitulo_referencia ?? 0) : 0

  return {
    ctx: { c, p, idx, e, prm, concluidos, tempo, indiceCampanha, capituloAtual },
    avisos,
  }
}

interface Classificacao {
  status: Status
  faltantes: AtomoFaltante[]
  excluido: boolean
}

function classificar(ctx: Contexto, avisos: Aviso[]): Map<string, Classificacao> {
  const memo = new Map<string, Classificacao>()
  const visitando = new Set<string>()

  const de = (id: string): Classificacao => {
    const ja = memo.get(id)
    if (ja) return ja
    const no = ctx.idx.nos.get(id)
    if (!no) return { status: 'bloqueado', faltantes: [], excluido: false }
    if (visitando.has(id)) {
      avisos.push({
        codigo: 'CICLO_NO_CATALOGO',
        id,
        mensagem: `ciclo de pré-requisitos envolvendo ${id}`,
      })
      return { status: 'bloqueado', faltantes: [{ tipo: 'ciclo_no_catalogo' }], excluido: false }
    }
    visitando.add(id)
    const perdeuJanela = no.perdivel_apos ? tempoJanela(ctx, no.perdivel_apos) <= ctx.tempo : false
    const antesDaJanela = no.disponivel_desde
      ? tempoJanela(ctx, no.disponivel_desde) > ctx.tempo
      : false
    let r: Classificacao
    if (ctx.concluidos.has(id)) {
      // Concluído depois da janela fechar é normal (fez antes); antes de abrir é suspeito
      if (antesDaJanela) {
        avisos.push({
          codigo: 'JANELA_SUSPEITA',
          id,
          mensagem: `${id} marcado antes da janela de disponibilidade`,
        })
      }
      r = { status: 'concluido', faltantes: [], excluido: false }
    } else if (no.status === 'depreciado') {
      r = { status: 'perdido', faltantes: [], excluido: false }
    } else if (perdeuJanela) {
      r = { status: 'perdido', faltantes: [], excluido: false }
    } else if (antesDaJanela) {
      r = { status: 'futuro', faltantes: [], excluido: false }
    } else {
      const av = no.requer ? avaliar(no.requer, ctx, (x) => de(x).status) : null
      const faltantes = av ? [...av.faltantes] : []
      if (
        (no.personagem === 'jason' || no.personagem === 'lucia') &&
        ctx.e.personagem &&
        ctx.e.personagem !== no.personagem
      ) {
        faltantes.push({ tipo: 'personagem', personagem: no.personagem })
      }
      if (av?.excluido) r = { status: 'perdido', faltantes, excluido: true }
      else r = { status: faltantes.length ? 'bloqueado' : 'disponivel', faltantes, excluido: false }
    }
    visitando.delete(id)
    memo.set(id, r)
    return r
  }

  for (const id of ctx.idx.ids) de(id)
  return memo
}

/** Categorias cuja regra de 100% já foi cumprida (docs/04 §1). */
function categoriasFechadas(ctx: Contexto): Set<string> {
  const fechadas = new Set<string>()
  for (const cat of ctx.c.categorias) {
    const r = cat.regra_100
    if (r.tipo === 'itens' || r.tipo === 'contador') {
      if (contar(ctx, cat.id) >= r.minimo) fechadas.add(cat.id)
    } else if (r.tipo === 'conjuntos_completos') {
      const porConjunto = new Map<string, { total: number; feitos: number }>()
      for (const n of ctx.c.nos) {
        if (n.categoria !== cat.id || !n.conjunto || n.status === 'depreciado') continue
        const x = porConjunto.get(n.conjunto) ?? { total: 0, feitos: 0 }
        x.total++
        if (ctx.concluidos.has(n.id)) x.feitos++
        porConjunto.set(n.conjunto, x)
      }
      const completos = [...porConjunto.values()].filter(
        (x) => x.total > 0 && x.feitos === x.total,
      ).length
      if (completos >= r.minimo) fechadas.add(cat.id)
    }
  }
  return fechadas
}

const arred = (x: number) => Math.round(x * 1e6) / 1e6

/** Ponto de entrada do motor (RF-008-01): função pura, determinística. */
export function recomendar(
  c: Catalogo,
  p: Precomputed,
  e: EstadoJogada,
  parametros: Parametros = {},
): Resultado {
  if (p.versao !== c.versao) {
    throw new ErroMotor(
      'versao_incompativel',
      `catálogo ${c.versao} e pré-cálculo ${p.versao} são de versões diferentes`,
    )
  }
  const prm = { kRisco: 2, n: 10, ...parametros }
  const { ctx, avisos } = normalizar(c, p, e, prm)
  const cls = classificar(ctx, avisos)
  const K = prm.kRisco

  // Risco próprio: missões principais até sumir (RF-008-06)
  const proprio = new Map<string, number>()
  for (const id of ctx.idx.ids) {
    const no = ctx.idx.nos.get(id)!
    const st = cls.get(id)!.status
    if (!no.perdivel_apos || (st !== 'disponivel' && st !== 'bloqueado' && st !== 'futuro'))
      continue
    const i = ctx.idx.indicePrincipal.get(no.perdivel_apos.missao)
    if (i !== undefined) proprio.set(id, Math.max(0, i - ctx.indiceCampanha))
  }
  // Risco herdado: pré-requisitos faltantes de nós perdíveis herdam a urgência (H3.3)
  const herdado = new Map<string, number>()
  const perdiveisDestravados = new Map<string, Set<string>>()
  for (const [alvo, m] of proprio) {
    if (cls.get(alvo)!.status === 'futuro') continue
    const pilha = [alvo]
    const vistos = new Set<string>()
    while (pilha.length) {
      const atual = pilha.pop()!
      for (const f of cls.get(atual)?.faltantes ?? []) {
        if (f.tipo !== 'concluido' || vistos.has(f.id)) continue
        vistos.add(f.id)
        herdado.set(f.id, Math.min(herdado.get(f.id) ?? Number.POSITIVE_INFINITY, m))
        const s = perdiveisDestravados.get(f.id) ?? new Set<string>()
        s.add(alvo)
        perdiveisDestravados.set(f.id, s)
        if (cls.get(f.id)?.status === 'bloqueado') pilha.push(f.id)
      }
    }
  }

  // Pontuação e motivos (docs/05 §3.5)
  const w = pesosDe(e.perfil, prm.pesos)
  const fechadas = categoriasFechadas(ctx)
  const favoritas = new Set(e.categoriasFavoritas)
  const disponiveisPorCluster = new Map<number, number>()
  for (const [id, x] of cls) {
    const cl = ctx.idx.clusterDe.get(id)
    if (x.status === 'disponivel' && cl !== undefined)
      disponiveisPorCluster.set(cl, (disponiveisPorCluster.get(cl) ?? 0) + 1)
  }
  const escala = c.mapa.escala_m_por_px
  const proximaPrincipal = ctx.idx.principaisOrdenadas[ctx.indiceCampanha]

  const nos = new Map<string, ResultadoNo>()
  for (const id of ctx.idx.ids) {
    const no = ctx.idx.nos.get(id)!
    const x = cls.get(id)!
    const mProprio = proprio.get(id) ?? null
    const mHerdado = herdado.has(id) ? herdado.get(id)! : null
    const mEfetivo = Math.min(mProprio ?? Infinity, mHerdado ?? Infinity)
    const emRisco = (x.status === 'disponivel' || x.status === 'bloqueado') && mEfetivo <= K
    const motivos: Motivo[] = []
    let pontuacao = 0

    if (x.status === 'disponivel') {
      const ajuste = prm.priors?.ajuste_risco?.[id] ?? 1
      const urgencia = Number.isFinite(mEfetivo) ? (1 / (1 + mEfetivo)) * ajuste : 0
      const valor = ctx.p.valor_desbloqueio[id]
      const valorNorm = valor ? valor.total / ctx.idx.maxValor : 0
      let proximidade = 0
      let distancia: number | null = null
      if (e.posicao && no.posicao) {
        distancia = Math.hypot(no.posicao.x - e.posicao.x, no.posicao.y - e.posicao.y)
        proximidade = 1 / (1 + distancia / ESCALA_PROXIMIDADE_PX)
      }
      const cl = ctx.idx.clusterDe.get(id)
      const vizinhos = cl !== undefined ? (disponiveisPorCluster.get(cl) ?? 1) - 1 : 0
      const densidade = e.posicao ? Math.min(1, vizinhos / 10) : 0
      const fechada = !!no.categoria && fechadas.has(no.categoria)
      const preferencia = (no.categoria && favoritas.has(no.categoria) ? 1 : 0) - (fechada ? 1 : 0)
      const historia = no.tipo === 'missao' && no.subtipo === 'principal' ? 1 : 0
      pontuacao = arred(
        w.risco * urgencia +
          w.desbloqueio * valorNorm +
          w.proximidade * proximidade +
          w.densidade * densidade +
          w.preferencia * preferencia +
          w.historia * historia -
          w.tempo * (duracao(ctx, id) / 60),
      )
      if (mProprio !== null) {
        motivos.push(
          motivo(ctx, 'PERDIVEL_EM', {
            n: mProprio,
            missao: no.perdivel_apos!.missao,
            momento: no.perdivel_apos!.momento,
          }),
        )
      }
      const destravaPerdiveis = perdiveisDestravados.get(id)?.size ?? 0
      if (valor || destravaPerdiveis) {
        motivos.push(
          motivo(ctx, 'DESTRAVA', {
            k: Math.max(valor?.total ?? 0, destravaPerdiveis),
            perdiveis: Math.max(valor?.perdiveis ?? 0, destravaPerdiveis),
          }),
        )
      }
      if (id === proximaPrincipal) motivos.push(motivo(ctx, 'PROXIMA_HISTORIA', {}))
      if (distancia !== null && proximidade >= 0.5) {
        motivos.push(
          motivo(
            ctx,
            'PERTO',
            escala
              ? { px: Math.round(distancia), metros: Math.round((distancia * escala) / 10) * 10 }
              : { px: Math.round(distancia) },
          ),
        )
      }
      if (densidade > 0 && vizinhos >= 3) motivos.push(motivo(ctx, 'CLUSTER', { k: vizinhos + 1 }))
      if (no.categoria && favoritas.has(no.categoria)) motivos.push(motivo(ctx, 'FAVORITA', {}))
      if (fechada) motivos.push(motivo(ctx, 'CATEGORIA_FECHADA', {}))
    } else if (mProprio !== null && (x.status === 'bloqueado' || x.status === 'futuro')) {
      // Sem pontuação (não é acionável), mas o motivo alimenta as telas de perdíveis e de capítulo
      motivos.push(
        motivo(ctx, 'PERDIVEL_EM', {
          n: mProprio,
          missao: no.perdivel_apos!.missao,
          momento: no.perdivel_apos!.momento,
        }),
      )
    }
    if (x.excluido) motivos.push(motivo(ctx, 'CAMINHO_EXCLUIDO', {}))
    motivos.sort((a, b) => ORDEM_MOTIVOS.indexOf(a.codigo) - ORDEM_MOTIVOS.indexOf(b.codigo))

    nos.set(id, {
      id,
      status: x.status,
      emRisco,
      missoesAtePerder: mProprio,
      missoesAtePerderHerdado: mHerdado,
      faltantes: x.faltantes,
      instrucoes: x.status === 'concluido' || x.status === 'perdido' ? [] : no.condicoes_momento,
      pontuacao,
      motivos,
    })
  }

  // Ranking (RF-008-08): perdível na próxima principal no topo; depois pontuação; desempate por ID
  const ignoradas = new Set(e.categoriasIgnoradas)
  const urgenciaTopo = (id: string) => {
    const r = nos.get(id)!
    const m = Math.min(r.missoesAtePerder ?? Infinity, r.missoesAtePerderHerdado ?? Infinity)
    return m <= 1 ? m : Infinity
  }
  const proximos = [...nos.values()]
    .filter(
      (r) =>
        r.status === 'disponivel' &&
        !(ctx.idx.nos.get(r.id)!.categoria && ignoradas.has(ctx.idx.nos.get(r.id)!.categoria!)),
    )
    .map((r) => r.id)
    .sort((a, b) => {
      const ua = urgenciaTopo(a)
      const ub = urgenciaTopo(b)
      if (ua !== ub) return ua - ub
      return nos.get(b)!.pontuacao - nos.get(a)!.pontuacao || a.localeCompare(b)
    })

  // Perdíveis agrupados pela missão que os fecha (não filtrados por preferência, H4.4)
  const perdiveisPorMissao: GrupoPerdivel[] = []
  for (const missao of Object.keys(ctx.p.perdiveis_por_missao).sort(
    (a, b) =>
      (ctx.idx.indicePrincipal.get(a) ?? Infinity) - (ctx.idx.indicePrincipal.get(b) ?? Infinity) ||
      a.localeCompare(b),
  )) {
    const grupo = ctx.p.perdiveis_por_missao[missao]!
    const i = ctx.idx.indicePrincipal.get(missao)
    for (const momento of ['inicio', 'conclusao'] as const) {
      const ids = grupo[momento].filter((id) => {
        const s = nos.get(id)?.status
        return s === 'disponivel' || s === 'bloqueado' || s === 'futuro'
      })
      if (ids.length)
        perdiveisPorMissao.push({
          missao,
          momento,
          missoesAtePerder: i !== undefined ? Math.max(0, i - ctx.indiceCampanha) : null,
          nos: ids.sort(),
        })
    }
  }

  return {
    versaoCatalogo: c.versao,
    indiceCampanha: ctx.indiceCampanha,
    capituloAtual: ctx.capituloAtual,
    nos,
    proximos,
    perdiveisPorMissao,
    avisos: avisos.sort(
      (a, b) => a.codigo.localeCompare(b.codigo) || (a.id ?? '').localeCompare(b.id ?? ''),
    ),
  }
}
