# Fase 10: cobertura (laje, telhado embutido e platibanda)

**Objetivo:** cobertura coerente com a arquitetura, **sem alterar paredes**, com laje, telhado, platibanda, drenagem e acabamentos.

> A planta normalmente **não traz cobertura**. O que se modela é uma **solução conceitual**: declare as hipóteses e peça validação a profissional habilitado.

## Passo 0: diagnosticar e escolher o sistema

Antes de modelar, responda: o que a planta e a fachada sugerem (platibanda, beiral, telhado aparente)? Quais ambientes são cobertos? Qual a volumetria (L, retângulo)? Não escolha por aparência: considere coerência, função e viabilidade. Opções: laje plana impermeabilizada, telhado embutido atrás de platibanda, telhado aparente, combinação.

**No projeto original** a evolução foi: (1) laje plana com platibanda e manta; (2) telhado cerâmico aparente em quatro águas (a pessoa achou que "faltavam telhas"); (3) **solução final: telhado embutido atrás de platibanda**, que é a que a pessoa pediu para a fachada moderna, reta e minimalista. Se a sua pessoa pedir telhas aparentes, use `assets/alternativas/telhado-ceramico.js`.

## Solução final (telhado embutido)

Seção `COBERTURA` da implementação de referência. Grupo `roofGroup`.

- **Laje maciça de 12 cm** (`H` a `RT = H + 0,12`), **rente às faces externas** das paredes (fachada contínua).
- **Telhado de baixa inclinação (10%)**, telha **metálica termoacústica trapezoidal**, **dentro do contorno das paredes**, em quatro águas com a **mesma inclinação em todas as alas**. Telha cerâmica exige ≥ 30%, o que não esconderia atrás de uma platibanda elegante; por isso a escolha da telha metálica. A superfície é uma **malha alinhada às cumeeiras e espigões** (função de altura `max` entre as alas), com a nervura (textura) **girada em cada água** (`facet`/`uvOf`).
- **Cumeeira e espigões** com capas metálicas, desenhadas só onde aparecem na superfície; **rufo do rincão** entre as alas.
- **Platibanda de 60 cm** (`PB`) sobre as paredes externas, **esconde o telhado** em todas as vistas externas (conferir pela linha de visão: o ponto mais alto do telhado fica ~0,3 m abaixo do topo da platibanda). **Capa (pingadeira) de concreto** 3 cm além das faces. Reboco com a cor da fachada.
- **Drenagem:** calha perimetral embutida de chapa junto à platibanda; rufo de encosto na face interna (a 0,36 m); **4 vazadores** atravessando a platibanda nas laterais (dois em cada), cabeça do condutor (funil) e **condutores de PVC Ø 80 mm** descendo pela parede, **sem cruzar janelas** (escolha pontos de parede cheia), com abraçadeiras e saída horizontal na base.
- **Visibilidade** (`roofVis`): a cobertura some quando o corte das paredes baixa, na vista Planta, quando a camada "Cobertura" é desligada e ao clicar num cômodo da lista (`roofOff`), para o interior aparecer. Os rótulos dos cômodos ficam escondidos com a cobertura visível (`syncLabels`).
- **Sombras:** a platibanda e a telha projetam sombra; existe uma laje invisível só de sombra (colorWrite desligado), que mantém o sol fora da casa mesmo quando a cobertura some.

## Como adaptar

1. **Contorno:** o contorno externo das paredes da sua planta é o contorno da laje e da platibanda. Para L, T ou U, divida em retângulos e faça a união (como as duas alas do original).
2. **Duas alas ou mais:** a função de altura `roofH` usa `max` dos retângulos, o que gera cumeeira, espigões e rincões. Recalcule os breakpoints (`brk`) com as cotas de cumeeira e fins de espigão do **seu** desenho.
3. **Aberturas dos vazadores:** escolha pontos de parede cheia, longe de janelas e portas.
4. **Altura da platibanda:** `PB` deve esconder o ponto mais alto do telhado. Calcule: `rise = inclinação × meia-largura da ala mais larga`; `PB ≥ rise + 0,25`.
5. **Platibanda "pesada":** evite mais de 0,70 m.

## Verificação (obrigatória, nas quatro vistas)

- **Frontal:** linha superior reta e contínua; **nenhuma telha, cumeeira ou estrutura** acima da platibanda.
- **Isométrica:** platibanda escondendo a cobertura; sem telhas atravessando.
- **Superior (de perto):** cobertura com geometria coerente, calhas e vazadores no lugar, sem peças soltas.
- **Interna:** sem buracos no teto; o forro continua intacto.

## Armadilhas

- A mescla de malhas recoloca peças na raiz: **`roofGroup` precisa estar na lista de raízes** e a visibilidade tem que ser na raiz.
- `setCut` chama `roofVis` por gancho tardio (`let roofVis = null`); sem isso há erro de inicialização.
- Cobertura ligada por padrão esconde o interior na vista 3D inicial: avise a pessoa do botão "Cobertura".
