<script setup lang="ts">
import type * as Leaflet from 'leaflet'
import type { ImagemBase } from '@vice-route/catalog-schema'

const props = defineProps<{
  mapa: ImagemBase
  pontos: (PontoMapa & { classe: string; rotulo: string })[]
  selecionado: string | null
  posicao: { x: number; y: number } | null
  modoPosicao: boolean
}>()
const emit = defineEmits<{
  selecionar: [id: string]
  alternar: [id: string]
  posicao: [p: { x: number; y: number }]
}>()

const el = ref<HTMLElement | null>(null)
let L: typeof Leaflet
let mapa: Leaflet.Map | null = null
let camada: Leaflet.LayerGroup | null = null
let eu: Leaflet.Marker | null = null

/** Posições do catálogo são pixels da imagem-base (ADR 003); no Leaflet, latlng = [y, x]. */
const ll = (x: number, y: number) => [y, x] as [number, number]

function desenhar() {
  if (!mapa || !camada) return
  const b = mapa.getBounds().pad(0.25)
  const visiveis = props.pontos.filter((p) => b.contains(ll(p.x, p.y)))
  const porId = new Map(props.pontos.map((p) => [p.id, p]))
  camada.clearLayers()
  for (const m of agrupar(visiveis, mapa.getZoom())) {
    if (m.tipo === 'grupo') {
      const tam = Math.min(46, 28 + Math.log2(m.ids.length) * 4)
      const icone = L.divIcon({
        className: 'vr-grupo',
        html: `<span style="--anel:${anel(m.cores)}"><b>${m.ids.length}</b></span>`,
        iconSize: [tam, tam],
      })
      L.marker(ll(m.x, m.y), { icon: icone, keyboard: true, title: `${m.ids.length} itens` })
        .on('click', () =>
          mapa!.fitBounds([ll(m.limites[0], m.limites[1]), ll(m.limites[2], m.limites[3])], {
            padding: [60, 60],
            maxZoom: 5,
          }),
        )
        .addTo(camada)
      continue
    }
    const p = porId.get(m.ponto.id)!
    const icone = L.divIcon({
      className: `vr-no ${p.classe}${p.id === props.selecionado ? ' selecionado' : ''}`,
      html: `<span style="--cor:${p.cor}"></span>`,
      iconSize: [24, 24],
    })
    L.marker(ll(p.x, p.y), { icon: icone, keyboard: true, title: p.rotulo, alt: p.rotulo })
      .on('click', () => emit('selecionar', p.id))
      .on('contextmenu', () => emit('alternar', p.id))
      .addTo(camada)
  }
}

function desenharPosicao() {
  if (!mapa) return
  eu?.remove()
  eu = null
  if (props.posicao) {
    eu = L.marker(ll(props.posicao.x, props.posicao.y), {
      icon: L.divIcon({ className: 'vr-eu', html: '<span></span>', iconSize: [20, 20] }),
      interactive: false,
    }).addTo(mapa)
  }
}

onMounted(async () => {
  L = (await import('leaflet')).default
  const r = props.mapa.recorte
  const crs = L.extend({}, L.CRS.Simple, {
    transformation: new L.Transformation(1 / 16, -r.x / 16, 1 / 16, -r.y / 16),
  })
  const limites = L.latLngBounds(ll(r.x, r.y), ll(r.x + r.largura, r.y + r.altura))
  mapa = L.map(el.value!, {
    crs,
    minZoom: -1,
    maxZoom: props.mapa.tiles.zoom_max,
    zoomSnap: 0.25,
    maxBounds: limites.pad(0.15),
    maxBoundsViscosity: 0.8,
    attributionControl: false,
    zoomControl: false,
  })
  L.tileLayer(props.mapa.tiles.url, {
    tileSize: props.mapa.tiles.tamanho,
    maxNativeZoom: props.mapa.tiles.zoom_nativo_max,
    minNativeZoom: 0,
    maxZoom: props.mapa.tiles.zoom_max,
    minZoom: -1,
    noWrap: true,
    bounds: limites,
    attribution: 'Mapa: Rockstar Games · Dados: Open GTA 6 Map e GTA6Maps (CC BY 4.0)',
  }).addTo(mapa)
  // Crédito no topo: a folha inferior cobre o canto de baixo, e a CC BY pede crédito visível
  L.control.attribution({ position: 'topleft', prefix: false }).addTo(mapa)
  mapa.fitBounds(limites, { padding: [8, 8] })
  camada = L.layerGroup().addTo(mapa)
  mapa.on('zoomend moveend', desenhar)
  mapa.on('click', (e: Leaflet.LeafletMouseEvent) => {
    if (props.modoPosicao)
      emit('posicao', { x: Math.round(e.latlng.lng), y: Math.round(e.latlng.lat) })
  })
  desenhar()
  desenharPosicao()
})

onBeforeUnmount(() => mapa?.remove())
watch(() => [props.pontos, props.selecionado], desenhar)
watch(() => props.posicao, desenharPosicao)
watch(
  () => props.modoPosicao,
  (m) => el.value?.style.setProperty('cursor', m ? 'crosshair' : ''),
)

/** Centraliza o nó na área visível: no celular, acima da folha inferior (que cobre ~metade da tela). */
function focar(x: number, y: number, zoom = 4.5) {
  if (!mapa) return
  const z = Math.max(mapa.getZoom(), zoom)
  const deslocY = window.innerWidth < 900 ? window.innerHeight * 0.28 : 0
  const deslocX = window.innerWidth >= 900 ? -210 : 0
  const alvo = mapa.project(ll(x, y), z).add([-deslocX, deslocY])
  mapa.flyTo(mapa.unproject(alvo, z), z, { duration: 0.6 })
}
defineExpose({ focar })
</script>

<template>
  <div ref="el" class="mapa" role="application" aria-label="Mapa de Leonida" />
</template>

<style scoped>
.mapa {
  position: absolute;
  inset: 0;
}
</style>
