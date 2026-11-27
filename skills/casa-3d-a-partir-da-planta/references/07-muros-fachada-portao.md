# Fase 7: muros, fachada e portão

**Objetivo:** implantar a casa no terreno com muros, pilares, revestimentos, portão motorizado e arandelas, sem mexer nas paredes da casa.

## O que foi feito no projeto original

Seção `MUROS, FACHADA E PORTÃO` (8 partes).

- **Implantação** (`LOT`, `MURO`): terreno de **10 × 20 m**; a casa (7,37 × 18,45 m) **centralizada na largura**, com **1,315 m de recuo em cada lateral** e 1,55 m restantes nos fundos. A linha desenhada na frente da garagem (y = 18,45) é a **divisa frontal**, onde fica o portão. Muro de 0,13 m de espessura e 2,20 m de altura; pilares de 2,50 m.
- **Garagem sem paredes laterais:** só o portão entre dois pilares. Duas paredes laterais que existiam por engano foram **removidas**.
- **Muro em segmentos** (`MURO_SEGS`) com **pilares** (`PILLARS`) e **volumes de pedra** (`STONE_VOLUMES`); capas de concreto (`capAlongX/Y`); mapeamento de textura planar em coordenadas do mundo (`wUV`) para a textura manter a escala em qualquer parede.
- **Revestimentos:** pedra "ferro" em **filetes com relevo real** (geometria, não só textura) e **ripado de madeira**; reboco claro com textura fina; concreto.
- **Portão de correr motorizado, folha única** (`GATE`): 4,40 m de largura, **corre POR DENTRO do muro** (atrás dos pilares e da parede, em y = 18,261 a 18,311), em metalon com ripas horizontais **vazadas** (vão regulável, padrão 6 cm; acabamento preto fosco ou outro). Motor, trilho e faixa de concreto sob o trilho. Animação por mola; botão "Abrir portão". Colisão por `gateBlocks`: a folha bloqueia onde estiver.
  - Versões anteriores erradas: duas bandas de abrir (descartado: o pedido era de correr para poder motorizar) e folha correndo por fora do muro (descartado).
- **Arandelas** up/down na fachada (`createUpDownSconce`, `facadeSconce`) na zona `fachada`.
- **Entrada de pedestre:** a planta original não tinha portão social; a entrada era pela garagem e pela varanda. O painel de madeira na fachada é revestimento, **não** uma passagem.

## Como adaptar a uma planta nova

1. **Pergunte as dimensões do terreno e os recuos.** Se a pessoa não souber, use proporções plausíveis e declare. A divisa frontal costuma coincidir com o fim da garagem ou do passeio desenhado.
2. Ajuste `LOT`, `MURO_SEGS`, `PILLARS` e o vão do portão à garagem da nova planta. `GATE.W` deve cobrir a vaga com folga.
3. Se a planta tiver **portão social**, abra um vão no muro, modele a folha e adicione colisão e animação.
4. Fachada: escolha materiais com a pessoa (pedra, ripado, cor). O reboco da casa e o do muro devem conversar.
5. **Colisão:** todo trecho de muro, pilar e volume entra em `obstacles`.

## Regras

- Muros nunca alteram a casa: ficam fora do contorno das paredes.
- Garagem descoberta: não crie telhado nem paredes nela sem a planta pedir.
- Chaves de fenda/ferragens não precisam de geometria detalhada; o portão e as ripas sim.

## Verificação

Vista frontal: fachada harmoniosa, portão fechado cobrindo o vão, aberto liberando 4,04 m de curso. Vista lateral: recuo respeitado. Caminhar: o portão fechado bloqueia, o aberto deixa passar.
