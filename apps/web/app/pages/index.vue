<script setup lang="ts">
const { estado, catalogo, nos, categorias, resolver, pronto } = useCatalogo()
const { jogada, concluidos, alternar } = useJogada()
const { resultado, porId } = useMotor()
const route = useRoute()
const router = useRouter()

const mapaRef = ref<{ focar: (x: number, y: number, z?: number) => void } | null>(null)
const selecionado = ref<string | null>(null)
const aba = ref<'progresso' | 'proximos' | 'capitulo' | 'jogada'>('progresso')
const altura = ref<'recolhida' | 'media' | 'cheia'>('recolhida')
const modoPosicao = ref(false)
const aviso = ref<{ texto: string; desfazer?: () => void } | null>(null)
let timerAviso: ReturnType<typeof setTimeout> | null = null

function avisar(texto: string, desfazer?: () => void) {
  aviso.value = { texto, desfazer }
  if (timerAviso) clearTimeout(timerAviso)
  timerAviso = setTimeout(() => (aviso.value = null), 5000)
}

/** Pontos visíveis: filtros de categoria, status e concluídos (spec 004 H4). */
const pontos = computed(() => {
  const c = catalogo.value
  if (!c) return []
  const f = jogada.value.filtros
  const ocultas = new Set(f.categoriasOcultas)
  const saida: (PontoMapa & { classe: string; rotulo: string })[] = []
  for (const n of c.nos) {
    if (!n.posicao || n.status === 'depreciado' || !n.categoria || ocultas.has(n.categoria))
      continue
    const r = porId.value.get(n.id)
    const st = r?.status ?? 'disponivel'
    if (st === 'concluido' && f.ocultarConcluidos && n.id !== selecionado.value) continue
    if (st === 'futuro' && !f.mostrarFuturos) continue
    if (st === 'perdido' && !f.mostrarPerdidos) continue
    const classe = [
      st === 'concluido' ? 'concluido' : '',
      st === 'perdido' ? 'perdido' : '',
      r?.emRisco ? 'risco' : '',
    ]
      .join(' ')
      .trim()
    saida.push({
      id: n.id,
      x: n.posicao.x,
      y: n.posicao.y,
      cor: categorias.value.get(n.categoria)?.cor ?? '#ffffff',
      classe,
      rotulo: `${nomeVisivel(n, jogada.value.tetoSpoiler, jogada.value.revelados)} · ${ROTULO_STATUS[st]}`,
    })
  }
  return saida
})

function selecionar(id: string, focar = false) {
  const real = resolver(id)
  const no = nos.value.get(real)
  if (!no) {
    avisar('Item não encontrado')
    return
  }
  selecionado.value = real
  if (altura.value === 'recolhida') altura.value = 'media'
  if (focar && no.posicao) mapaRef.value?.focar(no.posicao.x, no.posicao.y)
}

function alternarComDesfazer(id: string) {
  const marcou = alternar(id)
  navigator.vibrate?.(15)
  avisar(marcou ? 'Marcado' : 'Desmarcado', () => {
    alternar(id)
    aviso.value = null
  })
}

function definirPosicao(p: { x: number; y: number }) {
  jogada.value.posicao = { ...p, em: Date.now() }
  modoPosicao.value = false
  avisar('Posição definida')
}

// Link direto /no/<id> chega como ?no=<id> (spec 004 H7)
pronto.then(() => {
  const q = route.query.no
  if (typeof q === 'string') {
    selecionar(q, true)
    router.replace({ query: {} })
  }
})

const alerta = computed(() => {
  const r = resultado.value
  if (!r || !r.proximaPrincipal) return null
  const n = r.antes.aoIniciar.length
  return n ? { n, missao: r.proximaPrincipal } : null
})
</script>

<template>
  <main class="tela">
    <p v-if="estado.erro" class="erro">Não foi possível carregar o catálogo: {{ estado.erro }}</p>
    <MapaLeonida
      v-if="catalogo"
      ref="mapaRef"
      :mapa="catalogo.mapa"
      :pontos="pontos"
      :selecionado="selecionado"
      :posicao="jogada.posicao"
      :modo-posicao="modoPosicao"
      @selecionar="selecionar"
      @alternar="alternarComDesfazer"
      @posicao="definirPosicao"
    />
    <div v-else class="carregando">Carregando Leonida…</div>

    <button
      v-if="alerta"
      class="alerta"
      @click="
        aba = 'capitulo'
        selecionado = null
        altura = 'media'
      "
    >
      ⚠ Ao iniciar a próxima missão você perde {{ alerta.n }}
      {{ alerta.n === 1 ? 'item' : 'itens' }} · ver
    </button>

    <div class="acoes-mapa">
      <button
        class="redondo"
        :aria-label="jogada.tema === 'dark' ? 'Tema claro' : 'Tema escuro'"
        @click="jogada.tema = jogada.tema === 'dark' ? 'light' : 'dark'"
      >
        {{ jogada.tema === 'dark' ? '☀' : '☾' }}
      </button>
      <button
        class="redondo"
        :class="{ ativo: modoPosicao }"
        aria-label="Estou aqui: toque no mapa para marcar sua posição"
        @click="modoPosicao = !modoPosicao"
      >
        ◎
      </button>
    </div>
    <p v-if="modoPosicao" class="dica-posicao">Toque no mapa onde você está no jogo</p>

    <FolhaInferior
      v-if="catalogo"
      v-model:aba="aba"
      v-model:altura="altura"
      v-model:selecionado="selecionado"
      @focar="(id: string) => selecionar(id, true)"
      @alternar="alternarComDesfazer"
    />

    <div v-if="aviso" class="aviso" role="status">
      {{ aviso.texto }}
      <button v-if="aviso.desfazer" @click="aviso.desfazer">Desfazer</button>
    </div>
  </main>
</template>

<style scoped>
.tela {
  position: fixed;
  inset: 0;
}
.carregando,
.erro {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: var(--texto-suave);
}
.alerta {
  position: absolute;
  top: max(34px, env(safe-area-inset-top));
  left: 12px;
  right: 72px;
  z-index: 500;
  border: 0;
  border-radius: 14px;
  padding: 10px 14px;
  text-align: left;
  font-weight: 600;
  background: linear-gradient(90deg, #ff5d6c, #ff8a5c);
  color: #fff;
  box-shadow: var(--sombra);
}
.acoes-mapa {
  position: absolute;
  top: max(12px, env(safe-area-inset-top));
  right: 12px;
  z-index: 500;
  display: grid;
  gap: 10px;
}
.redondo {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 1px solid var(--folha-borda);
  background: var(--folha);
  box-shadow: var(--sombra);
  font-size: 20px;
}
.redondo.ativo {
  background: var(--acento);
  color: #1a1f33;
}
.dica-posicao {
  position: absolute;
  top: 76px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 500;
  margin: 0;
  padding: 8px 14px;
  border-radius: 999px;
  background: var(--folha);
  box-shadow: var(--sombra);
}
.aviso {
  position: fixed;
  left: 50%;
  bottom: calc(24px + env(safe-area-inset-bottom));
  transform: translateX(-50%);
  z-index: 1200;
  display: flex;
  gap: 14px;
  align-items: center;
  padding: 10px 16px;
  border-radius: 999px;
  background: #11162a;
  color: #fff;
  box-shadow: var(--sombra);
}
.aviso button {
  border: 0;
  background: none;
  color: var(--acento);
  font-weight: 700;
}
</style>
