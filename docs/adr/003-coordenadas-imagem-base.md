# ADR 003: Posições em pixels da imagem-base oficial, tiles próprios na Vercel

- **Status:** aceito
- **Data:** 23/11/2026

## Contexto

Os docs iniciais previam posições em "coordenadas do jogo" e deixavam em aberto onde hospedar os tiles. O levantamento de 23/11/2026 mostrou que:

- O jogo não expõe coordenadas próprias a fontes públicas; os mapas da comunidade posicionam itens sobre uma imagem.
- O Vice Atlas usa o mapa oficial de Leonida publicado pela Rockstar (pôster, 5775 × 7900 px) e grava posições em **pixels dessa imagem** (origem no canto superior esquerdo, y para baixo), com qualidade da posição e o que o pino representa.
- A pirâmide de tiles dessa imagem, com tiles de 512 px e zoom nativo 0 a 4, tem cerca de 230 arquivos webp (10 a 20 MB).

## Decisão

1. **Sistema de posição:** pixels da imagem-base, identificada por um `id` de edição em `data/mapa.yaml` (primeira edição: `leonida-poster-2026-11-19`, mesmo recorte do Vice Atlas: `x 200, y 200, 5376 × 7500`). No Leaflet, `CRS.Simple` com `y` invertido.
2. **Campos de posição:** `x`, `y`, `qualidade` (`verificada` | `aproximada`) e `representa` (`ponto` | `entrada` | `area_busca`), como no Vice Atlas.
3. **Tiles:** gerados por script nosso (`tooling/tiles`, com sharp ou libvips) a partir da imagem original da Rockstar, versionados em `apps/web/public/tiles/<edicao>/` e servidos pela CDN da Vercel. Não se usam nem se apontam os tiles do Vice Atlas.
4. **Troca de base:** nova edição da imagem (por exemplo, captura completa do mapa do jogo) entra com transformação afim a partir da anterior, e as posições são migradas por script, com a versão do catálogo registrando a edição.

**Adendo (mesmo dia):** a fonte principal de pinos, o Open GTA 6 Map (CC BY 4.0), usa unidades próprias, mas traçou o contorno de Leonida sobre esta mesma imagem da Rockstar. Os pinos dele entram por transformação afim ajustada com pontos de controle (spec 002), sem trocar a imagem-base nem copiar os tiles deles (~200 MB).

## Consequências

**Positivas**
- Importar posições do Vice Atlas é direto, sem transformação
- Base oficial e com créditos claros
- Tiles pequenos: cabem no deploy e na cota da Vercel; sem R2 nem segundo serviço

**Negativas**
- O pôster não é o mapa do jogo: ruas sem nomes, rótulos aproximados. Posições finas exigem confirmação no jogo
- Distâncias do planejador (spec 011) precisam de uma escala pixel → metro estimada [A ESCLARECER: medir com dois pontos conhecidos no jogo]
- Trocar a imagem-base exige migrar todas as posições (mitigado pela transformação afim versionada)

## Alternativas descartadas

| Alternativa | Por que não |
|---|---|
| Coordenadas do jogo | Não há fonte pública delas; todo levantamento da comunidade está em pixels de imagem |
| Apontar para os tiles do Vice Atlas | Dependência de terceiro em tempo de execução (princípio 8) |
| Tiles do mapa do jogo de outro site (ex.: GTABase) | Arte capturada por terceiros, sem origem oficial; fica como possível edição futura |
| Cloudflare R2 ou GitHub Pages | Desnecessário para ~20 MB; mais um serviço para manter |
