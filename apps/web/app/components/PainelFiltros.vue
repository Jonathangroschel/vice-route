<script setup lang="ts">
const { catalogo } = useCatalogo()
const { jogada } = useJogada()

const GRUPOS: Record<string, string> = {
  colecionaveis: 'Colecionáveis',
  atividades: 'Atividades',
  crimes: 'Crimes',
  outros: 'Outros',
}
const contagem = computed(() => {
  const m = new Map<string, number>()
  for (const n of catalogo.value?.nos ?? [])
    if (n.posicao && n.categoria) m.set(n.categoria, (m.get(n.categoria) ?? 0) + 1)
  return m
})
const grupos = computed(() =>
  Object.entries(GRUPOS)
    .map(([g, nome]) => ({
      nome,
      cats: (catalogo.value?.categorias ?? []).filter(
        (c) => c.grupo === g && contagem.value.get(c.id),
      ),
    }))
    .filter((g) => g.cats.length),
)
const ocultas = computed(() => new Set(jogada.value.filtros.categoriasOcultas))
function alternar(id: string) {
  const s = new Set(ocultas.value)
  if (s.has(id)) s.delete(id)
  else s.add(id)
  jogada.value.filtros.categoriasOcultas = [...s]
}
const todas = (mostrar: boolean) => {
  jogada.value.filtros.categoriasOcultas = mostrar ? [] : [...contagem.value.keys()]
}
</script>

<template>
  <div class="filtros">
    <div class="atalhos">
      <button @click="todas(true)">Mostrar todas</button>
      <button @click="todas(false)">Esconder todas</button>
    </div>
    <label class="chave"
      ><input v-model="jogada.filtros.ocultarConcluidos" type="checkbox" /> Ocultar
      concluídos</label
    >
    <label class="chave"
      ><input v-model="jogada.filtros.mostrarFuturos" type="checkbox" /> Mostrar ainda não
      liberados</label
    >
    <label class="chave"
      ><input v-model="jogada.filtros.mostrarPerdidos" type="checkbox" /> Mostrar perdidos</label
    >
    <section v-for="g in grupos" :key="g.nome">
      <h3>{{ g.nome }}</h3>
      <button
        v-for="c in g.cats"
        :key="c.id"
        class="cat"
        :class="{ off: ocultas.has(c.id) }"
        :aria-pressed="!ocultas.has(c.id)"
        @click="alternar(c.id)"
      >
        <i :style="{ background: c.cor }" />
        <span>{{ c.nome }}</span>
        <small>{{ contagem.get(c.id) }}</small>
      </button>
    </section>
  </div>
</template>

<style scoped>
.atalhos {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}
.atalhos button {
  flex: 1;
  border: 0;
  border-radius: 999px;
  padding: 8px;
  background: var(--superficie);
}
.chave {
  display: flex;
  gap: 10px;
  align-items: center;
  min-height: 40px;
}
h3 {
  margin: 14px 0 4px;
  font-size: 12px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--texto-suave);
}
.cat {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  border: 0;
  background: none;
  text-align: left;
}
.cat span {
  flex: 1;
}
.cat i {
  width: 14px;
  height: 14px;
  border-radius: 50%;
}
.cat small {
  color: var(--texto-fraco);
}
.cat.off {
  opacity: 0.4;
}
</style>
