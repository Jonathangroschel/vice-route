# Spec 011: Planejador de sessão

- **Status:** rascunho para revisão (V2)
- **Responsável:** [nome]
- **Depende de:** 004 (mapa), 008 (motor de recomendação), 003 (estado da jogada), 009 (spoilers)
- **Última revisão:** 23/11/2026
- **Referências:** [docs/05-motor-recomendacao.md §3.7](../../docs/05-motor-recomendacao.md), [docs/07-interface-web.md](../../docs/07-interface-web.md)

## 1. Contexto e problema

O ranking de próximos passos (spec 008) diz o que vale a pena fazer, mas não em que ordem percorrer o mapa. O jogador de sessão curta ("tenho 40 minutos, estou no centro") quer uma rota pronta: quais itens, em que sequência, quanto tempo cada trecho leva, agrupando o que precisa ser feito à noite ou de barco. Esta spec implementa o ponto de extensão `planoSessao` deixado pela spec 008 e a tela do planejador.

## 2. Objetivos e não objetivos

**Objetivos**
- Gerar, no navegador e sem token, uma sequência de nós que maximize a soma das pontuações do motor dentro do tempo disponível, partindo da posição do jogador
- Mostrar a rota numerada no mapa e como lista ordenada com tempos estimados
- Agrupar nós com a mesma condição de momento (horário, clima, veículo)
- Deixar o jogador marcar itens conforme avança e recalcular a rota restante

**Fora do escopo**
- Navegação curva a curva ou rotas pelas ruas do jogo; o custo é aproximado
- Planejamento de vários dias ou do jogo inteiro (a rota de referência por capítulo é pré-calculada no build, spec 008)
- Narração do plano em linguagem natural (spec 012)

## 3. Histórias de usuário

### H1 (P1): gerar plano para o tempo que tenho

Como jogador com tempo limitado, quero informar onde estou e quantos minutos tenho e receber uma rota, para aproveitar a sessão.

**Critérios de aceite**
1. Dado posição informada e 60 minutos, quando peço o plano, então recebo uma sequência ordenada de nós disponíveis ou em risco cuja soma de deslocamentos e durações não passa de 60 minutos, com o tempo estimado de cada trecho e o total.
2. Dado perdível na próxima missão principal que caiba no tempo, quando o plano é gerado, então ele está no plano (regra fixa da spec 008 vale aqui).
3. Dado perdível na próxima missão principal que não caiba no tempo, quando o plano é gerado, então o plano avisa "não cabe nesta sessão: X" no topo.
4. Dado posição não informada, quando peço o plano, então o app pede para tocar no mapa ou escolher a região antes de calcular.
5. Dado nenhum candidato no raio dinâmico máximo, quando peço o plano, então recebo mensagem "nada pendente por perto" com sugestão da região com mais pendências.

### H2 (P1): ver a rota no mapa

Como jogador, quero ver a rota numerada no mapa e a lista ao lado, para seguir sem pensar.

**Critérios de aceite**
1. Dado um plano gerado, quando abro o mapa, então vejo marcadores numerados na ordem do plano, ligados por linhas retas, e os demais marcadores esmaecidos.
2. Dado um item do plano, quando toco nele na lista, então o mapa centraliza no marcador e abre o detalhe.
3. Dado nó com condição de momento, quando aparece no plano, então a instrução ("entre 20h e 4h", "de barco") aparece na linha e os nós com a mesma condição ficam em sequência.

### H3 (P1): marcar conforme avanço

Como jogador em sessão, quero marcar o item feito e ver o próximo, sem refazer o plano.

**Critérios de aceite**
1. Dado um plano ativo, quando marco o item 1, então ele fica riscado, o item 2 vira o atual e o tempo restante é atualizado.
2. Dado que pulei um item, quando marco o item 3 antes do 2, então o 2 continua pendente e o plano oferece "recalcular a partir daqui".
3. Dado um plano ativo e o app fechado, quando reabro na mesma jogada, então o plano é restaurado (persistência local).

### H4 (P2): recalcular e ajustar

Como jogador, quero recalcular a partir da posição atual ou excluir categorias, para adaptar o plano.

**Critérios de aceite**
1. Dado um plano ativo, quando toco "recalcular", então o plano é refeito a partir da posição do último item concluído e do tempo restante.
2. Dado que excluo uma categoria ou um item específico, quando recalculo, então eles não aparecem mais no plano (perdíveis excluídos manualmente geram aviso).
3. Dado que escolho meio de transporte (a pé, carro, barco, aéreo), quando recalculo, então os tempos de deslocamento usam o fator correspondente.

## 4. Requisitos funcionais

| ID | Requisito |
|---|---|
| RF-011-01 | O motor DEVE implementar `planoSessao(posicao, minutos, restricoes)` substituindo o stub da spec 008, como função pura e determinística. |
| RF-011-02 | Os candidatos DEVEM ser os 60 nós de maior pontuação (disponíveis, em risco ou gatilhos que destravam perdíveis) num raio dinâmico que cresce até haver candidatos suficientes ou atingir o raio máximo. |
| RF-011-03 | O custo entre dois pontos DEVE ser distância no mapa vezes o fator do meio de transporte, mais penalidade de travessia quando a reta cruza água sem barco, mais a duração do nó de destino. |
| RF-011-04 | A seleção DEVE usar inserção gulosa pela razão pontuação/tempo seguida de melhoria 2-opt, respeitando o limite de tempo. |
| RF-011-05 | Nós com a mesma condição de momento DEVEM ficar contíguos no plano quando isso não aumentar o tempo total em mais de 10%. |
| RF-011-06 | Nós perdíveis na próxima missão principal DEVEM ser inseridos primeiro; se não couberem, o plano DEVE informar quais ficaram de fora. |
| RF-011-07 | O plano DEVE devolver, por item: ordem, nó, tempo de deslocamento, duração, instruções de momento e motivos (da spec 008). |
| RF-011-08 | O plano ativo DEVE ser persistido localmente por jogada e restaurado ao reabrir. |
| RF-011-09 | O app DEVE permitir marcar itens do plano, recalcular a partir da posição atual e excluir categorias ou itens. |
| RF-011-10 | Todo texto do plano DEVE respeitar o teto de spoiler (spec 009). |
| RF-011-11 | Na V2, o custo PODE usar a matriz de tempo entre regiões pré-calculada no build no lugar da reta, quando disponível. |

## 5. Requisitos não funcionais

| ID | Requisito | Meta |
|---|---|---|
| RNF-011-01 | Tempo de `planoSessao` no Worker com 60 candidatos | p95 < 50 ms |
| RNF-011-02 | Qualidade da rota frente ao ótimo em instâncias pequenas (≤ 12 candidatos, força bruta) | Pontuação total ≥ 90% do ótimo |
| RNF-011-03 | Erro do tempo estimado frente ao real, medido pela comunidade (spec 014) | Mediana dentro de ±25% |

## 6. Casos de borda e falhas

- Tempo disponível menor que o menor item: plano vazio com sugestão do item mais rápido por perto.
- Posição dentro da água ou fora do mapa: ajusta para o ponto de terra mais próximo e avisa.
- Item do plano marcado em outra tela: o plano reflete na hora (mesma store).
- Catálogo atualizado com o plano ativo: se um nó do plano foi depreciado, ele é removido e o plano oferece recalcular.
- Mudança de missão principal durante a sessão: o plano é invalidado com aviso, porque janelas e riscos mudaram.
- Nó sem posição (missão sem ponto de início): não entra no plano.
- Condições de momento conflitantes no mesmo grupo (noite e chuva): agrupa por condição exata, sem combinar.

## 7. Entidades e eventos (conceitual)

- **PedidoPlano**: posição, minutos, meio de transporte, categorias e itens excluídos.
- **Plano**: id local, jogada, criado em, versão do catálogo, itens ordenados, tempo total, itens de fora (perdíveis que não couberam).
- **ItemPlano**: ordem, nó, deslocamento, duração, instruções, motivos, estado (pendente, feito, pulado).

Sem dado no servidor; o plano vive no IndexedDB.

## 8. Cenários-ouro

| ID | Estado de entrada | Resultado esperado | Como é verificado |
|---|---|---|---|
| CO-011-01 | 10 candidatos espalhados, 30 min, sem perdíveis | Tempo total ≤ 30 min; pontuação ≥ 90% do ótimo por força bruta | Asserção + comparação com força bruta |
| CO-011-02 | Perdível na próxima principal a 2 km, 20 min | Perdível no plano | Asserção |
| CO-011-03 | Perdível que não cabe no tempo | Plano com aviso listando o perdível | Asserção |
| CO-011-04 | Três nós "à noite" intercalados com diurnos próximos | Os três contíguos | Asserção |
| CO-011-05 | Candidato do outro lado da água, sem barco | Penalidade aplicada; com barco, sem penalidade | Asserção de custo |
| CO-011-06 | Mesmo pedido 100 vezes | Mesmo plano (hash) | Comparação de hash |
| CO-011-07 | Teto de spoiler 1 | Nenhum nome acima de 1 no plano serializado | Busca de texto |

## 9. Métricas de sucesso

- Planos gerados por semana e percentual com pelo menos metade dos itens marcados
- Erro mediano entre tempo estimado e tempo real (spec 014)
- Uso de "recalcular" por plano (alto demais indica plano ruim)

## 10. Checagem contra a constituição

- [x] Ajuda a decidir o próximo passo (princípio 1)
- [x] Perdíveis avisados antes (2) e nível de spoiler respeitado (3)
- [x] Funciona sem IA e sem token (4)
- [x] Dado com origem, confiança e ID estável (6, 7): plano trata nós depreciados
- [x] Decisão no motor determinístico, não no modelo (9, 11)
- [x] Cabe no plano gratuito (13): tudo no cliente
- [ ] RLS e teste de acesso cruzado: não se aplica (plano só local)

## 11. Perguntas em aberto

- [A ESCLARECER: escala da imagem-base (pixels para metros, `mapa.yaml.escala_m_por_px`) e velocidades médias por meio de transporte; medir no jogo.]
- [A ESCLARECER: como detectar que a reta cruza água? Proposta: máscara de água rasterizada em baixa resolução gerada no build a partir dos tiles.]
- [A ESCLARECER: o plano deve sincronizar entre dispositivos (Supabase) ou ficar só local?]
