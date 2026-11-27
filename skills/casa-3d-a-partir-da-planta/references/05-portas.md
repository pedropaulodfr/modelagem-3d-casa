# Fase 5: portas de marcenaria

**Objetivo:** portas com aparência de marcenaria real, animadas, com colisão, nos vãos que a planta indica.

## O que foi feito no projeto original

Seção `PORTAS` (6 partes).

- **Madeira procedural** (`woodMaterial`, `woodUV`): carvalho/caramelo com veios, poros e variação por peça. `SEED_OFF` muda a semente por porta para que nenhuma seja idêntica. Acabamento acetinado.
- **Todas as portas usam a mesma madeira e cor.** Internas: modelo "moderna" (folha lisa, núcleo maciço aparecendo nas bordas, lâminas de carvalho nas duas faces). **Entrada:** modelo `entrada`, com moldura (dois estilos e duas travessas) e **7 painéis horizontais de fibra deitada**, rebaixados 4 mm e separados por frestas escuras de 6 mm (`leafEntrance`), com ferragens em aço escovado.
- **Componentes:** batente e guarnições, dobradiças (3 nas internas, 4 na entrada), fechaduras (`key`, `privacy`, `exterior`), maçanetas, soleira onde é porta externa.
- **Montagem por vão** (`DOOR_SPECS`, na ordem de `DOORS`): modelo, espessura, tipo de fechadura, número de dobradiças, soleira.
- **Quadro local por porta:** origem na aresta do vão do lado das dobradiças, X = folha fechada, Z = lado para onde abre. Isso faz cada porta abrir no sentido desenhado na planta (`closed` e `open`).
- **Animação** por mola criticamente amortecida até `OPEN_ANGLE` (85°). Abre por **proximidade** no modo caminhar, e todas abrem com a camada "Portas abertas".
- **Colisão** (`doorBlocks`): a folha bloqueia onde estiver; quem estiver no caminho consegue sair.
- **Moldura sem xadrez:** quando a mescla de malhas encontra uma matriz espelhada (determinante < 0), as faces invertem. A solução é `flipWinding(g)` condicional em `mergeStaticMeshes`. Sem isso, a moldura vira xadrez.

## Como adaptar a uma planta nova

1. Monte `DOORS` a partir da planta (vão, dobradiça, `closed`, `open`).
2. Escreva `DOOR_SPECS` na mesma ordem: uma entrada por porta. Escolha `model`, `lock` (privativa nos banheiros, chave nos quartos, `exterior` nas externas) e `sill`.
3. Escolha **uma** madeira para todas e uma ferragem. Se a pessoa mandar foto da porta de entrada, reproduza o **estilo, o modelo e a cor** dela e aplique a mesma madeira às demais.
4. Portas de correr, pivotantes ou duplas exigem modelo novo seguindo o mesmo quadro local.

## Verificação

- Cada porta abre no sentido da planta e para antes de bater na parede.
- Sem fresta de luz entre folha e batente; sem peça atravessando a parede.
- Molduras sem padrão xadrez (teste com a camada mesclada ligada).
- Caminhando, a porta abre ao chegar e a colisão funciona.
