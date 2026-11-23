/**
 * pnpm levantamento:missoes [--forcar]
 *
 * Primeira passada do levantamento assistido de missões (spec 002 H4, docs/02 §1.4): grava
 * data/missoes/*.yaml, data/gatilhos.yaml e aplica janelas de perda em itens já importados.
 * Fonte: pesquisa de 23/11/2026 em guias públicos (fontes por nó). Depois desta passada,
 * o YAML é a fonte da verdade e é editado à mão; o script recusa sobrescrever sem --forcar.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import type { Fonte, NoEntrada } from '@vice-route/catalog-schema'
import { DATA, escreverAtomico, lerYaml, paraYaml } from '../core/arquivos.ts'

const forcar = process.argv.includes('--forcar')
const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

// ---------- fontes ----------
const F = {
  gtabites: {
    tipo: 'referencia',
    nome: 'GTAbites: mission list',
    url: 'https://www.gtabites.com/missions',
  },
  dexerto: {
    tipo: 'referencia',
    nome: 'Dexerto: GTA 6 mission list',
    url: 'https://www.dexerto.com/wikis/gta-6/mission-list/',
  },
  keengamer: {
    tipo: 'referencia',
    nome: 'KeenGamer: walkthrough',
    url: 'https://www.keengamer.com/articles/guides/gta-6-walkthrough-all-chapters-and-story-missions-in-order/',
  },
  gtabase: {
    tipo: 'referencia',
    nome: 'GTABase: missions',
    url: 'https://www.gtabase.com/missions/gta-6/',
  },
  ppw: {
    tipo: 'referencia',
    nome: 'PowerPyx: full walkthrough',
    url: 'https://www.powerpyx.com/gta-6-full-walkthrough-all-missions/',
  },
  pp: {
    tipo: 'referencia',
    nome: 'PowerPyx: Strangers & Freaks',
    url: 'https://www.powerpyx.com/gta-6-all-strangers-freaks-side-missions/',
  },
  ol: {
    tipo: 'referencia',
    nome: 'outputlag: side missions',
    url: 'https://outputlag.com/guides/gta-6-side-missions-strangers-freaks/',
  },
  gb: {
    tipo: 'referencia',
    nome: 'GTABase: strangers missions',
    url: 'https://www.gtabase.com/gta-6/strangers-missions/',
  },
  rb: {
    tipo: 'referencia',
    nome: 'retrobroker: S&F walkthrough',
    url: 'https://retrobroker.com/en-US/us/blog/gta-6-strangers-and-freaks-walkthrough',
  },
  olm: {
    tipo: 'referencia',
    nome: 'outputlag: missables',
    url: 'https://outputlag.com/guides/gta-6-missables/',
  },
  vm: {
    tipo: 'referencia',
    nome: 'vicemissions: points of no return',
    url: 'https://vicemissions.com/guides/points-of-no-return',
  },
  gc: {
    tipo: 'referencia',
    nome: 'Game Checklists: missables',
    url: 'https://game-checklists.com/gta6/guides/missables/',
  },
  vfg: {
    tipo: 'referencia',
    nome: 'vifieldguide: missables',
    url: 'https://vifieldguide.com/guides/missables/',
  },
  ppmed: {
    tipo: 'referencia',
    nome: 'PowerPyx: meditation spots',
    url: 'https://www.powerpyx.com/gta-6-all-meditation-spot-locations/',
  },
  ppf: {
    tipo: 'referencia',
    nome: 'PowerPyx: Retest Freddie’s Defenses',
    url: 'https://www.powerpyx.com/gta-6-retest-freddies-defenses-walkthrough/',
  },
  ppm: {
    tipo: 'referencia',
    nome: 'PowerPyx: The Final Flush',
    url: 'https://www.powerpyx.com/gta-6-the-final-flush-meet-at-franks-waffles-walkthrough/',
  },
  ppa: {
    tipo: 'referencia',
    nome: 'PowerPyx: Gellhorn’s Missing Tourists',
    url: 'https://www.powerpyx.com/gta-6-gellhorns-missing-tourists-walkthrough/',
  },
  pps: {
    tipo: 'referencia',
    nome: 'PowerPyx: The Unknown Stuntman',
    url: 'https://www.powerpyx.com/gta-6-the-unknown-stuntman-walkthrough/',
  },
  ppu: {
    tipo: 'referencia',
    nome: 'PowerPyx: UFO abduction',
    url: 'https://www.powerpyx.com/?p=375488',
  },
  bb: {
    tipo: 'referencia',
    nome: 'Beebom: missing persons quest',
    url: 'https://beebom.com/gta-6-serial-killer-missing-persons-quest/',
  },
} satisfies Record<string, Fonte>
type ChaveFonte = keyof typeof F
const fontes = (...ks: ChaveFonte[]): Fonte[] => ks.map((k) => ({ ...F[k] }))
const comObs = (f: Fonte[], obs: string): Fonte[] => [{ ...f[0]!, obs }, ...f.slice(1)]

// ---------- missões principais ----------
interface Principal {
  n: number
  nome: string
  cap: number
  pers: 'jason' | 'lucia' | 'ambos'
  va?: string
}
const principais: Principal[] = readFileSync(join(import.meta.dirname, 'principais.tsv'), 'utf8')
  .split('\n')
  .filter((l) => l.trim() && !l.startsWith('#'))
  .map((l) => {
    const [n, nome, cap, pers, extra] = l.split('\t')
    return {
      n: Number(n),
      nome: nome!,
      cap: Number(cap),
      pers: pers as Principal['pers'],
      ...(extra?.startsWith('va:') ? { va: extra.slice(3) } : {}),
    }
  })
const idPrincipal = new Map(principais.map((p) => [slug(p.nome), `missao:${slug(p.nome)}`]))
const principal = (nome: string): string => {
  const id = idPrincipal.get(slug(nome))
  if (!id) throw new Error(`missão principal desconhecida: ${nome}`)
  return id
}

/** Avisos de ponto sem retorno e perdas que não viram nó (dinheiro, casa, veículos). */
const DICAS_PRINCIPAIS: Record<string, { texto: string; fontes: ChaveFonte[] }> = {
  'Coming Home': {
    texto:
      'Antes de iniciar: as tarefas de boas-vindas para a Lucia (roupas, flores, compras, corte de cabelo) somem quando ela é buscada. Não contam para 100%.',
    fontes: ['gc'],
  },
  'Don Gone': {
    texto:
      'O revólver H&L .38 do Donnie fica no porta-malas do carro dele e some durante esta missão.',
    fontes: ['vm', 'gc', 'vfg'],
  },
  'Tourist Trap': {
    texto:
      'Ponto sem retorno do capítulo 1. Ao iniciar, você perde o dinheiro em mãos e na conta corrente (só Family Savings passa), a casa em Key Lento, o Ganado, as missões da Shirley e os itens da casa do Jason.',
    fontes: ['olm', 'vm', 'gc', 'vfg'],
  },
  'Checking Out': {
    texto:
      'Ponto sem retorno do capítulo 2: você deixa o Starlet Motel e perde revistas e cartas guardadas lá. Fontes divergem se fecha no início ou na conclusão; o app avisa antes de iniciar.',
    fontes: ['vm', 'gc', 'vfg', 'olm'],
  },
  'The Cartel Heist': {
    texto:
      'Ao concluir, um guia cita a perda de duas revistas no apartamento de Bayside e da ligação do Halifax (partes 2 e 3 de Dubious Provenance). Outro diz que nada se perde.',
    fontes: ['vfg', 'olm'],
  },
  Sunset: {
    texto:
      'Leva ao capítulo 5 e à escolha de final do capítulo 4, sem replay. Um guia cita Starting From Zero como o ponto sem retorno.',
    fontes: ['vm', 'vfg', 'olm'],
  },
  'Protective Custody': {
    texto:
      'Missões finais em sequência até os créditos, sem free roam; o jogo pede confirmação antes. Não confirmado se esta e The End of the Road são finais alternativos.',
    fontes: ['vm', 'gc'],
  },
}

const nosPrincipais: NoEntrada[] = principais.map((p, i) => {
  const extras: Fonte[] = p.va
    ? [
        {
          tipo: 'referencia',
          nome: 'Vice Atlas: walkthrough',
          url: `https://www.vice-atlas.com/briefings/gta6-${p.va}-walkthrough/`,
        },
      ]
    : []
  let fs: Fonte[] = [...fontes('gtabites', 'dexerto', 'gtabase'), ...extras]
  if (p.nome === 'Tyrone')
    fs = comObs(
      fs,
      'Em PowerPyx e GTABase aparece como objetivo de Here, Kitty Kitty, não como missão separada.',
    )
  if (p.nome === "Clonin' Keys, Makin' Gs")
    fs = comObs(
      fs,
      'Também listada como "Steal the Zorrusso for Randy" (gtabites, GTABase, KeenGamer).',
    )
  const dica = DICAS_PRINCIPAIS[p.nome]
  return {
    id: principal(p.nome),
    tipo: 'missao',
    subtipo: 'principal',
    categoria: 'missoes-principais',
    nome: p.nome,
    personagem: p.pers,
    ordem: p.n,
    capitulo_referencia: p.cap,
    ...(i > 0 ? { requer: { concluido: principal(principais[i - 1]!.nome) } } : {}),
    spoiler: 2,
    ...(dica ? { dicas: [{ texto: dica.texto, spoiler: 2 }] } : {}),
    fontes: dica
      ? [...fs, ...fontes(...dica.fontes).filter((f) => !fs.some((x) => x.url === f.url))]
      : fs,
    status: 'referencia',
  }
})
const primeiraDoCapitulo = (cap: number) => principais.find((p) => p.cap === cap)!.nome

// ---------- missões secundárias e ocultas ----------
type Pers = 'jason' | 'lucia' | 'ambos'
interface Sec {
  nome: string
  cap: number | null
  /** Missão principal que libera (conclusão), quando citada. */
  apos?: string
  pers?: Pers
  perde?: { missao: string; momento: 'inicio' | 'conclusao' }
  oculta?: {
    gatilho: string
    nome: string
    texto: string
    momento?: { horario?: { de: number; ate: number }; livre?: string }
  }
  dica?: string
  momento?: { horario?: { de: number; ate: number }; livre?: string }
  f: ChaveFonte[]
  obs?: string
}
interface Linha {
  id: string
  pers: Pers
  missoes: Sec[]
}

const LINHAS: Linha[] = [
  {
    id: 'shirley',
    pers: 'jason',
    missoes: [
      {
        nome: "Get Shirley's Rum",
        cap: 1,
        apos: 'Unwanted Attention',
        perde: { missao: 'Tourist Trap', momento: 'inicio' },
        f: ['pp', 'ppw', 'olm', 'vm', 'gc'],
        obs: 'Fontes divergem: libera antes ou depois de Pipework.',
      },
      {
        nome: 'Steal the Scooter',
        cap: 1,
        perde: { missao: 'Tourist Trap', momento: 'inicio' },
        f: ['pp', 'olm', 'vm', 'gc'],
      },
    ],
  },
  {
    id: 'kenton',
    pers: 'jason',
    missoes: [
      {
        nome: 'Search the Dive Sites',
        cap: 1,
        apos: 'Island Dreams',
        f: ['pp', 'ol', 'rb'],
        obs: 'Kenton some depois do capítulo 1 e volta entre os capítulos 2 e 3.',
      },
      {
        nome: 'Maritime Disputes',
        cap: 3,
        f: ['ol', 'rb'],
        obs: 'Capítulo divergente (1 a 3 conforme a fonte).',
      },
    ],
  },
  {
    id: 'cal',
    pers: 'jason',
    missoes: [
      {
        nome: 'Catch a Bigger Fish',
        cap: 1,
        apos: 'Feng Shui',
        f: ['pp', 'rb'],
        dica: 'O Cal pode sumir por um tempo durante a história, mas volta; dá para terminar depois.',
      },
    ],
  },
  {
    id: 'kirk',
    pers: 'ambos',
    missoes: [
      {
        nome: 'Search for the Skunk Ape',
        cap: 1,
        momento: { horario: { de: 20, ate: 5 } },
        oculta: {
          gatilho: 'gatilho:panfleto-do-kirk',
          nome: 'Panfleto do Kirk',
          texto:
            'Ler o panfleto do Kirk (Rusty Anchor em Key Lento ou Skeeter’s em Hamlet) e ligar para ele',
        },
        f: ['pp', 'ol', 'rb', 'gb'],
      },
      { nome: 'Search for Tree Effigies', cap: 1, f: ['pp', 'gb'] },
      {
        nome: 'Help Kirk Find Mr. Mangrove',
        cap: 1,
        pers: 'lucia',
        momento: { horario: { de: 20, ate: 5 } },
        dica: 'Só termina no capítulo 2.',
        f: ['pp', 'gb', 'ol', 'rb'],
      },
    ],
  },
  {
    id: 'kyle',
    pers: 'ambos',
    missoes: [
      {
        nome: 'Check Out McKittrick Farm',
        cap: 2,
        apos: 'Ambulance Chaser',
        oculta: {
          gatilho: 'gatilho:panfleto-do-kyle',
          nome: 'Anúncio de piloto no Starlet Motel',
          texto: 'Ler o anúncio de piloto de pulverização na recepção do Starlet Motel',
        },
        f: ['pp', 'ppw', 'ol', 'rb', 'gb'],
      },
      { nome: 'Collect Chemicals for Kyle', cap: 2, apos: 'Slam Dunk', f: ['pp', 'ppw', 'gb'] },
      {
        nome: 'Buddy?',
        cap: 3,
        apos: 'Boobie Time',
        f: ['pp', 'ppw', 'gb', 'ol'],
        obs: 'Capítulo 2 ou 3 conforme a fonte.',
      },
    ],
  },
  {
    id: 'alvan',
    pers: 'ambos',
    missoes: [
      {
        nome: "Gellhorn's Missing Tourists",
        cap: 2,
        perde: { missao: 'Checking Out', momento: 'inicio' },
        oculta: {
          gatilho: 'gatilho:cartaz-pessoas-desaparecidas',
          nome: 'Cartaz de pessoas desaparecidas',
          texto:
            'Examinar um cartaz de pessoas desaparecidas (Starlet Motel ou 247 de Port Gellhorn) para ganhar o contato da linha de denúncias',
        },
        f: ['pp', 'ppa', 'bb', 'ol', 'olm'],
        obs: 'Perda em Checking Out citada só por outputlag (confiança baixa).',
      },
      {
        nome: 'Missing Person',
        cap: 2,
        perde: { missao: 'Checking Out', momento: 'inicio' },
        f: ['pp', 'ppa', 'bb'],
      },
    ],
  },
  {
    id: 'moses',
    pers: 'ambos',
    missoes: [
      { nome: 'Steal Vehicles for Moses', cap: 2, apos: 'Moses', f: ['pp', 'ol', 'rb'] },
      { nome: "Collect Moses' Gift", cap: 2, f: ['pp', 'gb', 'rb'] },
    ],
  },
  {
    id: 'bret',
    pers: 'jason',
    missoes: [
      { nome: 'Veteran Hunted', cap: 2, apos: 'Coffee Break', f: ['pp', 'ppw', 'ol', 'gb'] },
      {
        nome: "Bret's Hunting Decks",
        cap: 2,
        dica: '15 baralhos de alvos; contam para 100% (caçadas do Bret).',
        f: ['pp', 'ol'],
      },
    ],
  },
  {
    id: 'billy',
    pers: 'ambos',
    missoes: [
      { nome: 'Thrillbillies', cap: 2, apos: 'Coffee Break', f: ['pp', 'ppw', 'ol', 'rb'] },
      { nome: 'Twist Wrist, Smash, Grab', cap: 2, f: ['pp', 'ppw'] },
      {
        nome: 'Mall Rats',
        cap: 3,
        apos: 'The Missing Link',
        f: ['pp', 'ppw', 'gb'],
        obs: 'Capítulo 2 ou 3 conforme a fonte.',
      },
      { nome: 'The Impaler', cap: 3, f: ['pp', 'gb'] },
      { nome: 'Hometown Heroes', cap: 3, f: ['pp', 'gb'] },
    ],
  },
  {
    id: 'yago',
    pers: 'ambos',
    missoes: [
      {
        nome: 'Join a Street Race',
        cap: 3,
        apos: "Dealer's Choice",
        f: ['pp', 'ppw', 'ol', 'rb', 'gb'],
      },
      {
        nome: 'Bumper to Bumper',
        cap: 3,
        apos: 'Meet the Heders',
        pers: 'jason',
        f: ['pp', 'ppw', 'gb'],
      },
      {
        nome: 'Race Against Yago',
        cap: 3,
        pers: 'jason',
        momento: { livre: 'Tempo limitado (ampulheta): faça assim que aparecer' },
        dica: 'Missão com tempo limitado; deixar expirar pode travar as próximas do Yago e o troféu Strangers & Freaks.',
        f: ['pp', 'ppw', 'gc', 'olm'],
      },
      {
        nome: 'Brother to Brother',
        cap: 3,
        apos: 'The Missing Link',
        pers: 'jason',
        f: ['pp', 'ppw', 'gb'],
      },
    ],
  },
  {
    id: 'andy',
    pers: 'lucia',
    missoes: [
      {
        nome: 'Climbing the Cellerichain',
        cap: 3,
        apos: 'Top Billing',
        f: ['pp', 'ol', 'rb', 'gb'],
      },
      { nome: 'Pay the Cellerica Fee', cap: 3, f: ['pp', 'gb'] },
      { nome: 'Peach!', cap: 3, f: ['pp', 'gb'] },
      { nome: 'Read the Label', cap: 3, f: ['pp', 'gb'] },
      { nome: 'Puff Puff Pass', cap: 3, f: ['pp', 'gb'] },
    ],
  },
  {
    id: 'yasmani',
    pers: 'ambos',
    missoes: [
      { nome: "Yasmani's Jewelry Jobs", cap: 3, apos: 'Meet the Heders', f: ['pp', 'ppw', 'ol'] },
      { nome: "Yasmani's ATM Jobs", cap: 3, f: ['pp', 'gb'] },
      { nome: "Yasmani's Payday Loans Jobs", cap: 3, f: ['pp', 'gb'] },
      { nome: 'Tail the Security Van', cap: 3, f: ['pp', 'gb'] },
    ],
  },
  {
    id: 'randy',
    pers: 'ambos',
    missoes: [
      {
        nome: "Randy's Wish List",
        cap: 3,
        apos: "Clonin' Keys, Makin' Gs",
        dica: '16 carros encomendados pelo Randy.',
        f: ['pp', 'ol'],
      },
    ],
  },
  {
    id: 'tyrone',
    pers: 'jason',
    missoes: [
      { nome: 'Take Out Kitty Litter', cap: 3, apos: 'Here, Kitty Kitty', f: ['pp', 'ol', 'gb'] },
      { nome: 'Spin On This', cap: 3, f: ['pp', 'gb', 'rb'] },
    ],
  },
  {
    id: 'dunk',
    pers: 'ambos',
    missoes: [
      {
        nome: "Dunk's Robbery Tips",
        cap: 3,
        f: ['pp', 'ol'],
        obs: 'Fontes divergem se é missão ou só uma série de dicas.',
      },
    ],
  },
  {
    id: 'papa-audacity',
    pers: 'ambos',
    missoes: [
      {
        nome: 'The Unknown Stuntman',
        cap: 3,
        oculta: {
          gatilho: 'gatilho:cartaz-do-duble',
          nome: 'Cartaz do dublê',
          texto:
            'Ler o cartaz do dublê (saguão do Bayside ou quadro de avisos do apartamento de Crosstown) e falar com o dublê de branco no parque ao sul de Ocean Beach',
        },
        f: ['pp', 'pps', 'rb', 'ol'],
      },
      { nome: 'Trial by Tire', cap: 3, f: ['rb'] },
    ],
  },
  {
    id: 'eddie',
    pers: 'ambos',
    missoes: [{ nome: "Attend Eddie Acosta's Party", cap: 4, f: ['pp', 'ppw', 'ol', 'rb'] }],
  },
  {
    id: 'pilot-pete',
    pers: 'jason',
    missoes: [
      { nome: 'Passing the Torch', cap: 4, f: ['pp', 'ol', 'rb', 'gb'] },
      { nome: 'Backseat Pilot', cap: 4, f: ['pp', 'gb'] },
      { nome: "Pete's Deliveries: Southpoint Airfield", cap: 4, f: ['pp', 'gb', 'rb'] },
      { nome: "Pete's Deliveries: Avery Allen & Co.", cap: 4, f: ['pp', 'gb'] },
      { nome: 'Deliver Packages', cap: 4, f: ['pp', 'gb'] },
    ],
  },
  {
    id: 'shayna',
    pers: 'lucia',
    missoes: [
      {
        nome: 'This is a Free Call From...',
        cap: 4,
        apos: "Child's Play",
        momento: { livre: 'Tempo limitado (ampulheta): só com a Lucia' },
        oculta: {
          gatilho: 'gatilho:dirigir-perto-de-hamlet',
          nome: 'Dirigir perto de Hamlet com a Lucia',
          texto: 'Dirigir perto de Hamlet com a Lucia; a Shayna manda mensagem pedindo carona',
        },
        dica: 'Missão com tempo limitado; pode afetar o troféu Strangers & Freaks.',
        f: ['pp', 'ppw', 'olm', 'gc'],
      },
    ],
  },
  {
    id: 'freddie',
    pers: 'ambos',
    missoes: [
      {
        nome: "Retest Freddie's Defenses",
        cap: null,
        oculta: {
          gatilho: 'gatilho:invadir-complexo-do-freddie',
          nome: 'Invadir o complexo do Freddie',
          texto:
            'Invadir por conta própria o complexo do Freddie, ao norte do Lake Leonida; ele manda mensagem alguns dias depois',
        },
        f: ['pp', 'ppf'],
      },
    ],
  },
  {
    id: 'merle',
    pers: 'ambos',
    missoes: [
      {
        nome: 'The Final Flush',
        cap: null,
        momento: { livre: 'Sozinho' },
        oculta: {
          gatilho: 'gatilho:cartaz-no-flushers',
          nome: 'Cartaz No Flusher',
          texto:
            'Escanear um cartaz "No Flusher" perto de banheiros e responder TRUTH à mensagem do movimento',
        },
        f: ['pp', 'ppm', 'ol', 'rb'],
      },
    ],
  },
  {
    id: 'felipe',
    pers: 'ambos',
    missoes: [
      {
        nome: 'Bad Driver!',
        cap: 4,
        apos: 'Party Hard',
        perde: { missao: 'Power Play', momento: 'inicio' },
        f: ['olm', 'vm', 'gc', 'vfg'],
      },
    ],
  },
  {
    id: 'rusty-anchor',
    pers: 'jason',
    missoes: [
      {
        nome: 'Ring the Bell!',
        cap: 1,
        perde: { missao: 'Swamped', momento: 'inicio' },
        f: ['gc'],
        obs: 'Citada por uma fonte só (confiança baixa).',
      },
    ],
  },
  {
    id: 'ovni',
    pers: 'ambos',
    missoes: [
      {
        nome: 'The Truth Is Out There',
        cap: 2,
        momento: {
          horario: { de: 2, ate: 5 },
          livre: 'Sozinho; o carro abandonado aparece aleatoriamente',
        },
        oculta: {
          gatilho: 'gatilho:carro-abandonado-piscando',
          nome: 'Carro abandonado com luzes piscando',
          texto:
            'Achar um carro abandonado com luzes piscando na estrada de terra a noroeste do Starlet Motel e seguir a trilha de roupas até a luz azul',
        },
        f: ['ppu', 'ol', 'rb'],
        obs: 'Encontro que dá o troféu The Truth Is Out There.',
      },
    ],
  },
]

const secundarias: NoEntrada[] = []
const ocultas: NoEntrada[] = []
const gatilhos: NoEntrada[] = []
for (const linha of LINHAS) {
  linha.missoes.forEach((m, i) => {
    const id = `missao:${linha.id}-${slug(m.nome)}`
    const anterior = i > 0 ? `missao:${linha.id}-${slug(linha.missoes[i - 1]!.nome)}` : null
    const deps: object[] = []
    if (anterior) deps.push({ concluido: anterior })
    if (m.oculta) {
      deps.push({ concluido: m.oculta.gatilho })
      gatilhos.push({
        id: m.oculta.gatilho,
        tipo: 'gatilho',
        subtipo: 'gatilho',
        nome: m.oculta.nome,
        ...(m.cap ? { capitulo_referencia: m.cap } : {}),
        ...(m.momento ? { condicoes_momento: momentos(m.momento) } : {}),
        conta_para_100: false,
        spoiler: 2,
        dicas: [{ texto: m.oculta.texto.slice(0, 280), spoiler: 2 }],
        fontes: fontes(...m.f),
        status: 'referencia',
      })
    }
    const desde = m.apos
      ? principal(m.apos)
      : !anterior && m.cap
        ? principal(primeiraDoCapitulo(m.cap))
        : null
    const no: NoEntrada = {
      id,
      tipo: 'missao',
      subtipo: m.oculta ? 'oculta' : 'secundaria',
      categoria: 'missoes-secundarias',
      conjunto: linha.id,
      nome: m.nome,
      personagem: m.pers ?? linha.pers,
      ordem: i + 1,
      ...(m.cap !== null ? { capitulo_referencia: m.cap } : {}),
      ...(desde
        ? { disponivel_desde: { missao: desde, momento: m.apos ? 'conclusao' : 'inicio' } }
        : {}),
      ...(m.perde
        ? { perdivel_apos: { missao: principal(m.perde.missao), momento: m.perde.momento } }
        : {}),
      ...(deps.length === 1
        ? { requer: deps[0] }
        : deps.length > 1
          ? { requer: { todos: deps } }
          : {}),
      ...(m.momento ? { condicoes_momento: momentos(m.momento) } : {}),
      conta_para_100: false,
      spoiler: 2,
      ...(m.dica ? { dicas: [{ texto: m.dica, spoiler: 2 }] } : {}),
      fontes: m.obs ? comObs(fontes(...m.f), m.obs) : fontes(...m.f),
      status: 'referencia',
    } as NoEntrada
    ;(m.oculta ? ocultas : secundarias).push(no)
  })
}
function momentos(m: NonNullable<Sec['momento']>) {
  return [...(m.horario ? [{ horario: m.horario }] : []), ...(m.livre ? [{ livre: m.livre }] : [])]
}

// ---------- perdíveis em itens já importados e itens novos ----------
interface Janela {
  missao: string
  momento: 'inicio' | 'conclusao'
}
const PERDIVEIS_EM_ITENS: {
  id: string
  desde?: Janela
  perde: Janela
  f: ChaveFonte[]
  obs?: string
}[] = [
  {
    id: 'item:meditacao-002',
    desde: { missao: 'Down to Earth', momento: 'conclusao' },
    perde: { missao: 'Tourist Trap', momento: 'inicio' },
    f: ['ppmed', 'olm', 'vfg', 'gc'],
    obs: 'Necessária para o troféu Positive Mental Attitude: contestado. 15 de 18 meditações bastam para 100%.',
  },
  {
    id: 'item:revistas-livros-050',
    perde: { missao: 'Tourist Trap', momento: 'inicio' },
    f: ['vfg', 'gc'],
  },
  {
    id: 'item:revistas-livros-051',
    perde: { missao: 'Tourist Trap', momento: 'inicio' },
    f: ['vfg', 'gc'],
  },
  {
    id: 'item:revistas-livros-055',
    perde: { missao: 'Tourist Trap', momento: 'inicio' },
    f: ['vfg'],
  },
  {
    id: 'item:revistas-livros-068',
    desde: { missao: 'Home Sweet Home', momento: 'inicio' },
    perde: { missao: 'Home Sweet Home', momento: 'conclusao' },
    f: ['vfg'],
    obs: 'Só durante a fuga da casa do Jason.',
  },
  {
    id: 'item:cartas-042',
    perde: { missao: 'Checking Out', momento: 'inicio' },
    f: ['vfg', 'olm'],
  },
  {
    id: 'item:revistas-livros-066',
    perde: { missao: 'The Cartel Heist', momento: 'conclusao' },
    f: ['vfg'],
    obs: 'Outro guia diz que nada se perde no fim do capítulo 3.',
  },
  {
    id: 'item:revistas-livros-067',
    perde: { missao: 'The Cartel Heist', momento: 'conclusao' },
    f: ['vfg'],
    obs: 'Outro guia diz que nada se perde no fim do capítulo 3.',
  },
  {
    id: 'item:waink-038',
    desde: { missao: 'Discharge Time', momento: 'conclusao' },
    perde: undefined as unknown as Janela,
    f: [],
  },
]
const ITENS_NOVOS: NoEntrada[] = [
  {
    id: 'item:armas-unicas-revolver-do-donnie',
    tipo: 'item',
    subtipo: 'crime',
    categoria: 'armas-unicas',
    nome: 'H&L .38 do Donnie',
    nome_original: "Donnie's H&L .38",
    capitulo_referencia: 1,
    disponivel_desde: { missao: principal('Don Gone'), momento: 'inicio' },
    perdivel_apos: { missao: principal('Don Gone'), momento: 'conclusao' },
    spoiler: 2,
    dicas: [
      {
        texto:
          'No porta-malas do carro do Donnie, durante a missão; some quando o carro é destruído.',
        spoiler: 2,
      },
    ],
    fontes: fontes('vm', 'gc', 'vfg'),
    status: 'referencia',
  },
]

// ---------- gravação ----------
function gravarNos(rel: string, nos: NoEntrada[], titulo: string) {
  const caminho = join(DATA, rel)
  const atual = lerYaml<unknown[]>(caminho, [])
  if (atual.length && !forcar) {
    console.log(`= ${rel} já tem ${atual.length} nós; mantido (use --forcar para sobrescrever)`)
    return
  }
  const cab = `${titulo}\nPrimeira passada gerada por pnpm levantamento:missoes (pesquisa de 23/11/2026). A partir daqui, edite à mão.`
  escreverAtomico(
    caminho,
    paraYaml(
      [...nos].sort((a, b) => a.id.localeCompare(b.id)),
      cab,
    ),
  )
  console.log(`✔ ${rel}: ${nos.length} nós`)
}
gravarNos(
  'missoes/principais.yaml',
  nosPrincipais,
  'Missões principais (91), em ordem, com capítulo e personagem.',
)
gravarNos(
  'missoes/secundarias.yaml',
  secundarias,
  'Missões secundárias: Strangers & Freaks e outras linhas (conjunto = linha).',
)
gravarNos(
  'missoes/ocultas.yaml',
  ocultas,
  'Missões ocultas: só aparecem depois de um gatilho (gatilhos.yaml).',
)
gravarNos(
  'gatilhos.yaml',
  gatilhos,
  'Gatilhos: ações sem marcador no jogo que liberam missões ocultas.',
)

// Janelas em itens importados (campos de curadoria: a re-importação preserva)
const dirItens = join(DATA, 'itens')
const porArquivo = new Map<string, NoEntrada[]>()
for (const f of readdirSync(dirItens).filter((x) => x.endsWith('.yaml')))
  porArquivo.set(f, lerYaml<NoEntrada[]>(join(dirItens, f), []))
let aplicados = 0
for (const p of PERDIVEIS_EM_ITENS) {
  for (const [, nos] of porArquivo) {
    const no = nos.find((n) => n.id === p.id)
    if (!no) continue
    if (p.desde)
      no.disponivel_desde = { missao: principal(p.desde.missao), momento: p.desde.momento }
    if (p.perde) no.perdivel_apos = { missao: principal(p.perde.missao), momento: p.perde.momento }
    const novas = fontes(...p.f).filter((f) => !no.fontes.some((x) => x.url === f.url))
    no.fontes = [...no.fontes, ...(p.obs && novas.length ? comObs(novas, p.obs) : novas)]
    aplicados++
  }
}
for (const n of ITENS_NOVOS) {
  const f = `${n.categoria}.yaml`
  const nos = porArquivo.get(f) ?? []
  if (!nos.some((x) => x.id === n.id)) nos.push(n)
  porArquivo.set(f, nos)
}
for (const [f, nos] of porArquivo) {
  const original = readFileSync(join(dirItens, f), 'utf8')
  const cab = original
    .split('\n')
    .filter((l) => l.startsWith('#'))
    .map((l) => l.replace(/^# ?/, ''))
    .join('\n')
  const novo = paraYaml(nos, cab)
  if (novo !== original) escreverAtomico(join(dirItens, f), novo)
}
console.log(`✔ janelas aplicadas em ${aplicados} itens importados; ${ITENS_NOVOS.length} item novo`)
