<script setup lang="ts">
defineProps<{ compacta: boolean }>()
const { catalogo } = useCatalogo()
const { concluidos } = useJogada()

const p = computed(() =>
  catalogo.value ? calcularProgresso(catalogo.value, concluidos.value) : null,
)
const comPinos = computed(
  () => p.value?.categorias.filter((c) => c.pinos > 0 || c.exigido !== null) ?? [],
)
const barra = computed(() => {
  const total = comPinos.value.reduce((s, c) => s + Math.max(c.pinos, 1), 0)
  return comPinos.value.map((c) => ({
    cor: c.categoria.cor,
    w: (Math.max(c.pinos, 1) / total) * 100,
  }))
})
</script>

<template>
  <div v-if="p" class="progresso">
    <div class="cabeca">
      <h2>100% do jogo</h2>
    </div>
    <div class="total">
      <div class="anel" :style="{ '--p': p.porcentagem }" :aria-label="`${p.porcentagem}% do jogo`">
        <span>{{ p.porcentagem }}%</span>
      </div>
      <p>
        <b>{{ p.achados }}</b> <span>/ {{ p.totalPinos }} achados</span>
      </p>
    </div>
    <div class="barra" aria-hidden="true">
      <i v-for="(s, i) in barra" :key="i" :style="{ background: s.cor, width: `${s.w}%` }" />
    </div>
    <ul v-if="!compacta" class="categorias">
      <li v-for="c in comPinos" :key="c.categoria.id">
        <div class="linha">
          <i class="ponto" :style="{ background: c.categoria.cor }" />
          <span class="nome">{{ c.categoria.nome }}</span>
          <span class="num">
            {{ c.feitos }}/{{ c.pinos }}
            <small v-if="c.exigido !== null" :class="{ ok: c.fechada }">
              ·
              {{
                c.categoria.regra_100.tipo === 'conjuntos_completos'
                  ? `${c.rumo}/${c.exigido} conjuntos`
                  : c.categoria.regra_100.tipo === 'contador'
                    ? `contador ${c.rumo}/${c.exigido}`
                    : `${c.exigido} p/ 100%`
              }}
            </small>
          </span>
        </div>
        <div class="trilho">
          <i
            :style="{
              background: c.categoria.cor,
              width: `${c.pinos ? (c.feitos / c.pinos) * 100 : 0}%`,
            }"
          />
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
h2 {
  margin: 0;
  font-size: 13px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--texto-suave);
}
.total {
  display: flex;
  align-items: center;
  gap: 16px;
  margin: 14px 0;
}
.anel {
  --p: 0;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: conic-gradient(var(--acento) calc(var(--p) * 1%), var(--superficie-forte) 0);
}
.anel span {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--folha);
  font-size: 13px;
  font-weight: 700;
}
.total p {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
}
.total b {
  font-size: 46px;
  background: linear-gradient(90deg, var(--acento), var(--acento-2));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.total span {
  color: var(--texto-suave);
}
.barra {
  display: flex;
  gap: 3px;
  height: 6px;
}
.barra i {
  border-radius: 99px;
  min-width: 4px;
}
.categorias {
  list-style: none;
  padding: 0;
  margin: 14px 0 0;
}
.categorias li {
  padding: 10px 0;
}
.linha {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
}
.nome {
  flex: 1;
}
.num small {
  font-weight: 500;
  color: var(--texto-fraco);
}
.num small.ok {
  color: var(--ok);
}
.ponto {
  width: 14px;
  height: 14px;
  border-radius: 4px;
}
.trilho {
  height: 5px;
  margin-top: 8px;
  border-radius: 99px;
  background: var(--superficie);
  overflow: hidden;
}
.trilho i {
  display: block;
  height: 100%;
}
</style>
