# Fase 8: terreno e paisagismo

**Objetivo:** jardim e vegetação coerentes com o clima, o terreno e o estilo da casa, sem esconder a fachada e sem atrapalhar a circulação.

## O que foi feito no projeto original

Seção `PAISAGISMO`. Camada `Paisagismo` (`gardenGroup`), ligada por padrão.

- **Projeto** (cada elemento tem justificativa):
  - **Interior:** 1 zamioculca na sala (canto livre ao lado da janela J4) e 1 dracena alta na circulação.
  - **Jardim frontal:** resedá (árvore de pequeno porte) mais canteiros de agave e liriópe junto à calçada da garagem.
  - **Recuos laterais e fundos:** faixas de canteiro rente ao muro (liriópe e dracenas).
  - **Fora do muro:** nenhuma intervenção neste módulo (a calçada pública vem na vizinhança); a fachada é a protagonista.
- **Níveis:** terreno em `GY = -0,15`, solo dos canteiros em `SOIL_Y = -0,05`, para canteiros terem altura visível.
- **Técnica:** folhas, pedras e flores são **`InstancedMesh`**, um por tipo (`INST`); troncos, vasos e canteiros são **mesclados**. Funções por espécie: `liriope`, `agave`, `dracena`, `zamioculca`, `resede`, `pot`, `bed`. Folhas com `ovalGeo`, `strapGeo` (faixa que arqueia), material `GM.leaf` com leve emissivo para não ficar preto na sombra.
- **Iluminação paisagística discreta:** 2 spots de piso, 3000 K, sem sombra, zona `jardim`.
- **Colisão** dos canteiros e vasos (retângulos em `obstacles`). *Não foi testada andando em todos os pontos no projeto original: teste na sua.*

## Como adaptar

1. **Áreas livres:** descubra, na planta e na implantação, onde há solo (recuos, jardim frontal, fundos). Nunca plante sobre calçada da garagem, caminho ou vão de porta.
2. **Espécies:** escolha por clima e manutenção (padrão Brasil Sudeste: espécies de baixa manutenção). Mantenha poucas espécies, repetindo (ritmo e unidade).
3. **Proporção:** árvores de pequeno porte perto de casa; nada que cubra janelas.
4. **Desempenho:** `InstancedMesh` por tipo; troncos e vasos mesclados; folhas sem sombra projetada (ou com sombra só nas maiores).
5. Registre a lista de plantas e a justificativa no resumo da entrega.

## Armadilhas

- **Esferas verdes soltas:** arbustos feitos de icosfera simples ficam artificiais e podem aparecer do lado errado do muro. Prefira folhagem real (instâncias de folhas) ou deixe sem arbusto.
- O gramado do terreno é **um plano** (`floorMats.grass`); a rua (fase 9) o recorta em dois.

## Verificação

Vista aérea e vista a partir da rua: vegetação proporcional, sem esconder a fachada; interior com vasos nos cantos certos; colisão ok.
