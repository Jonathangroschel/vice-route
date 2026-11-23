import { describe, expect, it } from 'vitest'
import type { NoCompilado } from '@vice-route/catalog-schema'
import {
  checklistCapitulo,
  ErroMotor,
  oQueFalta,
  pertoDeMim,
  planoSessao,
  proximosPassos,
  recomendar,
  serializar,
  type Catalogo,
  type Precomputed,
} from '../src/index.ts'
import { catalogo, estado } from './apoio.ts'

describe('normalização e janelas (H1)', () => {
  const { c, p } = catalogo('campanha-linear')

  it('nó antes da janela é futuro; depois de fechar sem fazer, perdido', () => {
    const r1 = recomendar(c, p, estado({ ultimaPrincipal: 'missao:principal-002' }))
    expect(r1.nos.get('item:easter-eggs-a')!.status).toBe('futuro')
    const r2 = recomendar(
      c,
      p,
      estado({
        ultimaPrincipal: 'missao:principal-009',
        principalEmAndamento: 'missao:principal-010',
      }),
    )
    expect(r2.nos.get('item:easter-eggs-a')!.status).toBe('perdido')
  })

  it('perdível em 3 missões não está em risco com K = 2, mas aparece nos perdíveis (H3.2)', () => {
    const r = recomendar(c, p, estado({ ultimaPrincipal: 'missao:principal-007' }))
    const a = r.nos.get('item:easter-eggs-a')!
    expect(a.missoesAtePerder).toBe(3)
    expect(a.emRisco).toBe(false)
    expect(
      r.perdiveisPorMissao.find((g) => g.nos.includes('item:easter-eggs-a'))?.missoesAtePerder,
    ).toBe(3)
    expect(
      recomendar(c, p, estado({ ultimaPrincipal: 'missao:principal-007' }), { kRisco: 3 }).nos.get(
        'item:easter-eggs-a',
      )!.emRisco,
    ).toBe(true)
  })

  it('capítulo atual segue a última principal concluída', () => {
    expect(
      recomendar(c, p, estado({ ultimaPrincipal: 'missao:principal-012' })).capituloAtual,
    ).toBe(2)
  })

  it('avisa sobre IDs desconhecidos e principal inexistente sem quebrar', () => {
    const r = recomendar(
      c,
      p,
      estado({ concluidos: ['item:nao-existe'], ultimaPrincipal: 'missao:fantasma' }),
    )
    expect(r.avisos.map((a) => a.codigo)).toEqual(['ESTADO_INCONSISTENTE', 'ID_DESCONHECIDO'])
  })

  it('item marcado antes da janela gera JANELA_SUSPEITA e conta como concluído', () => {
    const r = recomendar(
      c,
      p,
      estado({ concluidos: ['item:easter-eggs-d'], ultimaPrincipal: 'missao:principal-002' }),
    )
    expect(r.nos.get('item:easter-eggs-d')!.status).toBe('concluido')
    expect(r.avisos.map((a) => a.codigo)).toContain('JANELA_SUSPEITA')
  })

  it('recusa catálogo e pré-cálculo de versões diferentes', () => {
    expect(() => recomendar(c, { ...p, versao: 'outra' }, estado())).toThrow(ErroMotor)
  })
})

describe('avaliação de requer (H2)', () => {
  const { c, p } = catalogo('alternativas')

  it('variável preenchida libera; valor diferente bloqueia com o esperado', () => {
    const ok = recomendar(c, p, estado({ variaveis: { 'escolha-cap1': 'poupar' } }))
    expect(ok.nos.get('item:easter-eggs-alvo-variavel')!.status).toBe('disponivel')
    const nao = recomendar(c, p, estado({ variaveis: { 'escolha-cap1': 'eliminar' } }))
    expect(nao.nos.get('item:easter-eggs-alvo-variavel')!.faltantes).toEqual([
      { tipo: 'variavel', nome: 'escolha-cap1', esperado: 'poupar' },
    ])
  })

  it('qualquer com todas as alternativas perdidas vira perdido com CAMINHO_EXCLUIDO', () => {
    // Sem nenhuma alternativa concluída e nenhuma perdida, o alvo segue bloqueado
    const r = recomendar(c, p, estado())
    expect(r.nos.get('item:easter-eggs-alvo-qualquer')!.status).toBe('bloqueado')
    expect(r.nos.get('item:easter-eggs-alvo-nao')!.status).toBe('disponivel')
  })
})

describe('consultas', () => {
  it('oQueFalta recursivo devolve a cadeia em ordem de execução (H2.4)', () => {
    const { c, p } = catalogo('cadeia-oculta')
    const r = recomendar(c, p, estado({ ultimaPrincipal: 'missao:principal-011' }))
    const cadeia = oQueFalta(r, 'item:easter-eggs-007', { recursivo: true }).flatMap((f) =>
      f.tipo === 'concluido' ? [f.id] : [],
    )
    expect(cadeia).toEqual(['gatilho:loja-x-noite', 'missao:oculta-exemplo-01'])
  })

  it('instruções de momento acompanham o nó e não bloqueiam (RF-008-05)', () => {
    const { c, p } = catalogo('cadeia-oculta')
    const g = recomendar(c, p, estado({ ultimaPrincipal: 'missao:principal-011' })).nos.get(
      'gatilho:loja-x-noite',
    )!
    expect(g.status).toBe('disponivel')
    expect(g.instrucoes).toEqual([{ horario: { de: 20, ate: 4 } }])
  })

  it('checklistCapitulo separa perdidos e agrupa por região (H5)', () => {
    const { c, p } = catalogo('campanha-linear')
    const r = recomendar(c, p, estado({ ultimaPrincipal: 'missao:principal-005' }))
    const ch = checklistCapitulo(c, p, r, 1)
    expect(ch.perdidos).toContain('item:easter-eggs-c')
    expect(ch.porRegiao.flatMap((g) => g.nos.map((n) => n.id))).toContain('item:easter-eggs-a')
  })

  it('pertoDeMim filtra pelo raio e ordena com peso de proximidade (H6)', () => {
    const { c, p } = catalogo('campanha-linear')
    const r = recomendar(
      c,
      p,
      estado({ ultimaPrincipal: 'missao:principal-004', posicao: { x: 900, y: 900 } }),
    )
    const perto = pertoDeMim(c, p, r, { x: 900, y: 900 }, 300)
    expect(perto.map((n) => n.id)).toEqual(['item:easter-eggs-b'])
    expect(perto[0]!.distancia).toBe(0)
  })

  it('planoSessao é um ponto de extensão ainda não implementado (RF-008-13)', () => {
    expect(planoSessao({ x: 0, y: 0 }, 60)).toEqual({ erro: 'nao_implementado' })
  })

  it('proximosPassos respeita n', () => {
    const { c, p } = catalogo('alternativas')
    expect(proximosPassos(recomendar(c, p, estado()), 2)).toHaveLength(2)
  })
})

/** Catálogo sintético em memória (sem passar pelo YAML) para testes de propriedade. */
function sintetico(semente: number, n: number): { c: Catalogo; p: Precomputed } {
  let s = semente
  const rnd = () => (s = (s * 1103515245 + 12345) % 2 ** 31) / 2 ** 31
  const nos: NoCompilado[] = []
  for (let i = 0; i < n; i++) {
    const deps = nos.filter(() => rnd() < 0.05).map((d) => ({ concluido: d.id }))
    const tipo = rnd() < 0.5 ? 'todos' : 'qualquer'
    nos.push({
      id: `item:x-${String(i).padStart(4, '0')}`,
      tipo: 'item',
      subtipo: 'colecionavel',
      categoria: 'x',
      nome: `X ${i}`,
      personagem: 'qualquer',
      posicao: { x: rnd() * 5000, y: rnd() * 7000, qualidade: 'aproximada', representa: 'ponto' },
      ...(deps.length ? { requer: tipo === 'todos' ? { todos: deps } : { qualquer: deps } } : {}),
      condicoes_momento: [],
      repetivel: false,
      conta_para_100: true,
      spoiler: 1,
      dicas: [],
      fontes: [{ tipo: 'referencia' }],
      status: 'referencia',
      aliases: [],
    } as NoCompilado)
  }
  const c = {
    versao: 'sint',
    mapa: { tamanho: { largura: 5775, altura: 7900 } },
    categorias: [{ id: 'x', regra_100: { tipo: 'nenhuma' } }],
    regioes: [],
    capitulos: [],
    variaveis: [],
    nos,
    aliases: {},
  } as unknown as Catalogo
  const p: Precomputed = {
    versao: 'sint',
    ordem_principais: [],
    descendentes: {},
    valor_desbloqueio: {},
    perdiveis_por_missao: {},
    clusters: [],
  }
  return { c, p }
}

describe('propriedades em grafos aleatórios', () => {
  it('status exclusivo, concluídos fora dos próximos, próximos só disponíveis, determinismo', () => {
    for (let semente = 1; semente <= 200; semente++) {
      const { c, p } = sintetico(semente, 60)
      const concluidos = c.nos.filter((_, i) => (i * semente) % 7 === 0).map((n) => n.id)
      const e = estado({ concluidos, posicao: { x: 2000, y: 3000 } })
      const r = recomendar(c, p, e)
      expect(r.nos.size).toBe(c.nos.length)
      for (const id of r.proximos) expect(r.nos.get(id)!.status).toBe('disponivel')
      for (const id of concluidos) expect(r.proximos).not.toContain(id)
      for (const n of r.nos.values()) if (n.status === 'disponivel') expect(n.faltantes).toEqual([])
      expect(JSON.stringify(serializar(recomendar(c, p, e)))).toBe(JSON.stringify(serializar(r)))
    }
  })
})

describe('CO-008-11: catálogo real', () => {
  it('sem status contraditório e abaixo de 100 ms', () => {
    const { c, p } = catalogo('real')
    const concluidos = c.nos.filter((_, i) => i % 5 === 0).map((n) => n.id)
    const e = estado({ concluidos, posicao: { x: 4975, y: 4128 }, perfil: 'equilibrio' })
    recomendar(c, p, e) // aquece índices
    const t0 = performance.now()
    const r = recomendar(c, p, e)
    const ms = performance.now() - t0
    expect(r.nos.size).toBe(c.nos.length)
    for (const id of concluidos) expect(r.nos.get(id)!.status).toBe('concluido')
    for (const id of r.proximos) expect(r.nos.get(id)!.status).toBe('disponivel')
    expect(ms).toBeLessThan(100)
    console.log(`recomendar no catálogo real (${c.nos.length} nós): ${ms.toFixed(1)} ms`)
  })
})
