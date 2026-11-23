import { idsReferenciados, paraCadaAtomo, type No } from '@vice-route/catalog-schema'
import type { FonteCatalogo, NoCarregado } from './carregar.ts'
import {
  atomosTardios,
  ciclos,
  criarCalculoAlcance,
  dependencias,
  ordemPrincipais,
  tempoJanela,
} from './grafo.ts'
import { aviso, erro, type Problema } from './problemas.ts'

export interface Indices {
  porId: Map<string, NoCarregado>
  ativos: Map<string, No>
  aliases: Map<string, string>
  ordem: { id: string; indice: number }[]
  indicePrincipal: Map<string, number>
  tempoNo: (id: string) => number
}

const local = (n: NoCarregado, campo?: string) => ({
  arquivo: n.origem.arquivo,
  linha: n.origem.linha,
  campo,
})

/** Validações de grafo e de consistência (docs/04 §8). Recebe o catálogo já validado por esquema. */
export function validarCatalogo(
  fonte: FonteCatalogo,
  idsAnteriores?: Set<string>,
): { problemas: Problema[]; indices: Indices } {
  const problemas: Problema[] = []
  const porId = new Map<string, NoCarregado>()

  // IDs únicos
  for (const n of fonte.nos) {
    const outro = porId.get(n.no.id)
    if (outro) {
      problemas.push(
        erro(
          'ID_DUPLICADO',
          `${n.no.id} também definido em ${outro.origem.arquivo}:${outro.origem.linha ?? '?'}`,
          local(n, 'id'),
        ),
      )
      continue
    }
    porId.set(n.no.id, n)
  }

  // Aliases
  const aliases = new Map<string, string>()
  for (const n of porId.values()) {
    for (const a of n.no.aliases) {
      if (porId.has(a) && porId.get(a)!.no.status !== 'depreciado') {
        problemas.push(
          erro('ALIAS_CICLO', `alias ${a} de ${n.no.id} ainda é um nó ativo`, local(n, 'aliases')),
        )
      } else if (aliases.has(a)) {
        problemas.push(
          erro(
            'ALIAS_DUPLICADO',
            `alias ${a} declarado em ${aliases.get(a)} e em ${n.no.id}`,
            local(n, 'aliases'),
          ),
        )
      } else {
        aliases.set(a, n.no.id)
      }
    }
  }

  const ativos = new Map<string, No>()
  for (const [id, n] of porId) if (n.no.status !== 'depreciado') ativos.set(id, n.no)

  // Referências
  const categorias = new Map(fonte.categorias.map((c) => [c.id, c]))
  const regioes = new Set(fonte.regioes.map((r) => r.id))
  const variaveis = new Set(fonte.variaveis.map((v) => v.nome))
  const variaveisUsadas = new Set<string>()
  const principais = new Set(
    [...porId.values()]
      .filter((n) => n.no.tipo === 'missao' && n.no.subtipo === 'principal')
      .map((n) => n.no.id),
  )
  const marcos = new Set(
    [...porId.values()].filter((n) => n.no.tipo === 'marco').map((n) => n.no.id),
  )

  for (const n of porId.values()) {
    const no = n.no
    const ref = (id: string, campo: string) => {
      if (!porId.has(id) && !aliases.has(id)) {
        problemas.push(
          erro('REF_QUEBRADA', `${no.id} aponta para ${id}, que não existe`, local(n, campo)),
        )
      } else if (no.status !== 'depreciado' && porId.get(id)?.no.status === 'depreciado') {
        problemas.push(
          erro(
            'DEPRECIADO_REFERENCIADO',
            `${no.id} depende de ${id}, que está depreciado`,
            local(n, campo),
          ),
        )
      }
    }
    for (const id of idsReferenciados(no.requer)) ref(id, 'requer')
    for (const campo of ['disponivel_desde', 'perdivel_apos'] as const) {
      const j = no[campo]
      if (!j) continue
      ref(j.missao, campo)
      if (porId.has(j.missao) && !principais.has(j.missao) && !marcos.has(j.missao)) {
        problemas.push(
          erro(
            'JANELA_ALVO',
            `${campo} de ${no.id} deve apontar para missão principal ou marco, não para ${j.missao}`,
            local(n, campo),
          ),
        )
      }
    }
    if (no.categoria && !categorias.has(no.categoria)) {
      problemas.push(
        erro(
          'REF_QUEBRADA',
          `categoria ${no.categoria} não existe em categorias.yaml`,
          local(n, 'categoria'),
        ),
      )
    }
    if (no.regiao && !regioes.has(no.regiao)) {
      problemas.push(
        erro('REF_QUEBRADA', `região ${no.regiao} não existe em regioes.yaml`, local(n, 'regiao')),
      )
    }
    const cat = no.categoria ? categorias.get(no.categoria) : undefined
    if (cat && no.status !== 'depreciado') {
      const ids = new Set(cat.conjuntos?.map((c) => c.id) ?? [])
      if (cat.regra_100.tipo === 'conjuntos_completos' && !no.conjunto) {
        problemas.push(
          aviso(
            'SEM_CONJUNTO',
            `${no.id} pertence a categoria por conjuntos e não declara conjunto`,
            local(n, 'conjunto'),
          ),
        )
      }
      if (no.conjunto && !ids.has(no.conjunto)) {
        problemas.push(
          erro(
            'CONJUNTO',
            `conjunto ${no.conjunto} não existe na categoria ${cat.id}`,
            local(n, 'conjunto'),
          ),
        )
      }
    }
    if (no.requer) {
      paraCadaAtomo(no.requer, (a) => {
        if ('variavel' in a) {
          variaveisUsadas.add(a.variavel.nome)
          if (!variaveis.has(a.variavel.nome)) {
            problemas.push(
              erro(
                'REF_QUEBRADA',
                `variável ${a.variavel.nome} não declarada em variaveis.yaml`,
                local(n, 'requer'),
              ),
            )
          }
        }
        if ('contagem' in a && !categorias.has(a.contagem.categoria)) {
          problemas.push(
            erro(
              'REF_QUEBRADA',
              `categoria ${a.contagem.categoria} de contagem não existe`,
              local(n, 'requer'),
            ),
          )
        }
      })
    }
    if (no.tipo === 'missao' && no.spoiler < 2) {
      problemas.push(
        erro(
          'SPOILER_MINIMO',
          `missões têm spoiler mínimo 2 (${no.id} tem ${no.spoiler})`,
          local(n, 'spoiler'),
        ),
      )
    }
    if (no.posicao && fonte.mapa) {
      const r = fonte.mapa.recorte
      const { x, y } = no.posicao
      if (x < r.x || y < r.y || x > r.x + r.largura || y > r.y + r.altura) {
        problemas.push(
          erro(
            'FORA_DO_MAPA',
            `posição (${x}, ${y}) fora do recorte da imagem-base`,
            local(n, 'posicao'),
          ),
        )
      }
    }
    if (no.tipo === 'item' && !no.posicao && no.status !== 'depreciado') {
      problemas.push(aviso('SEM_POSICAO', `${no.id} sem posição no mapa`, local(n, 'posicao')))
    }
  }
  for (const v of fonte.variaveis) {
    if (!variaveisUsadas.has(v.nome))
      problemas.push(
        aviso('VARIAVEL_NAO_USADA', `variável ${v.nome} declarada e não usada`, {
          arquivo: 'variaveis.yaml',
        }),
      )
  }

  // Ciclos
  const arestas = new Map<string, string[]>()
  for (const [id, n] of porId)
    arestas.set(
      id,
      dependencias(n.no).filter((d) => porId.has(d)),
    )
  const comCiclo = new Set<string>()
  for (const c of ciclos([...porId.keys()].sort(), arestas)) {
    c.forEach((id) => comCiclo.add(id))
    const primeiro = porId.get(c[0]!)!
    problemas.push(
      erro(
        'CICLO',
        `ciclo de pré-requisitos: ${c.join(' → ')} → ${c[0]}`,
        local(primeiro, 'requer'),
      ),
    )
  }

  // Campanha, janelas e alcançabilidade
  const ordem = comCiclo.size
    ? []
    : ordemPrincipais([...ativos.values()].filter((n) => principais.has(n.id)))
  const indicePrincipal = new Map(ordem.map((o) => [o.id, o.indice]))
  const inicioCapitulo = (cap: number) => {
    const primeira = ordem.find((o) => (ativos.get(o.id)?.capitulo_referencia ?? 0) >= cap)
    return primeira ? 2 * primeira.indice : 0
  }
  const { tempoNo, tempoCondicao } = criarCalculoAlcance(ativos, indicePrincipal, inicioCapitulo)

  if (!comCiclo.size) {
    for (const id of marcos) {
      if (ativos.has(id) && !Number.isFinite(tempoNo(id))) {
        problemas.push(
          aviso(
            'MARCO_INALCANCAVEL',
            `marco ${id} não é concluído por nenhum caminho`,
            local(porId.get(id)!),
          ),
        )
      }
    }
    for (const [id, no] of ativos) {
      const n = porId.get(id)!
      const tmarco = (m: string) => tempoNo(m)
      const desde = no.disponivel_desde
        ? tempoJanela(no.disponivel_desde, indicePrincipal, tmarco)
        : 0
      if (!no.perdivel_apos) continue
      const ate = tempoJanela(no.perdivel_apos, indicePrincipal, tmarco)
      if (!Number.isFinite(ate)) continue
      if (ate <= desde) {
        problemas.push(
          erro(
            'JANELA_INVERTIDA',
            `${id} some (${no.perdivel_apos.missao}) antes de ficar disponível`,
            local(n, 'perdivel_apos'),
          ),
        )
        continue
      }
      const pronto = Math.max(desde, no.requer ? tempoCondicao(no.requer) : 0)
      if (pronto >= ate) {
        const tardios = no.requer ? atomosTardios(no.requer, tempoNo, ate) : []
        problemas.push(
          erro(
            'NASCE_PERDIDO',
            `${id} só pode ser feito depois de sumir em ${no.perdivel_apos.missao}${tardios.length ? `; pré-requisitos tardios: ${tardios.join(', ')}` : ''}`,
            local(n, 'requer'),
          ),
        )
      }
    }
  }

  // Totais por categoria
  const contagem = new Map<string, number>()
  for (const no of ativos.values())
    if (no.categoria) contagem.set(no.categoria, (contagem.get(no.categoria) ?? 0) + 1)
  for (const c of fonte.categorias) {
    const n = contagem.get(c.id) ?? 0
    if (c.total === null) continue
    if (n < c.total)
      problemas.push(
        aviso('COBERTURA_INCOMPLETA', `${c.id}: ${n} de ${c.total} no catálogo`, {
          arquivo: 'categorias.yaml',
        }),
      )
    if (n > c.total)
      problemas.push(
        aviso(
          'TOTAL_EXCEDIDO',
          `${c.id}: ${n} no catálogo, total no jogo ${c.total} (cópias ou duplicados?)`,
          { arquivo: 'categorias.yaml' },
        ),
      )
  }

  // IDs removidos em relação à versão publicada
  if (idsAnteriores) {
    for (const id of [...idsAnteriores].sort()) {
      if (!porId.has(id) && !aliases.has(id)) {
        problemas.push(
          erro(
            'ID_REMOVIDO',
            `${id} existia na versão publicada; use status: depreciado ou aliases em vez de remover`,
          ),
        )
      }
    }
  }

  return { problemas, indices: { porId, ativos, aliases, ordem, indicePrincipal, tempoNo } }
}
