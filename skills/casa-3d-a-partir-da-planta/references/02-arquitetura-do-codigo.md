# Fase 2: arquitetura do código e base do aplicativo

**Objetivo:** ter a cena rodando com paredes cortáveis, três modos de visão (3D, Planta, Caminhar), painel de controles e rótulos, antes de qualquer detalhe.

## Estrutura do arquivo (ordem importa)

Um único `<script type="module">` com seções em ordem. Os "módulos" são seções do mesmo arquivo; cada uma só pode usar o que foi declarado **antes**.

1. HTML + CSS (painel flutuante à esquerda; folha inferior no celular; tema claro/escuro).
2. `importmap`: `three` e `three/addons/` em `cdn.jsdelivr.net/npm/three@0.160.0/`.
3. Imports: `OrbitControls`, `CSS2DRenderer`, `BufferGeometryUtils` (`mergeGeometries`, `mergeVertices`), `RoundedBoxGeometry`, `RoomEnvironment`, `RectAreaLightUniformsLib`, `GLTFLoader`.
4. **Dados da planta**: `PLAN_IMG`, `H`, `DOOR_TOP`, `CX`, `CZ`, `wx`, `wz`, `WALLS`, `WINDOWS`, `DOORS`, `ROOMS`.
5. Renderizador, cena, câmera, controles.
6. Texturas procedurais (`texCanvas`) e materiais (`M`).
7. Helpers de geometria (`boxGeo`, `mesh`, `floorPlane`).
8. Terreno e pisos; paredes, vãos e esquadrias.
9. **Móveis**, **veículo**, **portas**.
10. Planta sobreposta, rótulos, lista de cômodos, câmera e animação, **modos de visão**, **modo caminhar**.
11. **Iluminação**.
12. **Muros, fachada e portão**.
13. **Paisagismo**.
14. **Tomadas**.
15. **Cobertura**.
16. **Rua e vizinhança**.
17. **Desempenho** (por último: mescla de estáticos, sob demanda, perfis) e o loop de animação.

## Conceitos-chave

- **Coordenadas:** a planta usa (X, Y) em metros, Y para baixo. No 3D: `x = wx(X)`, `z = wz(Y)`, `y` = altura. Toda função que recebe posição de planta converte com `wx/wz`.
- **Corte de paredes:** `clipPlane` (plano horizontal) e `clip = [clipPlane]`. **Todo material que representa elemento fixo da casa recebe `clippingPlanes: clip` e `clipShadows: true`**, senão ele fica flutuando quando o corte baixa. `setCut(h)` move o plano. Isso vale para paredes, portas, tomadas, luminárias presas à parede.
- **Modos:** `setMode('orbit' | 'top' | 'walk')`. No modo caminhar: câmera a 1,60 m, raio de colisão 0,20 m (`RADIUS`), grade espacial de obstáculos (células de 0,5 m), forro visível, corte travado no pé-direito. **O ponto inicial do caminhar fica do lado de fora do muro** (calçada, em frente ao portão).
- **Colisão:** lista `obstacles` de retângulos `[x1, y1, x2, y2]`. Todo módulo que cria algo sólido (móvel, pilar, poste, tronco, condutor pluvial) adiciona o seu retângulo. Limites do mundo em `blocked()`.
- **Camadas ligáveis:** caixas de seleção `t-furn`, `t-labels`, `t-doors`, `t-plan`, `t-roof`, `t-outlets`, `t-garden`, `t-urban`, `t-neigh`. Cada camada é um `THREE.Group` próprio.
- **Hooks tardios:** quando um controle (`setCut`, `setMode`) precisa chamar algo definido bem depois (cobertura, por exemplo), declare `let roofVis = null;` antes e chame `if (roofVis) roofVis();`. Evita erro de "zona morta temporal" de `const`.
- **Mola criticamente amortecida** para animar portas e portão (sem biblioteca).

## Build

O HTML-fonte (`casa_template.html`) tem marcadores `__PLAN_B64__` e `__SW4_B64__`. `scripts/build.py` substitui os marcadores e grava o HTML final. **Nunca edite o final.**

Para testar localmente, sirva a pasta com um servidor simples e abra `preview.html`. Se for testar em ferramenta com navegador embutido, evite aba oculta: compilação pesada de shaders pode estourar tempo.

## Verificação

- Console sem erros.
- Os três modos funcionam; o corte de paredes funciona de 0 a `H`.
- Rótulos dos cômodos aparecem e a lista de cômodos leva a câmera até eles.
- Em caminhar, não atravessa paredes; as portas abrem ao chegar perto.
