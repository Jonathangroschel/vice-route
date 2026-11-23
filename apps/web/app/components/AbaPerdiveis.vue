<script setup lang="ts">
const emit = defineEmits<{ focar: [id: string] }>()
const { nos } = useCatalogo()
const { jogada } = useJogada()
const { resultado } = useMotor()

const nome = (id: string) =>
  nomeVisivel(nos.value.get(id), jogada.value.tetoSpoiler, jogada.value.revelados)
const grupos = computed(() => (resultado.value?.perdiveisPorMissao ?? []).slice(0, 15))
</script>

<template>
  <div>
    <p v-if="!grupos.length" class="vazio">Nada perdível à frente com os dados atuais.</p>
    <section v-for="g in grupos" :key="`${g.missao}-${g.momento}`" class="grupo">
      <h3>
        Ao {{ g.momento === 'inicio' ? 'iniciar' : 'concluir' }} {{ nome(g.missao) }}
        <small v-if="g.missoesAtePerder !== null"
          >·
          {{
            g.missoesAtePerder <= 1 ? 'próxima missão' : `em ${g.missoesAtePerder} missões`
          }}</small
        >
      </h3>
      <ul>
        <li v-for="id in g.nos" :key="id">
          <button @click="emit('focar', id)">{{ nome(id) }}</button>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.grupo {
  padding: 10px 0;
  border-bottom: 1px solid var(--folha-borda);
}
h3 {
  margin: 0 0 6px;
  font-size: 15px;
}
h3 small {
  color: var(--perigo);
  font-weight: 600;
}
ul {
  list-style: none;
  margin: 0;
  padding: 0;
}
li button {
  border: 0;
  background: none;
  padding: 6px 0;
  min-height: 36px;
  text-align: left;
  color: var(--texto-suave);
}
.vazio {
  color: var(--texto-fraco);
}
</style>
