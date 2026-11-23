<script setup lang="ts">
// Link direto para um nó (spec 004 H7): abre o mapa com o detalhe; aliases são resolvidos na tela do mapa.
const route = useRoute()
await navigateTo({ path: '/', query: { no: String(route.params.id) } }, { replace: true })
</script>

<template>
  <div />
</template>
