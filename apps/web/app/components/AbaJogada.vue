<script setup lang="ts">
const { catalogo, nos } = useCatalogo()
const { jogada } = useJogada()

const principais = computed(() =>
  (catalogo.value?.nos ?? [])
    .filter((n) => n.tipo === 'missao' && n.subtipo === 'principal')
    .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)),
)
const rotulo = (id: string) => {
  const n = nos.value.get(id)!
  return jogada.value.tetoSpoiler >= n.spoiler
    ? `${n.ordem}. ${n.nome}`
    : `Missão ${n.ordem} · capítulo ${n.capitulo_referencia}`
}
</script>

<template>
  <form class="jogada" @submit.prevent>
    <label>
      Última missão principal concluída
      <select v-model="jogada.ultimaPrincipal">
        <option :value="null">Nenhuma (início do jogo)</option>
        <option v-for="m in principais" :key="m.id" :value="m.id">{{ rotulo(m.id) }}</option>
      </select>
    </label>
    <label>
      Missão principal em andamento
      <select v-model="jogada.principalEmAndamento">
        <option :value="null">Nenhuma</option>
        <option v-for="m in principais" :key="m.id" :value="m.id">{{ rotulo(m.id) }}</option>
      </select>
    </label>
    <label>
      Personagem atual
      <select v-model="jogada.personagem">
        <option :value="null">Tanto faz</option>
        <option value="jason">Jason</option>
        <option value="lucia">Lucia</option>
      </select>
    </label>
    <label>
      Perfil de recomendação
      <select v-model="jogada.perfil">
        <option value="cacador100">Caçador de 100%</option>
        <option value="equilibrio">Equilíbrio</option>
        <option value="historiaPrimeiro">História primeiro</option>
      </select>
    </label>
    <label>
      Nível de spoiler
      <select v-model.number="jogada.tetoSpoiler">
        <option :value="0">0 · só categoria e posição</option>
        <option :value="1">1 · nomes de itens e dicas</option>
        <option :value="2">2 · nomes de missões</option>
        <option :value="3">3 · tudo, inclusive história</option>
      </select>
    </label>
    <p class="nota">
      Seu progresso fica salvo neste navegador. Contas e sincronização entre aparelhos chegam com a
      spec 003.
    </p>
  </form>
</template>

<style scoped>
.jogada {
  display: grid;
  gap: 14px;
}
label {
  display: grid;
  gap: 6px;
  font-size: 14px;
  color: var(--texto-suave);
}
select {
  height: 46px;
  border-radius: 12px;
  border: 1px solid var(--folha-borda);
  background: var(--superficie);
  color: var(--texto);
  padding: 0 12px;
  font: inherit;
}
.nota {
  color: var(--texto-fraco);
  font-size: 13px;
}
</style>
