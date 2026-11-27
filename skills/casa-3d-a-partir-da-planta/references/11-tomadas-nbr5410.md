# Fase 11: tomadas elétricas (NBR 5410 e NBR 14136)

**Objetivo:** tomadas realistas no padrão brasileiro, em quantidade e posição justificadas pela NBR 5410, sem inventar circuitos.

> **Não substitui projeto elétrico.** A modelagem não define circuitos, bitolas, disjuntores ou cargas. Os pontos são **sugestões para representação**.

## Fonte da norma

Os critérios abaixo foram **lidos no texto da NBR 5410:2004** (cláusulas 4.2.1.2.3, 5.1.3.2.2, 6.5.3.1, 9.1.2.1, 9.1.4.3, 9.5.2.2 e 9.5.3). Se tiver acesso ao PDF, extraia com `pdftotext -layout` e confira; a codificação vem em latin1. Se não tiver acesso, **marque como não verificado**.

## Regras da norma aplicadas

| Cláusula | Regra |
|---|---|
| 9.5.2.2.1 a | **Banheiro:** pelo menos 1 tomada junto ao lavatório, respeitando 9.1 |
| 9.5.2.2.1 b | **Cozinha, copa, área de serviço, lavanderia:** 1 por **3,5 m ou fração** de perímetro, e no mínimo **2 acima da bancada da pia** |
| 9.5.2.2.1 c | **Varanda:** pelo menos 1 (pode ficar junto ao acesso se a varanda for < 2 m² ou < 0,80 m de profundidade) |
| 9.5.2.2.1 d | **Sala e dormitório:** 1 por **5 m ou fração** de perímetro, bem distribuídas |
| 9.5.2.2.1 e | **Demais cômodos:** 1 se ≤ 6 m² (até 2,25 m² pode ficar a ≤ 0,80 m da porta, do lado de fora); acima de 6 m², 1 por 5 m ou fração |
| 9.5.2.2.2 | **Potência mínima por ponto:** 600 VA nos molhados (até 3 pontos, ou até 2 quando o conjunto passa de 6), 100 VA nos excedentes e nos demais cômodos |
| 4.2.1.2.3 d | Ponto de **uso específico** a no máximo **1,5 m** do equipamento |
| 9.5.3.1 | Equipamento **acima de 10 A**: circuito independente (por isso tomada de 20 A, marcada como TUE) |
| 9.1.4.3.1 e .2 | **Banheiro:** nenhuma tomada nos volumes 0, 1 e 2; só no **volume 3**, com DR de 30 mA. Volume 1 = box (ou 0,6 m ao redor do chuveiro sem box) até 2,25 m; volume 2 = mais 0,60 m; volume 3 = mais 2,40 m |
| 5.1.3.2.2 | **DR de 30 mA** nos circuitos de banheiro, cozinha, área de serviço, garagem e tomadas externas |
| 6.5.3.1 | Todas as tomadas **com contato de aterramento**, conforme NBR 6147 e NBR 14136 |

**A norma não fixa alturas.** As usadas (0,30 baixa; 0,55 cabeceira; 0,90 a 1,10 bancada; 1,25 TV; 2,05 coifa) são **usuais**, não normativas.

## Modelagem 3D (padrão brasileiro, NBR 14136)

- **Pinos 2P+T:** 10 A com Ø 4,0 mm; 20 A com Ø 4,8 mm; fases a 19 mm entre centros; terra em triângulo. O furo de 20 A é maior que o de 10 A (**diferença real, não só cor**).
- **Placas:** 4x2 vertical (72 × 114 mm) para uma tomada; 4x4 (114 × 114 mm) para duas tomadas lado a lado; 8 mm de espessura com chanfro, janela rebaixada 2 mm, chanfro dos furos, parafuso do módulo.
- **Modelo externo (varanda, garagem):** 2P+T 10 A com **tampa articulada** (IP44), dobradiça e aba de abertura.
- **Acabamento único:** branco acetinado em todas, para consistência.
- **Posição:** por normal da parede (`rotateY(atan2(nx, ny))`), costas rente à parede, sem flutuar nem atravessar.

## Implementação

Seção `TOMADAS ELÉTRICAS` da implementação de referência.

- **Configuração centralizada** em `OUTLETS` (id, ambiente, ponto `at`, normal `n`, altura `h`, tipo `kind`, finalidade `use`). Para mover, trocar ou remover um ponto, edite a lista.
- **Tipos** (`OUTLET_KINDS`): `S10`, `S20`, `D10` (dupla), `EXT` (com tampa).
- **Instanciamento:** uma geometria mesclada por tipo, com **cor por vértice** (placa, face, furos, parafuso) e **um só material**; um `InstancedMesh` por tipo (4 chamadas de desenho no total). O material usa `clippingPlanes: clip`, senão as tomadas flutuam quando o corte das paredes baixa.
- **Metadados derivados** da norma: `va` (potência mínima) e `dr` (circuito com DR), calculados por ambiente.
- **Conferência:** `OUTLET_RULES` e `outletReport()` comparam quantidade prevista com o mínimo exigido por ambiente. Rode `console.table(outletReport())` e **todas as linhas devem estar `ok`**.
- Camada `t-outlets` para ligar e desligar.

## Passo a passo para uma planta nova

1. Calcule **perímetro e área de cada cômodo** a partir dos retângulos de `ROOMS` (perímetro de L = o do retângulo envolvente).
2. Aplique as regras da tabela e some o **mínimo por ambiente** em `OUTLET_RULES`.
3. Pelos móveis da planta, decida onde cada ponto **serve**: cabeceiras (os dois lados da cama), TV (parede oposta ao sofá ou à cama), mesa de trabalho, rack, geladeira, fogão/coifa, bancada da pia (2), micro-ondas ou forno elétrico (20 A), máquina de lavar, varanda, garagem.
4. **Banheiro:** calcule os volumes a partir do box e ponha a tomada no volume 3, junto ao lavatório, com folga.
5. **Evite** tomada atrás de móvel que a impeça de ser usada, perto de portas e janelas (folga de 5 a 10 cm), em canto de parede.
6. Registre os pontos em `OUTLETS`; calcule `va` e `dr`; rode `outletReport()`.

## Armadilhas

- Janela sobre a cuba da pia deixa a parede sem espaço "acima da bancada". Pôr a tomada dupla **no limite da bancada** e **declarar a exceção**.
- Garagem descoberta: tratar como área externa (sem mínimo, DR obrigatório).
- Não afirme que cumpre a norma "inteira": ela tem muito mais (circuitos, seções, proteção). Diga o que foi aplicado.
