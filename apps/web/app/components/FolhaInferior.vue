<script setup lang="ts">
const aba = defineModel<'progresso' | 'proximos' | 'capitulo' | 'jogada'>('aba', { required: true })
const altura = defineModel<'recolhida' | 'media' | 'cheia'>('altura', { required: true })
const selecionado = defineModel<string | null>('selecionado', { required: true })
const emit = defineEmits<{ focar: [id: string]; alternar: [id: string] }>()

const { busca, categorias, nos } = useCatalogo()
const { jogada } = useJogada()
const termo = ref('')
const filtros = ref(false)

/** Busca sem acento e sem caixa; nós acima do teto de spoiler só aparecem se revelados (spec 004 H5). */
const resultados = computed(() => {
  const t = normalizar(termo.value.trim())
  if (t.length < 2) return { nos: [], categorias: [] }
  const teto = jogada.value.tetoSpoiler
  const rev = jogada.value.revelados
  const achados = []
  for (const b of busca.value) {
    if (b.spoiler > teto && !rev.includes(b.id)) continue
    const alvo = normalizar(`${b.nome} ${b.nome_original ?? ''}`)
    const pos = alvo.indexOf(t)
    if (pos >= 0) achados.push({ b, pos })
    if (achados.length > 400) break
  }
  achados.sort((a, z) => a.pos - z.pos || a.b.nome.localeCompare(z.b.nome))
  const cats = [...categorias.value.values()]
    .filter((c) => normalizar(c.nome).includes(t))
    .slice(0, 3)
  return { nos: achados.slice(0, 20).map((a) => a.b), categorias: cats }
})

function abrir(id: string) {
  termo.value = ''
  emit('focar', id)
}

function filtrarSo(catId: string) {
  jogada.value.filtros.categoriasOcultas = [...categorias.value.keys()].filter((k) => k !== catId)
  termo.value = ''
}

function ciclarAltura() {
  altura.value =
    altura.value === 'recolhida' ? 'media' : altura.value === 'media' ? 'cheia' : 'recolhida'
}
</script>

<template>
  <section class="folha" :class="altura" aria-label="Painel">
    <button class="alca" aria-label="Expandir ou recolher o painel" @click="ciclarAltura" />
    <div class="topo">
      <label class="busca">
        <span aria-hidden="true">⌕</span>
        <input
          v-model="termo"
          type="search"
          placeholder="Buscar em Leonida"
          @focus="altura === 'recolhida' && (altura = 'media')"
        />
      </label>
      <button
        class="redondo"
        :class="{ ativo: filtros }"
        aria-label="Camadas e filtros"
        @click="filtros = !filtros"
      >
        👁
      </button>
      <button class="redondo" aria-label="Expandir ou recolher" @click="ciclarAltura">
        {{ altura === 'cheia' ? '⌄' : '⌃' }}
      </button>
    </div>

    <div class="conteudo">
      <ul v-if="termo.trim().length >= 2" class="lista">
        <li v-for="c in resultados.categorias" :key="c.id">
          <button class="linha" @click="filtrarSo(c.id)">
            <i class="ponto" :style="{ background: c.cor }" /> Filtrar só {{ c.nome }}
          </button>
        </li>
        <li v-for="b in resultados.nos" :key="b.id">
          <button class="linha" @click="abrir(b.id)">
            <i
              class="ponto"
              :style="{ background: (b.categoria && categorias.get(b.categoria)?.cor) || '#fff' }"
            />
            <span class="nome">{{ b.nome }}</span>
            <small>{{ ROTULO_REGIAO(nos.get(b.id)?.regiao) }}</small>
          </button>
        </li>
        <li v-if="!resultados.nos.length && !resultados.categorias.length" class="vazio">
          Nada encontrado
        </li>
      </ul>

      <PainelFiltros v-else-if="filtros" />

      <PainelDetalhe
        v-else-if="selecionado"
        :id="selecionado"
        @fechar="selecionado = null"
        @focar="(id) => emit('focar', id)"
        @alternar="(id) => emit('alternar', id)"
      />

      <template v-else>
        <nav class="abas" role="tablist">
          <button
            v-for="[k, rot] in [
              ['progresso', 'Progresso'],
              ['proximos', 'Próximos'],
              ['capitulo', 'Perdíveis'],
              ['jogada', 'Jogada'],
            ] as const"
            :key="k"
            role="tab"
            :aria-selected="aba === k"
            :class="{ ativa: aba === k }"
            @click="aba = k"
          >
            {{ rot }}
          </button>
        </nav>
        <AbaProgresso v-if="aba === 'progresso'" :compacta="altura === 'recolhida'" />
        <AbaProximos v-else-if="aba === 'proximos'" @focar="(id) => emit('focar', id)" />
        <AbaPerdiveis v-else-if="aba === 'capitulo'" @focar="(id) => emit('focar', id)" />
        <AbaJogada v-else />
      </template>
    </div>
  </section>
</template>

<style scoped>
.folha {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 800;
  max-width: 560px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  background: var(--folha);
  border: 1px solid var(--folha-borda);
  border-bottom: 0;
  border-radius: 26px 26px 0 0;
  box-shadow: var(--sombra);
  backdrop-filter: blur(14px);
  padding: 6px 14px calc(10px + env(safe-area-inset-bottom));
  transition: height 0.25s ease;
}
.folha.recolhida {
  height: 300px;
}
.folha.media {
  height: 56vh;
}
.folha.cheia {
  height: calc(100vh - 64px);
}
@media (min-width: 900px) {
  .folha {
    left: 16px;
    right: auto;
    top: 16px;
    width: 400px;
    height: auto !important;
    border-radius: 22px;
    border-bottom: 1px solid var(--folha-borda);
  }
  .alca {
    display: none;
  }
}
.alca {
  align-self: center;
  width: 46px;
  height: 5px;
  border: 0;
  border-radius: 99px;
  background: var(--superficie-forte);
  margin: 4px 0 10px;
}
.topo {
  display: flex;
  gap: 10px;
  align-items: center;
}
.busca {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  height: 52px;
  padding: 0 16px;
  border-radius: 999px;
  background: var(--superficie);
  color: var(--texto-suave);
}
.busca input {
  flex: 1;
  min-width: 0;
  border: 0;
  background: none;
  color: var(--texto);
  font: inherit;
  font-size: 17px;
  outline: none;
}
.redondo {
  width: 52px;
  height: 52px;
  flex: none;
  border: 0;
  border-radius: 50%;
  background: var(--superficie);
  font-size: 18px;
}
.redondo.ativo {
  background: var(--acento);
  color: #1a1f33;
}
.conteudo {
  flex: 1;
  overflow-y: auto;
  margin-top: 12px;
  overscroll-behavior: contain;
}
.abas {
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
}
.abas button {
  flex: 1;
  border: 0;
  border-radius: 999px;
  padding: 8px 0;
  background: var(--superficie);
  color: var(--texto-suave);
  font-size: 14px;
  font-weight: 600;
}
.abas button.ativa {
  background: var(--texto);
  color: var(--fundo);
}
.lista {
  list-style: none;
  margin: 0;
  padding: 0;
}
.linha {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  border: 0;
  background: none;
  text-align: left;
  border-bottom: 1px solid var(--folha-borda);
}
.linha .nome {
  flex: 1;
}
.linha small {
  color: var(--texto-fraco);
}
.ponto {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex: none;
}
.vazio {
  color: var(--texto-fraco);
  padding: 12px 0;
}
</style>
