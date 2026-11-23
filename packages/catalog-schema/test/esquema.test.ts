import { describe, expect, it } from 'vitest'
import { Categoria, Condicao, No } from '../src/index.ts'

const fonte = [{ tipo: 'referencia', url: 'https://exemplo.org/guia' }]

const noValido = {
  id: 'missao:oculta-exemplo-01',
  tipo: 'missao',
  subtipo: 'oculta',
  nome: 'Missão de exemplo',
  spoiler: 2,
  status: 'referencia',
  fontes: fonte,
  requer: { todos: [{ concluido: 'gatilho:loja-x-noite' }, { personagem: 'lucia' }] },
  perdivel_apos: { missao: 'missao:principal-015', momento: 'inicio' },
}

describe('No', () => {
  it('aceita um nó completo e aplica padrões', () => {
    const no = No.parse(noValido)
    expect(no.personagem).toBe('qualquer')
    expect(no.condicoes_momento).toEqual([])
    expect(no.conta_para_100).toBe(true)
  })

  it('exige campos obrigatórios (H1.2)', () => {
    const r = No.safeParse({ id: 'item:x', tipo: 'item' })
    expect(r.success).toBe(false)
    const campos = r.error!.issues.map((i) => i.path.join('.'))
    expect(campos).toEqual(expect.arrayContaining(['nome', 'status', 'fontes', 'spoiler']))
  })

  it('recusa prefixo de ID diferente do tipo', () => {
    const r = No.safeParse({ ...noValido, id: 'item:oculta-exemplo-01' })
    expect(r.success).toBe(false)
  })

  it('recusa HTML em nomes', () => {
    const r = No.safeParse({ ...noValido, nome: '<b>oi</b>' })
    expect(r.success).toBe(false)
  })

  it('recusa fonte sem https', () => {
    const r = No.safeParse({ ...noValido, fontes: [{ tipo: 'referencia', url: 'http://x.org' }] })
    expect(r.success).toBe(false)
  })
})

describe('Condicao', () => {
  it('lista operadores e átomos aceitos quando a chave é desconhecida (H1.3)', () => {
    const r = Condicao.safeParse({ talvez: [] })
    expect(r.success).toBe(false)
    expect(r.error!.issues[0]!.message).toContain('todos, qualquer, nao, pelo_menos, concluido')
  })

  it('aceita pelo_menos e variavel', () => {
    const c = {
      pelo_menos: {
        n: 2,
        de: [
          { concluido: 'item:a' },
          { concluido: 'item:b' },
          { variavel: { nome: 'escolha-cap4', igual: 'poupar' } },
        ],
      },
    }
    expect(Condicao.safeParse(c).success).toBe(true)
  })

  it('recusa variavel com dois comparadores', () => {
    expect(Condicao.safeParse({ variavel: { nome: 'x', igual: 1, minimo: 2 } }).success).toBe(false)
  })
})

describe('Categoria', () => {
  const base = {
    id: 'cartas',
    nome: 'Cartas',
    grupo: 'colecionaveis',
    cor: '#ffd166',
    ordem: 1,
    fontes: fonte,
  }

  it('recusa mínimo maior que o total', () => {
    const r = Categoria.safeParse({ ...base, total: 10, regra_100: { tipo: 'itens', minimo: 11 } })
    expect(r.success).toBe(false)
  })

  it('recusa mínimo de conjuntos maior que os conjuntos declarados', () => {
    const r = Categoria.safeParse({
      ...base,
      total: 480,
      regra_100: { tipo: 'conjuntos_completos', minimo: 15 },
      conjuntos: [{ id: 'a', nome: 'A' }],
    })
    expect(r.success).toBe(false)
  })
})
