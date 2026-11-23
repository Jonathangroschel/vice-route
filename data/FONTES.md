# Fontes do catálogo e créditos

Cada nó do catálogo registra a própria origem em `fontes[]`. Este arquivo lista as fontes usadas em massa, a licença de cada uma e o que alteramos, como pede a CC BY 4.0 (RF-002-14). O app mostra o mesmo conteúdo na página Créditos.

## Fontes importadas

| Fonte | O que usamos | Licença | Alterações feitas |
|---|---|---|---|
| [Open GTA 6 Map](https://github.com/fbritoferreira/gta6), de fbritoferreira e colaboradores | Pinos de colecionáveis, atividades e crimes (`public/data/locations.json`) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Tipos agrupados nas categorias do Vice Route; cartas agrupadas por conjunto; posições convertidas por transformação afim para pixels do mapa oficial da Rockstar; descrições resumidas a 280 caracteres; IDs próprios (o ID original fica em `ids_fonte`); tipos de serviço (lojas, pontos de ônibus, bares) não importados |
| [GTA6Maps: GTA 6 Leonida Map Marker Dataset](https://gta6maps.io/gta-6/map-data) ([repositório](https://github.com/duanhesen/gta6-leonida-map-data)) | Limiares de 100% e capítulos (`data/completion-100-thresholds.json`) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Nomes de categoria traduzidos; quando outra fonte exige mais, vale o mínimo mais exigente |

Créditos curtos para o canto do mapa: "Dados: Open GTA 6 Map e GTA6Maps (CC BY 4.0) · Mapa: Rockstar Games".

## Fontes de referência (não importadas em massa)

Usadas para conferência e levantamento assistido, sempre com link em `fontes[]` do nó (RF-002-16):

- [Vice Atlas](https://www.vice-atlas.com/): posição dos rótulos do mapa da Rockstar, usada para calcular os pontos de controle da transformação afim (`tooling/importers/src/open-gta6-map/controle.yaml`); detonados de missões
- [PowerPyx](https://www.powerpyx.com/): checklist de 100%, detonado completo, Strangers & Freaks
- Guias de perdíveis e pontos sem retorno listados em [docs/02-dados-referencias.md](../docs/02-dados-referencias.md) §1.4

## Imagem-base

Mapa de Leonida em pôster imprimível publicado pela Rockstar Games em [rockstargames.com/VI/media](https://www.rockstargames.com/VI/media). Projeto de fã, sem afiliação com a Rockstar Games ou a Take-Two Interactive.
