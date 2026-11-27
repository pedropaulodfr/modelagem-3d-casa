# Fase 11: tomadas elétricas (NBR 5410 e NBR 14136)

**Objetivo:** tomadas realistas no padrão brasileiro, em quantidade e posição justificadas pela NBR 5410, sem inventar circuitos.

> **Não substitui projeto elétrico.** A modelagem não define circuitos, bitolas, disjuntores, quadro, aterramento nem interruptores. Os pontos são **sugestões de representação**.

## Fonte da norma

Os critérios abaixo foram lidos no texto da **ABNT NBR 5410:2004** (cláusulas 4.2.1.2.3,
5.1.3.2.2, 6.5.3.1, 9.1.2.1, 9.1.4.3, 9.5.2.2 e 9.5.3) e da **ABNT NBR 14136:2012**
(dimensões de plugues e tomadas até 20 A). Se tiver acesso aos PDFs, extraia com
`pdftotext -layout` (a NBR 5410 do acervo vem em latin1) e confira; se não tiver, marque o que
não foi verificado.

## Regras da norma aplicadas

| Cláusula | Regra |
|---|---|
| 9.5.2.2.1 a | **Banheiro:** pelo menos 1 ponto junto ao lavatório, respeitando 9.1 |
| 9.5.2.2.1 b | **Cozinha, copa, área de serviço, lavanderia:** 1 ponto por **3,5 m ou fração** de perímetro; **no mínimo 2 tomadas acima da bancada da pia** (no mesmo ponto ou em pontos distintos) |
| 9.5.2.2.1 c | **Varanda:** pelo menos 1 ponto (exceção: pode ficar junto ao acesso se a varanda tiver área < 2 m² ou profundidade < 0,80 m) |
| 9.5.2.2.1 d | **Sala e dormitórios:** 1 ponto por **5 m ou fração** de perímetro, tão uniformemente distribuídos quanto possível |
| 9.5.2.2.1 e | **Demais cômodos:** 1 ponto se área ≤ 2,25 m² (pode ficar a ≤ 0,80 m da porta, do lado de fora); 1 ponto se área > 2,25 m² e ≤ 6 m²; 1 ponto por 5 m ou fração de perímetro se área > 6 m² |
| 9.5.2.2.2 | **Potência mínima por ponto:** 600 VA por ponto, até 3 pontos, nos molhados, **considerando cada ambiente separadamente**; se o total de tomadas no conjunto desses ambientes passar de 6 pontos, admite-se **600 VA até 2 pontos por ambiente** e 100 VA nos excedentes. Nos demais cômodos, 100 VA por ponto |
| 4.2.1.2.3 c/d/e | Ponto de **uso específico (TUE)** com a potência do equipamento, **a no máximo 1,5 m** do equipamento; ponto para vários equipamentos com a quantidade adequada de tomadas |
| 9.5.3.1 | Equipamento **acima de 10 A**: circuito independente (por isso tomada de 20 A marcada como TUE) |
| 9.5.3.2 | Tomadas de cozinha, copa, área de serviço e lavanderia em **circuitos exclusivos** |
| 9.1.2.1 e 9.1.4.3 | **Banheiro:** volumes 0 a 3; nenhum dispositivo nos volumes 0, 1 e 2; tomadas só no **volume 3**, com DR de 30 mA (9.1.4.3.2 c); nenhum interruptor/tomada a menos de **0,60 m** da porta aberta de cabine de banho pré-fabricada (9.1.4.3.3) |
| 5.1.3.2.2 | **DR de 30 mA** nos circuitos de banheiro, cozinha, área de serviço, garagem, tomadas externas e internas que possam alimentar equipamento no exterior |
| 6.5.3.1 | Todas as tomadas fixas **com contato de aterramento (PE)**, conforme NBR 6147 e NBR 14136 |
| 9.5.2.1.1 | Pelo menos 1 ponto de luz fixo no teto por cômodo, comandado por interruptor (para os pontos de luz; interruptores não são modelados) |

**A norma não fixa alturas.** As alturas usadas (0,30 baixa; 0,55 cabeceira; 0,90 a 1,10 bancada; 1,25 TV; 2,05 coifa) são **usuais**, não normativas.

## Modelagem 3D (padrão brasileiro, NBR 14136)

- **Furos da tomada:** 2P+T, fases a **19 mm** entre centros, **terra a 3 mm da linha das fases**
  (o terra fica quase alinhado, não em triângulo largo). Furo de entrada **Ø 4,3 mm (10 A)** e
  **Ø 5,0 mm (20 A)**; o Ø 4,0/4,8 mm é dos **pinos do plugue**, não do furo da tomada.
- **Compatibilidade:** a tomada de 20 A aceita plugue de 10 A (furo maior); a de 10 A não aceita
  plugue de 20 A. Não é só diferença de cor: o furo muda de diâmetro.
- **Superfície protetora hexagonal** (aprox. 37 × 28 mm), rebaixada na face do módulo.
- **Placas:** 4x2 vertical (72 × 114 mm) para uma tomada; 4x4 (114 × 114 mm) para duas tomadas lado
  a lado; 8 mm de espessura com chanfro. O parafuso de fixação fica na placa, abaixo da janela do
  módulo — não sobre a face do soquete.
- **Modelo externo (varanda, garagem):** 2P+T 10 A com **tampa articulada** (IP44), com DR de 30 mA.
- **Acabamento único:** branco acetinado em todas, para consistência.
- **Posição:** por normal da parede (`rotateY(atan2(nx, ny))`), costas rente à parede, sem flutuar
  nem atravessar; a placa não pode invadir vão de porta/janela, ficar atrás de móvel alto nem
  abaixo de tampo de bancada quando o uso é de bancada.

## Implementação

Seção `TOMADAS ELÉTRICAS` da implementação de referência.

- **Configuração centralizada** em `OUTLETS` (id, ambiente, ponto `at`, normal `n`, altura `h`, tipo
  `kind`, finalidade `use`). Para mover, trocar ou remover um ponto, edite a lista.
- **Tipos** (`OUTLET_KINDS`): `S10`, `S20`, `D10` (dupla), `EXT` (com tampa).
- **Instanciamento:** uma geometria mesclada por tipo, com **cor por vértice** (placa, face, furos,
  parafuso, anel hexagonal) e **um só material**; um `InstancedMesh` por tipo (4 chamadas de
  desenho no total). O material usa `clippingPlanes: clip`, senão as tomadas flutuam quando o corte
  das paredes baixa.
- **Metadados derivados** da norma: `va` (potência mínima, contada por ambiente) e `dr` (circuito
  com DR).
- **Conferência:** `OUTLET_RULES` é gerada a partir de `ROOMS` (área `a` e perímetro `p`) e
  `outletReport()` compara previsto × mínimo, incluindo as 2 tomadas da pia. Rode
  `console.table(outletReport())` e **todas as linhas devem estar `ok`**.
- **Teste automatizado:** `.qa/outlets-audit.mjs` confere quantidade, posição, vãos, móveis,
  volumes de banheiro, TUE, DR, potência e a geometria NBR 14136 (falha com código de saída 1).
- Camada `t-outlets` para ligar e desligar; o material usa `clippingPlanes` para acompanhar o corte.

## Passo a passo para uma planta nova

1. Calcule **área e perímetro de cada cômodo** a partir dos retângulos de `ROOMS` (união de
   retângulos; no L, o perímetro do contorno real, não o do retângulo envolvente).
2. Aplique as regras da tabela e gere o **mínimo por ambiente** (o código já faz isso a partir de
   `ROOMS.a` e `ROOMS.p`).
3. Pelos móveis da planta, decida onde cada ponto **serve**: cabeceiras (os dois lados da cama), TV
   (parede oposta ao sofá ou à cama), mesa de trabalho, rack, geladeira, fogão/coifa, bancada da pia
   (2 acima da bancada), micro-ondas ou forno elétrico (20 A), máquina de lavar, varanda, garagem.
4. **Banheiro:** calcule os volumes a partir do box e ponha a tomada no volume 3, junto ao lavatório,
   com folga; confira que ela não está a menos de 0,60 m da porta de cabine pré-fabricada.
5. **Evite** tomada atrás de móvel que a impeça de ser usada, perto de portas e janelas (folga de
   5 a 10 cm), em canto de parede, e **nunca sob o tampo** de uma bancada quando o uso é de
   equipamento de bancada (micro-ondas, forno etc.).
6. Registre os pontos em `OUTLETS`; calcule `va` e `dr`; rode `outletReport()` e
   `node .qa/outlets-audit.mjs`.

## Armadilhas

- **Terra a 3 mm** da linha das fases, não em triângulo largo: o plugue entra girado 180° em
  relação ao desenho da tomada, e o terra fica quase na mesma linha dos polos.
- **Ø do furo ≠ Ø do pino**: furo da tomada 4,3 mm (10 A) e 5,0 mm (20 A); pino do plugue 4,0 mm e
  4,8 mm. A tomada de 20 A aceita plugue de 10 A.
- **Janela sobre a cuba da pia:** com peitoril a 1,10 m dá para usar a parede **sob o peitoril**
  (tomada abaixo da janela, acima do tampo) e atender às 2 tomadas exigidas; se não couber, coloque
  a dupla no limite da bancada e **declare a exceção**.
- **Ponto TUE sob o tampo** de balcão é inacessível para o equipamento de bancada: posicione acima
  do tampo e a ≤ 1,5 m do equipamento.
- **Garagem descoberta:** tratar como área externa (sem mínimo, mas com DR obrigatório e tomada
  com tampa). Se a vaga não tem parede própria, o ponto pode ficar na fachada junto à vaga.
- **Banheiro:** tomada só no volume 3 (fora do box + 0,60 m + 0,60 m) e com DR de 30 mA; nunca no
  volume 0/1/2.
- **Não afirme que cumpre a norma "inteira"**: a NBR 5410 tem muito mais (circuitos, seções,
  proteção, aterramento). Diga o que foi aplicado e o que é representação.
