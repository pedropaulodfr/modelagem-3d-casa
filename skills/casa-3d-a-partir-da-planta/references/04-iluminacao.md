# Fase 4: iluminação (projeto luminotécnico)

**Objetivo:** luz natural em cinco horários e luz artificial por ambiente, com cenas prontas, sem pesar no desempenho.

## O que foi feito no projeto original

Seção `ILUMINAÇÃO` (6 partes): (1) cor e fotometria, (2) luminárias, (3) plano de luz por cômodo, (4) gerenciador, (5) luz natural, (6) controles.

- **Fotometria:** temperatura de cor em kelvin convertida para RGB (`kelvinRGB`), fluxo em lúmens (`lm`), refletância das superfícies. `RectAreaLightUniformsLib.init()` para luz de área.
- **Tipos de luminária** (`TYPE_GROUP`): `spot` (embutido), `plafon`, `pendant`, `sconce` (arandela), `reading` (leitura), `led` (perfil de LED), `bollard` (balizador), `flood` (refletor), `facade`. Funções: `plafon`, `pendant`, `readingSpot`, `sconce`, `bollard`, `flood`, `facadeSconce`, cada uma cria geometria (`create*`) e a fonte de luz.
- **Zonas** (`ZONES`): cada ambiente tem ponto de medição, altura do plano de trabalho (`h`) e faixa-alvo de lux (`t: [min, max]`). Original: sala 100 a 200 lux, jantar 150 a 300, cozinha 200 a 400, circulação 75 a 150, quartos 100 a 200.
- **Horários** (`DAY`): Manhã, Meio-dia, Tarde, Entardecer, Noite. Cada um define azimute e elevação do sol, temperatura da luz do sol, intensidade, hemisfério (céu e chão), cor do céu, `env` (intensidade do ambiente), exposição, **balanço de branco** (`wb`) e a **cena** de luz artificial padrão (Entardecer = "Receber visitas", Noite = "Tudo aceso").
- **Cenas** (`SCENES`): Tudo aceso, Receber visitas, Relaxar, Jantar, Leitura, Trabalho, Limpeza, Descanso, Iluminação noturna, Tudo apagado. Cada cena liga zonas e tipos com intensidades de 0 a 1.
- **Controles:** horário, cena, intensidade global, deslocamento de cor, liga/desliga por zona e por tipo.
- **Luz natural:** sol direcional com sombra, `HemisphereLight`, `RoomEnvironment` com intensidade modulada (`setEnvFactor`). Luz de rebatimento aproximada com luz ambiente (não há GI real).
- **Norte:** a planta não indicava; foi adotado o **topo da folha** como norte e latitude do Sudeste do Brasil.

## Como adaptar a uma planta nova

1. **Recalcule o plano de luz** (`ZONES` e as chamadas de luminária): pontos sobre a **sua** planta, pé-direito `H`, móveis nas posições da sua planta. Não copie coordenadas.
2. **Distribua** por ambiente: geral (plafon ou embutidos), tarefa (bancada, mesa, espelho), ambiente (arandela, LED), cena (pendente sobre a mesa). Quartos: leitura nas cabeceiras. Banheiros: luz no espelho. Externo: balizadores e refletor na garagem, arandelas na fachada.
3. **Calibre** com a faixa de lux de cada ambiente: use o painel de diagnóstico ou calcule por lúmens e área. Declare que é estimativa.
4. **Norte e latitude:** ajuste `az`/`el` se a planta indicar norte ou a cidade for outra.

## Regras que evitam problemas

- **Poucas luzes reais.** Cada luz com sombra custa caro. No original: spots do jardim sem sombra, plafons por spot largo com penumbra, **poucos** spots com sombra.
- **Limite de 16 texturas por material** no WebGL: muitas luzes com sombra estouram o limite. Controle a contagem.
- Sombras do sol: `renderer.shadowMap.autoUpdate = false` e `needsUpdate = true` só quando algo muda (horário, corte, portas).
- **Trocar de horário recompila shaders** (muda o número de luzes acesas). Faça **pré-aquecimento síncrono** de Noite e Entardecer atrás da tela de carregamento (ver `12-desempenho.md`).
- Corte de luzes por distância **só no perfil Desempenho**; nos outros causa recompilação ao andar.
- Luminárias presas à parede usam materiais com `clippingPlanes`.

## Verificação

Abra cada horário e cada cena: sem pontos pretos, sem estouro de luz, sombras plausíveis. À noite, o interior legível e a fachada valorizada. Observe se há travada ao trocar para Entardecer/Noite.
