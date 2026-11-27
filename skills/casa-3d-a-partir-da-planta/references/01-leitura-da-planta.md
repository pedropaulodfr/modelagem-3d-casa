# Fase 1: leitura da planta

**Objetivo:** produzir `WALLS`, `WINDOWS`, `DOORS` e `ROOMS` em metros, com precisão suficiente para que a sobreposição da planta no piso coincida com as paredes 3D.

## O que foi feito no projeto original

- Duas plantas do mesmo projeto: uma **com cotas** e uma **sem cotas**. A sem cotas serviu para separar *linha de parede* de *linha de cota*: o que aparece nas duas é parede; o que só aparece na cotada é cota.
- A geometria veio dos **vetores do PDF** (não de pixels). Na planta original o traço de parede tinha **1,29 pt** de espessura.
- Escala 1:75; coordenadas em metros, **X para a direita, Y para baixo**, origem no canto superior esquerdo externo da casa.
- O resultado foram trechos de parede (retângulos `[x1, y1, x2, y2]`), vãos de janela com peitoril e verga, portas com dobradiça e sentido de abertura, e cômodos com área, piso e centro.

## Passo a passo

1. **Converta a planta em dados.** Rode:
   ```
   python scripts/extract_plan_vectors.py planta.pdf --scale 75 --out plano.json
   python scripts/extract_plan_vectors.py planta_cotada.pdf --scale 75 --out plano_cotado.json
   ```
   O script lista segmentos por espessura de traço e os textos com posição (cotas, nomes de cômodos, áreas). Se a planta for imagem, não há vetores: meça em pixels com a escala e **declare a incerteza**.
2. **Descubra a espessura do traço de parede.** Ela é a espessura mais frequente entre os traços longos e grossos. Cotas e ligações de cota têm traços finos.
3. **Compare as duas versões** (se existirem). Segmentos que só existem na cotada são cotas: descarte.
4. **Una segmentos colineares** e dê espessura de parede (no original: 0,13 m para paredes internas e externas). Cada trecho vira um retângulo. **Deixe vãos entre os trechos** onde há janela ou porta: o vão é preenchido depois por `WINDOWS` e `DOORS`.
5. **Janelas:** cada vão com `r` (retângulo do vão na parede), `sill` (peitoril) e `top` (verga). Original: J1 sill 1,0 e top 2,2; J2 sill 1,6 (banheiros, janela alta); J3 sill 1,1; J4 sill 1,0; J5 (fachada da sala) sill 1,0.
6. **Portas:** `r` (vão), `hinge` (ponto da dobradiça), `closed` (direção da folha fechada) e `open` (direção para onde abre). Leia o arco de abertura do desenho da planta. Preserve os sentidos.
7. **Cômodos:** `n` (nome), `a` (área da planta), `f` (tipo de piso), `r` (lista de retângulos), `c` (ponto central para o rótulo, quando o centro do retângulo não serve), `outdoor` (garagem descoberta).
8. **Centralize a cena:** `CX` e `CZ` são o centro da casa em metros; `wx = X - CX`, `wz = Y - CZ`. Assim a casa fica perto da origem 3D.
9. **Gere a planta de fundo:**
   ```
   python scripts/pdf_to_png.py planta.pdf --width 1400 --out plan.png
   base64 -w0 plan.png > plan.b64
   ```
   Ela é usada no botão "Planta no piso" (`PLAN_IMG`) e **precisa estar alinhada** ao `CX`/`CZ`. Ajuste a posição e o tamanho da imagem até coincidir.

## Validação (obrigatória)

- Ligue **Planta no piso** e olhe de cima (modo Planta): paredes 3D sobre as linhas do desenho.
- Compare a **área de cada cômodo** calculada pelos seus retângulos com a área escrita na planta (tolerância pequena). O original tem `AREA_TOTAL` conferida.
- Confira portas e janelas uma a uma contra a planta.

## Armadilhas

- Cotas confundidas com paredes: sempre use as duas versões da planta.
- Espessura de parede diferente de 0,13 m: leia da planta, não assuma.
- Janelas "dentro" de paredes sem vão: a parede precisa ser **interrompida** onde há janela, senão a janela fica enterrada.
- A planta não diz pé-direito, peitoris, alturas de porta: use os valores padrão acima e **declare**.
