# Fase 9: rua e vizinhança

**Objetivo:** contexto urbano plausível ao redor da casa, **sem competir com ela** e **sem custo excessivo**.

> **Nada aqui vem da planta.** Rua, calçadas e casas vizinhas são **ambientação com dimensões estimadas**. Declare isso no código e no resumo.

## O que foi feito no projeto original

Seção `RUA E VIZINHANÇA` (7 partes). Duas camadas independentes:

- **`t-urban` ("Rua e calçadas")**, ligada por padrão: asfalto, meio-fio, sarjeta, calçadas, postes, sinalização, bueiros, hidrante, árvores de calçada.
- **`t-neigh` ("Vizinhança")**, **desligada por padrão**: 4 casas de cada lado da casa e 6 do outro lado da rua, com muros, portões e pilares.

**Medidas adotadas (estimativas):**

| Item | Valor |
|---|---|
| Rua entre meios-fios | 7,0 m (eixo em y = 23,85) |
| Calçada | 1,75 m, topo em −0,10; meio-fio 15 cm |
| Asfalto | topo em −0,25 (rua "em trincheira") |
| Rebaixo de guia | em frente a cada garagem (rampa em cunha) |
| Lotes vizinhos | 10 × 20 m, alinhados à frente da casa |

**Realismo:** asfalto com textura e remendos, calçada em placas de 1 m com juntas, eixo tracejado amarelo, rebaixos de garagem, bueiros com grelha, tampas de inspeção, hidrante, poste de iluminação pública (cilindro cônico, braço de tubo, luminária), placa de velocidade (30 km/h, **sem nome de rua real**), árvores de calçada (oiti: tronco e copa de folhas instanciadas). Casas vizinhas com **variedade** (1 ou 2 pavimentos, telhado de duas águas ou laje com platibanda, lado da garagem, cores, balcão) e **três níveis de detalhe** (volume, aberturas, ornamentos).

**Noite sem luzes reais:** os postes e janelas acendem só por **emissivo** e **manchas de luz no asfalto** (`GLOWS`, plano com gradiente radial aditivo). `updateUrbanLights(key)` é chamado em `applyDaylight`. Isso não aumenta o custo da iluminação.

**Técnica:**
- Tudo estático vai por `ugPush(material, geometria, célula)` e é montado em **blocos mesclados por célula de 18 m e material**; árvores e folhas são `InstancedMesh`.
- **Duas raízes**: `urbanGroup` (rua) e `neighGroup` (vizinhos), **ambas na lista de raízes de `mergeStaticMeshes`**. A mescla recoloca as peças na raiz, então a visibilidade tem que estar **na raiz**, não num filho.
- Casas vizinhas espelhadas do outro lado da rua usam `YM` (espelho em torno de y = `ST.ym`).
- Sem sombras projetadas pelos elementos urbanos; só rua, calçada e meio-fio **recebem**.
- Colisão: postes, troncos e hidrante dentro do limite caminhável; muros vizinhos próximos entram em colisão **só quando a vizinhança está ligada** (`NEIGH_OBST`).
- `controls.maxDistance` sobe para ≈ 95 m.

## Como adaptar

1. A rua fica **na frente** da divisa frontal do seu terreno. Ajuste `ST` (eixo e largura) e a posição dos lotes à sua implantação. Se o terreno fizer esquina ou tiver rua nos fundos, diga isso.
2. Pergunte (ou declare) se há calçada, árvores e postes reais; sem informação, mantenha ambientação **discreta**.
3. Lotes vizinhos: use as **mesmas dimensões** do seu terreno. Mantenha a variedade, mas sem tons berrantes.
4. A casa principal precisa continuar sendo o destaque: vizinhos em tons neutros, menos detalhes que a sua fachada.

## Armadilhas (erros reais)

- **Árvores do outro lado da rua apareceram do lado da casa**, bem no ponto inicial do caminhar, bloqueando movimentos laterais. A função de espelho `my()` só espelha dentro de `house()`; para outros elementos use a conta explícita `2 * ST.ym - Y`.
- **Botão "Vizinhança" não escondia nada**: o grupo estava dentro de `urbanGroup`, e a mescla moveu as peças para a raiz. Solução: grupo próprio e raiz própria.
- **Bolas verdes** (arbustos de icosfera nos lotes vizinhos): removidas.
- Gramado: remova `scene.userData.ground` antes de criar os dois gramados que a rua divide.
- Remova a calçada antiga da lista de calçadas da casa, senão sobrepõe a nova.

## Verificação

Vista aérea e a partir da rua (de dia e à noite), com a vizinhança ligada e desligada. Caminhar na calçada sem travar. Desempenho no painel F3 antes e depois.
