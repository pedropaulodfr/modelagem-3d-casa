# Fase 12: desempenho

**Objetivo:** fluidez em notebook comum e celular, **sem mudar geometria, material ou iluminação**. Seção `DESEMPENHO` da implementação de referência (6 partes), colocada **por último**, antes do loop.

## O que foi feito no projeto original

1. **Renderização sob demanda** (`PERF = { dirty, lastRender, lastActive, sharp, hold }`): só desenha quando algo mudou (câmera, animação, interface) e, no mínimo, **1 vez por segundo**. `invalidate(n)` marca "sujo".
2. **Mescla de peças estáticas** (`mergeStaticMeshes`): une malhas por **célula de 5 m e material** (e por sombra), para poucos draw calls. Ignora transparentes, instanciadas, multimateriais e dinâmicas (`inDynamic`: portas, portão, carro). Peças minúsculas (raio < 4 cm) deixam de projetar sombra. Aplica `flipWinding` quando a matriz tem determinante < 0.
3. **Matrizes congeladas** (`freezeMatrices`): `matrixAutoUpdate = false` em tudo que não se move.
4. **Perfis de qualidade** (`QUALITY`): **Alto** (dpr até 2, sombra do sol 2048, anisotropia 8), **Equilibrado** (dpr até 1,5, sombra 2048, anisotropia 4; padrão), **Desempenho** (dpr 1, sombra 1024, anisotropia 2, corte de luzes por distância de 10 m).
5. **Resolução automática** (`autoRes`): mede o tempo de quadro (média exponencial) e reduz a resolução até o piso de 0,6 quando passa de 26 ms. **Só em movimento**: parado, volta à resolução total em 0,3 s (`PERF.sharp`).
6. **Painel de diagnóstico (F3):** chamadas de desenho, triângulos, texturas, tempo de quadro. Sem custo quando desligado.
7. **Grade espacial de colisão** (células de 0,5 m).
8. **Pré-aquecimento síncrono de shaders** atrás da tela de carregamento: renderiza **Noite** e **Entardecer** uma vez e restaura o estado em `finally`. Sem isso, a primeira troca de horário trava, porque o número de luzes muda e todos os materiais recompilam.

## Regras e lições

- **Cada módulo novo deve entrar nas raízes da mescla** (`for (const root of [furnGroup, archGroup, ceilGroup, lightGroup, gardenGroup, urbanGroup, neighGroup, roofGroup])`). Esquecer significa centenas de draw calls extras; ou, pior, a visibilidade quebra.
- **Visibilidade por camada deve ser na raiz.** A mescla recoloca as peças na raiz do módulo; um filho escondido deixa de esconder.
- **InstancedMesh não é mesclado**; use para elementos repetidos (folhas, tomadas, ripas, seixos). Materiais de instâncias precisam de `clippingPlanes` se a peça é presa à casa.
- **Sombras:** `shadowMap.autoUpdate = false` e `needsUpdate = true` quando algo muda. Muitos elementos não projetam sombra (urbanos, plantas pequenas).
- **`compileAsync` não resolve** o pré-aquecimento (nenhum programa foi criado e o estado ficou preso em "noite" com a aba oculta). O que funciona é o pré-aquecimento **síncrono**.
- **Corte de luzes por distância** só no perfil Desempenho; nos demais causa recompilação ao andar.
- Evite criar luzes novas por elemento (tomadas, postes, janelas): use **emissivo** e manchas de luz.
- **Não medir desempenho com a aba oculta**: o navegador acelera o quadro e os números enganam.

## Metas e medidas

- Meta: chamadas de desenho baixas (dezenas, não milhares), sem travar ao trocar horário, 30+ fps em notebook comum.
- No projeto original, o custo contínuo da noite (≈ 46 luzes) **não** foi reduzido sem alterar a iluminação; ficou como limitação conhecida.
- Registre antes e depois (F3) a cada módulo grande.
