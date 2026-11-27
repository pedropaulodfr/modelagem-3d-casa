# Casa 3D

Maquete 3D navegável de uma casa térrea, construída a partir da planta baixa
(escala 1:75, **7,37 × 18,45 m**). A casa é gerada por código no navegador; o
carro da garagem (SW4) vai embutido na própria página, como glTF binário em
base64 — o projeto continua sendo um arquivo único.

## Como abrir

Abra o arquivo `casa-3d.html` diretamente no navegador (dois cliques) ou sirva a
pasta com qualquer servidor estático:

```bash
python -m http.server 8000
# depois acesse http://localhost:8000/casa-3d.html
```

O arquivo tem cerca de **6,2 MB** (o modelo do carro responde por ~4,4 MB), então
a primeira abertura demora um pouco mais em conexões lentas.

É necessário acesso à internet: o Three.js 0.160 é carregado por CDN
(importmap) e as fontes vêm do Google Fonts.

## Recursos

- **Três modos de visualização**: 3D (órbita), Planta (vista de cima) e Caminhar
  (primeira pessoa, com HUD do cômodo atual e controles na tela no celular).
- **Corte das paredes**: slider de 0,30 m a 2,80 m para ver o interior.
- **Camadas**: móveis, nomes dos cômodos, portas abertas e planta baixa projetada
  no piso.
- **Garagem**: cor do carro, portão abre/fecha, acabamento e vão das ripas.
- **Iluminação**: cinco horários do dia (manhã, meio-dia, tarde, entardecer e
  noite), cena, intensidade, temperatura de cor e tipos de luz, com estimativa de
  iluminância por cômodo comparada à referência de projeto.
- **Tomadas elétricas**: 36 pontos (39 tomadas) 2P+T no padrão NBR 14136, com 10 A e
  20 A, e quantidade/posição conferidas pelos critérios da NBR 5410 — inclusive as duas
  tomadas acima da bancada da pia, os volumes dos banheiros e os 4 TUEs de 20 A (3 splits
  de ar-condicionado nos quartos + micro-ondas/forno). Ver o
  [relatório de verificação](RELATORIO-TOMADAS-NBR5410.md).
- **Cômodos**: lista com as áreas de cada ambiente e o total.
- **Desempenho**: perfis de qualidade, resolução automática e diagnóstico (F3).
- **Painel recolhível**: o botão `Minimizar` no cabeçalho (ou a tecla **M**) reduz os
  controles a uma pílula no canto, liberando a cena; o estado fica lembrado entre
  visitas. O cabeçalho é fixo, então o botão continua à mão com o painel rolado.
- Tema claro e escuro automáticos, layout responsivo (painel vira folha inferior no
  celular).

## Iluminação e desempenho

A cena tem 44 luminárias, mas **18 delas entram no shader por vez**: 14 spots + 4 pontos
(`SPOT_SLOTS` / `POINT_SLOTS` em `casa-3d.html`). A razão é medida: no three.js, mudar a
*quantidade* de luzes visíveis recompila o shader de todos os materiais, e numa GPU
integrada (testado num Vega 8) isso custa segundos por luz — 43 luzes levavam **mais de 3
minutos** de aba travada. Antes, o modo caminhar ligava e desligava luzes por proximidade a
cada passo, disparando essa recompilação sem parar; era esse o travamento.

O que ocupa as vagas:

- **modo caminhar**: as 14 luzes mais próximas de quem anda, então todas as luminárias do
  ambiente em que você está acendem — inclusive os spots de leitura dos quartos e as
  arandelas da fachada quando você está na frente da casa;
- **visão geral (3D/Planta)**: a maior luminária de cada ambiente, cobrindo a casa;
- as 4 luzes de ponto são fixas (arandelas da suíte e balizadores da garagem).

Regras que mantêm o navegador livre (não desfaça sem medir):

- a **quantidade** de luzes visíveis é constante; andar, acender, apagar, trocar de cena ou
  de modo só troca *quem* ocupa as vagas e mexe em intensidade — nada recompila;
- as luminárias não projetam sombra na GPU (só o sol projeta);
- as duas luzes retangulares dos espelhos ficam fora do shader (só elas custavam ~25 s de
  compilação); os plafons dos banheiros cuidam da luz local;
- o custo foi movido para o carregamento: "compilando a iluminação…" na primeira abertura
  (~47 s num Vega 8) e ~9 s depois, com o cache do driver.

Ferramentas de verificação em `.qa/`: `node .qa/server.mjs` sobe o app em
`http://localhost:8137` e `node .qa/probe.mjs` abre o Edge via CDP, troca horário, entra no
modo caminhar e mede recompilações, travamentos (long tasks) e intervalos de quadro.
`SHOTS=1 node .qa/probe.mjs` salva capturas em `.qa/shots/`. Para o painel recolhível,
`node .qa/panel-check.mjs` mede o botão e o estado minimizado em 360×640 e 1280×800,
confere persistência, atalho M e sobreposição com o D-pad, e grava as capturas em
`.qa/shots/panel/`. Para a elétrica, `node .qa/outlets-audit.mjs` confere quantidade,
posição, vãos, móveis, volumes de banheiro, TUE, DR, potência e a geometria dos furos
(NBR 5410/NBR 14136), saindo com código 1 se algo não estiver conforme.

## Elétrica (NBR 5410 e NBR 14136)

A maquete representa **36 pontos de tomada 2P+T (39 tomadas)** no padrão NBR 14136, de
10 A e 20 A, com quantidade e posição conferidas pelos critérios da NBR 5410: mínimos por
ambiente, duas tomadas acima da bancada da pia, volumes 0 a 3 dos banheiros, DR de 30 mA,
**4 TUEs de 20 A (3 splits de ar-condicionado + micro-ondas/forno)** e potência atribuível aos
pontos. Interruptores, circuitos, quadro de
distribuição, condutores, aterramento e tomadas de piso **não** são modelados — a maquete
não substitui projeto elétrico nem comprova a conformidade de uma instalação real. A
verificação cláusula a cláusula, com o que foi corrigido, está em
[RELATORIO-TOMADAS-NBR5410.md](RELATORIO-TOMADAS-NBR5410.md).

## Estrutura

```
casa-3d.html         # aplicação completa (HTML + CSS + JS, arquivo único)
RELATORIO-TOMADAS-NBR5410.md  # verificação das tomadas contra NBR 5410/NBR 14136
deploy/j4-core/      # publicação no servidor J4 Core (Termux + Cloudflare Tunnel)
.qa/                 # servidor estático + testes automatizados (CDP e elétrica)
```

## Tecnologia

- HTML, CSS e JavaScript puros, sem etapa de build.
- [Three.js](https://threejs.org/) 0.160 (módulo ES via importmap).
- Geometria procedural com `BufferGeometry`, `mergeVertices` e `mergeGeometries`;
  materiais PBR, sombras PCF e tone mapping ACES Filmic.
- Planta baixa embutida como imagem base64.
- Modelo do SW4 embutido como glTF binário em base64, carregado com `GLTFLoader`.
