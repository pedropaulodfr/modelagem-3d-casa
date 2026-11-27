# Fase 3: móveis realistas

**Objetivo:** móveis e equipamentos com aparência de produto real, nas posições que a planta indica, sem alterar a arquitetura.

## O que foi feito no projeto original

Tudo é **procedural** (sem arquivos externos). Seção `MÓVEIS` da implementação de referência.

- **Convenção:** cada `create*()` devolve um `THREE.Group` com **origem no centro da base** do móvel, **frente voltada para +z**. `place(obj, retângulo, face, y0, colide)` posiciona no retângulo da planta e gira para a `face` (`N`, `S`, `E`, `W`, tabela `FACE`). `colide = true` registra o retângulo em `obstacles`.
- **Peças:** guarda-roupas (`createWardrobe`), camas com cabeceira estofada, roupa de cama e travesseiros (`createBed`), escrivaninha e cadeira (`createDesk`, `createOfficeChair`), vaso sanitário, bancada de lavatório, box de vidro (`createToilet`, `createBathroomVanity`, `createShowerBox`), geladeira, gabinete de pia com tampo de granito, fogão de piso, balcão americano arredondado (`createRefrigerator`, `createKitchenSinkCabinet`, `createStove`, `createBarCounter`), sofá, mesa e cadeiras de jantar (`createSofa`, `createDiningTable`, `createDiningChair`), tanque e máquina de lavar (`createLaundryTub`, `createWashingMachine`), cadeiras "ovo" e mesa lateral da varanda (`createEggChair`, `createSideTable`).
- **Materiais PBR** com texturas de canvas: madeira (carvalho, nogueira), tecido, granito, inox escovado, vidro, cromado. Um conjunto `F.*` para móveis e `M.*` para a arquitetura.
- **Geometrias auxiliares:** `RB` (caixa arredondada), `slab` (extrusão de contorno com chanfro), `rrPath`/`stadium` (contornos), `softGeo` (estofado), `taperLeg` (pé cônico), `lathe`, `tubeGeo`. `part(grupo, geometria, material, x, y, z, sombra)` é o ajudante para montar peças.
- **Detalhes que fazem diferença:** rodapé recuado nos armários, vivos (costuras) nas almofadas, puxadores, caixa acoplada no vaso, cuba embutida com torneira, ducha com cano e chuveiro, box com puxador na folha móvel.

## Como adaptar a uma planta nova

1. **Liste os símbolos de mobiliário da planta** (cama, armário, bancada, sofá, mesa, vaso, pia, tanque etc.) com o retângulo de cada um e a **direção em que a frente aponta**. Se a planta não desenha o móvel, **não invente**: declare como sugestão ou deixe de fora.
2. **Reuse as funções `create*`** que servem; ajuste só largura/profundidade/altura recebidas por parâmetro. Crie novas seguindo a mesma convenção (origem na base, frente em +z).
3. **Respeite a planta:** o retângulo passado a `place` é o da planta. Folgas de 1 a 3 cm contra a parede evitam sobreposição.
4. **Regras de coerência que já corrigiram erros no original:**
   - chuveiro **nunca na mesma parede da janela**;
   - a parede da bancada americana **para na altura da bancada** (`COUNTER_H`, 1,05 m), não vai até o teto;
   - o forro (teto) não pode deixar mancha escura onde a parede foi rebaixada: gere forro só para as áreas internas.
5. Registre **colisão** de cada móvel e deixe `false` para itens que o caminhante pode atravessar (cadeira de escritório, vaso sanitário contra a parede).

## Desempenho

Geometrias e materiais **compartilhados** (cadeiras do jantar usam `proto.clone()`); peças estáticas são mescladas depois pelo módulo de desempenho. Evite luzes por móvel.

## Verificação

- Vista 3D com corte baixo: todos os móveis dentro dos cômodos, sem atravessar paredes.
- Modo caminhar: nenhum móvel flutuando, nenhum "fantasma" bloqueando passagem.
- Cada móvel com frente para o lado certo (cabeceira na parede, sofá virado para a TV, pia sob a janela).
