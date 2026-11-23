<script setup lang="ts">
const props = defineProps<{ id: string }>()
const emit = defineEmits<{ fechar: []; focar: [id: string]; alternar: [id: string] }>()
const { nos, categorias } = useCatalogo()
const { jogada, concluidos, revelar } = useJogada()
const { porId, oQueFalta } = useMotor()

const no = computed(() => nos.value.get(props.id))
const r = computed(() => porId.value.get(props.id))
const teto = computed(() => jogada.value.tetoSpoiler)
const oculto = computed(() => ocultoPorSpoiler(no.value, teto.value, jogada.value.revelados))
const nome = (id: string) => nomeVisivel(nos.value.get(id), teto.value, jogada.value.revelados)
const falta = computed(() => (r.value?.status === 'bloqueado' ? oQueFalta(props.id) : []))
const dicas = computed(() =>
  (no.value?.dicas ?? []).filter(
    (d) => d.spoiler <= teto.value || jogada.value.revelados.includes(props.id),
  ),
)
const feito = computed(() => concluidos.value.has(props.id))
const copiado = ref(false)

function textoFalta(f: ReturnType<typeof oQueFalta>[number]): string {
  switch (f.tipo) {
    case 'concluido':
      return nome(f.id)
    case 'personagem':
      return `Jogar com ${f.personagem === 'jason' ? 'Jason' : 'Lucia'}`
    case 'capitulo_minimo':
      return `Chegar ao capítulo ${f.capitulo}`
    case 'variavel':
      return `Escolha: ${f.nome} = ${f.esperado}`
    case 'variavel_nao_informada':
      return `Informar a escolha "${f.nome}" na aba Jogada`
    case 'contagem':
      return `${f.minimo - f.atual} itens a mais em ${categorias.value.get(f.categoria)?.nome ?? f.categoria}`
    case 'caminho_excluido':
      return 'Indisponível nesta jogada'
    default:
      return 'Pré-requisito do catálogo'
  }
}

async function compartilhar() {
  try {
    await navigator.clipboard.writeText(`${location.origin}/no/${encodeURIComponent(props.id)}`)
    copiado.value = true
    setTimeout(() => (copiado.value = false), 2000)
  } catch {
    /* sem permissão de área de transferência */
  }
}
</script>

<template>
  <article v-if="no" class="detalhe">
    <header>
      <button class="voltar" aria-label="Fechar detalhe" @click="emit('fechar')">←</button>
      <div>
        <p class="cat">
          <i :style="{ background: categorias.get(no.categoria ?? '')?.cor ?? '#fff' }" />
          {{
            categorias.get(no.categoria ?? '')?.nome ??
            (no.tipo === 'gatilho' ? 'Gatilho' : 'Missão')
          }}
          · {{ ROTULO_REGIAO(no.regiao) }}
        </p>
        <h2>{{ nome(no.id) }}</h2>
      </div>
    </header>

    <p class="status" :class="r?.status">
      {{ r ? ROTULO_STATUS[r.status] : '…' }}
      <span v-if="r?.emRisco" class="risco">· em risco</span>
      <span v-if="no.status === 'nao_confirmado' || no.status === 'contestado'" class="selo"
        >· {{ no.status === 'contestado' ? 'contestado' : 'não confirmado' }}</span
      >
    </p>

    <ul v-if="r?.motivos.length" class="motivos">
      <li v-for="m in r.motivos" :key="m.codigo">{{ m.frase }}</li>
    </ul>

    <section v-if="falta.length">
      <h3>O que falta</h3>
      <ol class="falta">
        <li v-for="(f, i) in falta" :key="i">
          <button v-if="f.tipo === 'concluido'" @click="emit('focar', f.id)">
            {{ textoFalta(f) }}
          </button>
          <span v-else>{{ textoFalta(f) }}</span>
        </li>
      </ol>
    </section>

    <section v-if="r?.instrucoes.length">
      <h3>Quando fazer</h3>
      <ul>
        <li v-for="(m, i) in r.instrucoes" :key="i">
          {{
            'horario' in m
              ? `Entre ${m.horario.de}h e ${m.horario.ate}h`
              : 'livre' in m
                ? m.livre
                : 'veiculo' in m
                  ? `De ${m.veiculo}`
                  : `Clima: ${m.clima}`
          }}
        </li>
      </ul>
    </section>

    <section v-if="dicas.length">
      <h3>Dicas</h3>
      <p v-for="(d, i) in dicas" :key="i" class="dica">{{ d.texto }}</p>
    </section>

    <div class="acoes">
      <button class="primario" @click="emit('alternar', no.id)">
        {{ feito ? 'Desmarcar' : 'Marcar como feito' }}
      </button>
      <button @click="compartilhar">{{ copiado ? 'Link copiado' : 'Compartilhar' }}</button>
      <button v-if="oculto" @click="revelar(no.id)">Revelar nome</button>
    </div>

    <details class="fontes">
      <summary>Fontes e confiança</summary>
      <ul>
        <li v-for="(f, i) in no.fontes" :key="i">
          <a v-if="f.url" :href="f.url" target="_blank" rel="noopener noreferrer">{{
            f.nome ?? f.url
          }}</a>
          <span v-else>{{ f.nome ?? f.tipo }}</span>
          <small v-if="f.licenca"> · {{ f.licenca }}</small>
        </li>
      </ul>
    </details>
  </article>
</template>

<style scoped>
header {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}
.voltar {
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 50%;
  background: var(--superficie);
  flex: none;
}
h2 {
  margin: 2px 0 0;
  font-size: 21px;
}
.cat {
  margin: 0;
  display: flex;
  gap: 8px;
  align-items: center;
  color: var(--texto-suave);
  font-size: 13px;
}
.cat i {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
.status {
  font-weight: 700;
  margin: 12px 0 6px;
}
.status.disponivel {
  color: var(--ok);
}
.status.perdido {
  color: var(--texto-fraco);
}
.status.bloqueado,
.status.futuro {
  color: var(--acento-2);
}
.risco {
  color: var(--perigo);
}
.selo {
  color: var(--texto-fraco);
  font-weight: 500;
}
.motivos {
  margin: 0;
  padding-left: 18px;
  color: var(--texto-suave);
}
h3 {
  margin: 16px 0 6px;
  font-size: 12px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--texto-suave);
}
.falta button {
  border: 0;
  background: none;
  padding: 4px 0;
  color: var(--acento);
  text-align: left;
}
.dica {
  margin: 0 0 6px;
  color: var(--texto-suave);
  line-height: 1.45;
}
.acoes {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 18px 0 8px;
}
.acoes button {
  min-height: 44px;
  padding: 0 16px;
  border: 0;
  border-radius: 999px;
  background: var(--superficie);
  font-weight: 600;
}
.acoes .primario {
  background: linear-gradient(90deg, var(--acento), var(--acento-2));
  color: #1a1f33;
}
.fontes {
  color: var(--texto-suave);
  font-size: 13px;
  margin-top: 8px;
}
</style>
