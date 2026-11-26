# Casa 3D

Maquete 3D navegável de uma casa térrea, construída a partir da planta baixa
(escala 1:75, **7,37 × 18,45 m**). Todo o modelo é gerado por código no
navegador — não há arquivos de malha externos.

## Como abrir

Abra o arquivo `casa-3d.html` diretamente no navegador (dois cliques) ou sirva a
pasta com qualquer servidor estático:

```bash
python -m http.server 8000
# depois acesse http://localhost:8000/casa-3d.html
```

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
- **Cômodos**: lista com as áreas de cada ambiente e o total.
- **Desempenho**: perfis de qualidade, resolução automática e diagnóstico (F3).
- Tema claro e escuro automáticos, layout responsivo (painel vira folha inferior
  no celular).

## Estrutura

```
casa-3d.html         # aplicação completa (HTML + CSS + JS, arquivo único)
deploy/j4-core/      # publicação no servidor J4 Core (Termux + Cloudflare Tunnel)
```

## Tecnologia

- HTML, CSS e JavaScript puros, sem etapa de build.
- [Three.js](https://threejs.org/) 0.160 (módulo ES via importmap).
- Geometria procedural com `BufferGeometry`, `mergeVertices` e `mergeGeometries`;
  materiais PBR, sombras PCF e tone mapping ACES Filmic.
- Planta baixa embutida como imagem base64.
