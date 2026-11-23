/**
 * pnpm tiles:gerar <imagem-do-poster>
 *
 * Gera a pirâmide de tiles do mapa (ADR 003) a partir do pôster oficial de Leonida publicado pela
 * Rockstar, no recorte e no sistema de pixels declarados em data/mapa.yaml.
 *
 * Esquema: no zoom z, 1 px do tile = 16 / 2^z px da imagem-base original. No zoom 4, 1:1 com a edição
 * de 5775 × 7900. Aceita a versão web (2805 × 3840) ou a imprimível; o zoom nativo máximo sai da
 * resolução da imagem recebida e é gravado em data/mapa.yaml.
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { parseDocument } from 'yaml'

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const ARQ_MAPA = join(RAIZ, 'data/mapa.yaml')
const ESCALA_Z4 = 16

interface Mapa {
  edicao: string
  tamanho: { largura: number; altura: number }
  recorte: { x: number; y: number; largura: number; altura: number }
  tiles: { tamanho: number; zoom_nativo_max: number; zoom_max: number }
}

async function main() {
  const entrada = process.argv[2]
  if (!entrada) throw new Error('uso: pnpm tiles:gerar <caminho do pôster (jpg/png)>')
  const doc = parseDocument(readFileSync(ARQ_MAPA, 'utf8'))
  const mapa = doc.toJS() as Mapa
  const img = sharp(resolve(entrada), { limitInputPixels: false })
  const meta = await img.metadata()
  const k = meta.width! / mapa.tamanho.largura
  const kAltura = meta.height! / mapa.tamanho.altura
  if (Math.abs(k - kAltura) > 0.01)
    throw new Error(
      `proporção da imagem (${meta.width}×${meta.height}) não bate com a edição ${mapa.edicao}`,
    )

  // Zoom nativo: o maior z em que não há ampliação (escala do tile ≤ resolução da imagem)
  let zMax = 0
  while (zMax < 6 && 2 ** (zMax + 1) / ESCALA_Z4 <= k * 1.05) zMax++
  const t = mapa.tiles.tamanho
  const r = mapa.recorte
  const recorteFonte = {
    left: Math.round(r.x * k),
    top: Math.round(r.y * k),
    width: Math.round(r.largura * k),
    height: Math.round(r.altura * k),
  }
  const base = await img.extract(recorteFonte).toBuffer()

  const destino = join(RAIZ, 'apps/web/public/tiles', mapa.edicao)
  rmSync(destino, { recursive: true, force: true })
  let total = 0
  let bytes = 0
  for (let z = 0; z <= zMax; z++) {
    const escala = 2 ** z / ESCALA_Z4
    const largura = Math.round(r.largura * escala)
    const altura = Math.round(r.altura * escala)
    const nivel = await sharp(base).resize(largura, altura, { kernel: 'lanczos3' }).toBuffer()
    for (let tx = 0; tx * t < largura; tx++) {
      for (let ty = 0; ty * t < altura; ty++) {
        const w = Math.min(t, largura - tx * t)
        const h = Math.min(t, altura - ty * t)
        const tile = await sharp(nivel)
          .extract({ left: tx * t, top: ty * t, width: w, height: h })
          .extend({ right: t - w, bottom: t - h, background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .webp({ quality: 82 })
          .toBuffer()
        mkdirSync(join(destino, String(z), String(tx)), { recursive: true })
        writeFileSync(join(destino, String(z), String(tx), `${ty}.webp`), tile)
        total++
        bytes += tile.length
      }
    }
    console.log(`z${z}: ${largura}×${altura}`)
  }
  doc.setIn(['tiles', 'zoom_nativo_max'], zMax)
  writeFileSync(ARQ_MAPA, doc.toString({ lineWidth: 0 }))
  console.log(
    `${total} tiles, ${(bytes / 1024 / 1024).toFixed(1)} MB em apps/web/public/tiles/${mapa.edicao}; zoom nativo máximo ${zMax}`,
  )
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
