<script setup lang="ts">
const emit = defineEmits<{ focar: [id: string] }>()
const { nos, categorias } = useCatalogo()
const { jogada } = useJogada()
const { resultado, porId } = useMotor()

const lista = computed(() =>
  (resultado.value?.proximos ?? []).slice(0, 12).map((id) => porId.value.get(id)!),
)
</script>

<template>
  <div>
    <p v-if="!resultado" class="vazio">Calculando…</p>
    <ol v-else class="lista">
      <li v-for="r in lista" :key="r.id">
        <button class="linha" @click="emit('focar', r.id)">
          <i
            class="ponto"
            :class="{ risco: r.emRisco }"
            :style="{ background: categorias.get(nos.get(r.id)?.categoria ?? '')?.cor ?? '#fff' }"
          />
          <span class="txt">
            <b>{{ nomeVisivel(nos.get(r.id), jogada.tetoSpoiler, jogada.revelados) }}</b>
            <small v-if="r.motivos.length">{{ r.motivos.map((m) => m.frase).join(' · ') }}</small>
            <small v-for="(m, i) in r.instrucoes" :key="i" class="instr">{{
              'horario' in m
                ? `Entre ${m.horario.de}h e ${m.horario.ate}h`
                : 'livre' in m
                  ? m.livre
                  : 'veiculo' in m
                    ? `De ${m.veiculo}`
                    : `Clima: ${m.clima}`
            }}</small>
          </span>
        </button>
      </li>
    </ol>
    <p class="nota">
      Calculado no seu navegador, sem IA. Informe a última missão principal na aba Jogada para
      recomendações mais precisas.
    </p>
  </div>
</template>

<style scoped>
.lista {
  list-style: none;
  margin: 0;
  padding: 0;
}
.linha {
  width: 100%;
  display: flex;
  gap: 12px;
  align-items: flex-start;
  border: 0;
  background: none;
  text-align: left;
  padding: 10px 0;
  border-bottom: 1px solid var(--folha-borda);
}
.txt {
  display: grid;
  gap: 3px;
}
small {
  color: var(--texto-suave);
}
.instr {
  color: var(--acento-2);
}
.ponto {
  width: 14px;
  height: 14px;
  margin-top: 3px;
  border-radius: 50%;
  flex: none;
}
.ponto.risco {
  box-shadow: 0 0 0 3px rgba(255, 93, 108, 0.6);
}
.vazio,
.nota {
  color: var(--texto-fraco);
  font-size: 13px;
}
</style>
