# Fase 13: verificação, armadilhas e entrega

## Checklist de aceitação

**Fidelidade à planta**
- [ ] Planta no piso coincide com as paredes 3D.
- [ ] Áreas dos cômodos batem com a planta.
- [ ] Portas e janelas nos vãos certos; sentidos de abertura iguais aos da planta.
- [ ] Nada foi "melhorado" além da planta: dimensões, posição de paredes, implantação.

**Funcionamento**
- [ ] Console sem erros ao carregar e ao trocar modos, horários, cenas e camadas.
- [ ] Modos 3D, Planta e Caminhar. Corte das paredes de 0 a `H`.
- [ ] Caminhar começa **fora do muro**; não atravessa paredes; portas abrem por proximidade; portão fechado bloqueia e aberto libera.
- [ ] Todas as camadas ligam e desligam de verdade (teste cada uma).
- [ ] Horários e cenas de luz funcionam; trocar para Entardecer/Noite não trava.

**Visual** (abrir em pelo menos 4 vistas: aérea, frontal pela rua, lateral, interna)
- [ ] Fachada harmoniosa; cobertura escondida atrás da platibanda (se for a solução).
- [ ] Interior legível de dia e à noite; sem manchas pretas no teto.
- [ ] Molduras de porta sem xadrez; sem peças flutuando ou atravessando paredes.
- [ ] Vizinhança desligada por padrão; rua e calçadas ligadas.

**Desempenho**
- [ ] F3: chamadas de desenho e triângulos dentro do esperado após a mescla.
- [ ] Sem travada ao trocar horário; resolução automática funcionando.

**Elétrica**
- [ ] `node .qa/outlets-audit.mjs` sem falhas: mínimos por ambiente, 2 tomadas acima da pia, volumes de banheiro, TUE, DR, potência e furos NBR 14136.
- [ ] Close-ups das tomadas: 3 furos 2P+T, fases a 19 mm, terra a 3 mm, furo maior na de 20 A, superfície hexagonal.
- [ ] Nenhuma tomada atrás de móvel alto, folha de porta, sob tampo de bancada ou dentro de vão de janela.

**Declarações**
- [ ] Hipóteses listadas (pé-direito, terreno, norte, cobertura, rua, tomadas).
- [ ] Texto dizendo que **não substitui** projeto estrutural, elétrico, de impermeabilização ou de cobertura.

## Armadilhas conhecidas (todas aconteceram)

| Sintoma | Causa | Solução |
|---|---|---|
| Carro some no artefato | `fetch` é bloqueado no visualizador | decodificar GLB com `atob` + `GLTFLoader.parse` |
| Botão de camada "não faz nada" | a mescla recolocou as peças na raiz | grupo próprio, na lista de raízes, visibilidade na raiz |
| Erro "Cannot access 'x' before initialization" | `const` usado antes de declarado (ex.: `invalidate`) | gancho tardio (`let fn = null`) ou mover o código |
| Moldura das portas em xadrez | matriz espelhada inverte faces na mescla | `flipWinding` quando `determinant() < 0` |
| Elemento flutuando quando o corte baixa | material sem `clippingPlanes` | usar `clip` e `clipShadows: true` |
| Trava ao trocar para Noite/Entardecer | recompilação de shaders | pré-aquecimento **síncrono** atrás do carregamento |
| `compileAsync` não aquece | não cria programas | não usar; ver acima |
| Cena presa em "noite" depois do teste | aba oculta interrompeu o pré-aquecimento | restaurar estado em `finally`; testar com aba visível |
| Caminhar travado no ponto inicial | tronco de árvore (espelho errado) caiu sobre o ponto | checar `blocked(x, y)` no ponto inicial |
| Mancha preta no teto | parede rebaixada deixou o forro exposto | forro só nas áreas internas |
| Bolas verdes soltas | arbustos de icosfera | folhagem real ou nada |
| Sol entrando por cima | falta laje que só projeta sombra | laje invisível de sombra (`colorWrite: false`) |
| Testes dando "Internal error"/timeout | aba oculta com compilação pesada | chamadas curtas; aba visível |
| Script de patch quebrando no shell | texto longo em heredoc | gravar o script em arquivo e executar |
| Build sobrescreveu o HTML do repositório | `cwd` errado | `build.py` com caminhos absolutos |
| Tomada atrás da folha da porta | ponto perto da parede para onde a porta abre | deslocar o ponto para a faixa entre o móvel e a folha aberta |
| Terra desenhado “em triângulo” | confundir o pino do plugue com o furo da tomada | furo 4,3/5,0 mm e terra a 3 mm da linha das fases |
| Tomada de bancada fora da projeção do tampo | janela ocupa a parede acima da cuba | usar a parede sob o peitoril ou declarar a exceção |
| TUE sob o tampo do balcão | ponto colocado na face baixa da meia-parede | posicionar acima do tampo e a ≤ 1,5 m do equipamento |
| Limite de 16 texturas por material | muitas luzes com sombra | reduzir luzes com sombra |

## Como testar sem a aba em primeiro plano

Exponha um gancho **temporário** só em `localhost`: `if (location.hostname === 'localhost') window.__dbg = { camera, controls, setMode, walker, ... }`. Use para posicionar a câmera e consultar `blocked(x, y)`. **Remova antes do build final** e confira que `grep -c __dbg casa_out.html` dá 0.

## Entrega

1. Gere `casa_out.html` (`scripts/build.py`).
2. Abra e confira o checklist.
3. Publique (se for artefato) e abra o link publicado: o ambiente pode se comportar diferente do preview local (ex.: `fetch`).
4. Mensagem final em linguagem simples: o que foi feito, **onde ficou a hipótese**, o que foi verificado e o que **não** foi, e as limitações conhecidas.

## Limitações conhecidas do projeto original

- Custo contínuo da iluminação noturna (≈ 46 luzes) não reduzido sem alterar a iluminação.
- Pintura do carro por região, com bordas irregulares.
- Colisão dos canteiros do paisagismo não testada andando em todos os pontos.
- Calhas da cobertura sem caimento modelado; cobertura conceitual.
- Tomadas de bancada: a janela sobre a cuba obriga a usar a parede **sob o peitoril**; se não houver essa faixa, declarar a exceção.
