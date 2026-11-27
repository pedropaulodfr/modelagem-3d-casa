# Fase 6: veículo (opcional)

**Objetivo:** um carro realista na vaga da garagem, com troca de cor, sem peso excessivo.

## O que foi feito no projeto original

- Primeira versão: sedã **procedural** (Toyota Yaris), com carroceria por superelipsoides, vidros, faróis, rodas e emblemas. Foi substituída por um **modelo real**.
- Versão final: **Toyota SW4 2022**, malha real convertida do SketchUp (`.skp`) para **GLB**, embutida em base64 (`__SW4_B64__`, ≈ 5,9 MB). Seção `VEÍCULO` da implementação de referência.
- **Carregamento sem `fetch`:** o visualizador de artefatos bloqueia `fetch`, então o GLB é decodificado com `atob` e processado com `GLTFLoader.parse`:
  ```js
  const bin = atob(CAR_GLB.slice(CAR_GLB.indexOf(',') + 1)), bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const gltf = await new Promise((ok, fail) => new GLTFLoader().parse(bytes.buffer, '', ok, fail));
  ```
  Usar `fetch` ou `loader.load(dataURL)` fez o carro **sumir** no artefato. Esse foi um bug real.
- **Cor** (`setCarColor`): seletor "Cor do SW4" altera o material `pintura` (branco pérola e outras).
- **Pintura conforme fotos:** quando o modelo não separa o preto, recorte por região com `splitMeshByTriangle(mesh, pred, mat)`: separa os triângulos cujo centroide atende a um predicado (em coordenadas do GLB) e entrega a outro material. Original: colunas, teto e moldura das janelas em preto brilhante; frisos e estribos pretos; aros grafite; moldura dos faróis em cinza escuro; placa branca. Os predicados `SW4_BLACK_BODY` e `SW4_BLACK_CHROME` são por região, então a borda não é perfeita.
- **Posição:** a vaga é o retângulo da garagem da planta; o carro entra de frente e **não colide** com a vaga.

## Como adaptar

1. **Pergunte** se a pessoa quer carro e **qual**. Peça o arquivo (GLB ou SKP/OBJ para converter). Não há como baixar modelos protegidos por licença: use o que a pessoa fornecer.
2. Converta para GLB, reduza polígonos e texturas (alvo: poucos MB), codifique em base64 e use o marcador no build.
3. Sem modelo: deixe o marcador `__SW4_B64__` vazio. O carregamento está dentro de `try/catch`: o código só avisa no console e a cena segue **sem carro** (garagem vazia). Se quiser algo no lugar, faça um carro procedural simples (carroceria, vidros, rodas). Declare. Se não for usar carro, remova também o seletor "Cor do SW4" do painel.
4. Ajuste escala (um carro de passeio tem ≈ 4,5 m de comprimento e 1,8 m de largura), posição e rotação para a vaga da planta.
5. Se quiser pintura específica, fotografe a referência e use `splitMeshByTriangle` com limites ajustados à malha (abra o modelo para ver as coordenadas).

## Verificação

Carro visível no artefato publicado (não só no preview local), dentro da vaga, sem atravessar muro ou pilar, e com a cor trocando pelo seletor.
