---
name: casa-3d-a-partir-da-planta
description: Gera uma maquete 3D interativa e realista de uma residência (Three.js 0.160.0, um único arquivo HTML) a partir de uma planta baixa em PDF ou imagem. Reproduz o projeto completo já validado: paredes e esquadrias a partir da planta, móveis procedurais, projeto luminotécnico com horários e cenas, portas de marcenaria, veículo, muros e portão de correr, terreno e paisagismo, rua e vizinhança, cobertura embutida com platibanda, tomadas conforme ABNT NBR 5410 e NBR 14136, e otimização de desempenho. Use quando alguém anexar uma planta baixa e pedir "maquete 3D", "casa 3D interativa", "modelo 3D da planta" ou "replicar o projeto da casa 3D".
---

# Casa 3D a partir da planta baixa

Esta skill transforma **uma planta baixa** em uma **maquete 3D interativa** com o mesmo conjunto de recursos de um projeto já entregue e validado. O resultado é **um único arquivo HTML** (Three.js 0.160.0 por CDN), que roda no navegador e pode ser publicado como artefato.

O projeto original tem uma implementação de referência completa em
`assets/reference-implementation.html` (≈ 3 300 linhas). Ela **não é um modelo genérico**: os dados da planta original estão nela. O trabalho desta skill é **trocar os dados** e **adaptar cada módulo** à nova planta, preservando a arquitetura, as regras e as soluções que já foram testadas.

## Como usar

1. A pessoa anexa a planta baixa (PDF vetorial é o melhor; imagem também serve) e, se tiver, uma **segunda versão com cotas**.
2. Rode a skill. Siga as fases abaixo, **na ordem**, e confirme o resultado de cada fase antes de seguir.
3. Entregue o HTML final, um resumo das hipóteses adotadas e a lista do que foi conferido e do que não foi.

## Regras permanentes (valem para todas as fases)

1. **A planta é a fonte absoluta de verdade.** Dimensões, posição de paredes, portas, janelas e cômodos nunca são "melhorados" por conta própria. Se algo na planta for ambíguo, pergunte ou declare a hipótese.
2. **Three.js fixo em 0.160.0** (importmap com jsDelivr). Não atualizar a versão.
3. **Arquivo único.** Tudo no HTML: CSS, JS, texturas procedurais e dados. O que for binário (planta como PNG, modelo de carro em GLB) entra como base64 por substituição de marcadores no build.
4. **Nada que não está na planta é apresentado como real.** Rua, vizinhos, cobertura, tomadas, paisagismo e móveis sem símbolo na planta são **hipóteses de ambientação**. Declare isso no código (comentários de cabeçalho de cada módulo) e no resumo.
5. **Não substitui projeto técnico.** Estrutura, cobertura, impermeabilização e elétrica são representações visuais. Peça validação a profissional habilitado.
6. **Desempenho é requisito**, não etapa final opcional: geometrias e materiais compartilhados, `InstancedMesh`, mescla de estáticos, poucas luzes, sombras sob demanda (ver `references/12-desempenho.md`).
7. **Cada fase termina com verificação visual** em várias vistas (3D, planta, caminhar) e leitura do console. Não declare "pronto" sem ter aberto o resultado.
8. **Escreva scripts de patch em arquivo** (não em heredoc longo de shell) e mantenha `casa_template.html` como fonte de verdade, gerando o HTML final por build (`scripts/build.py`). Nunca edite o HTML final à mão.

## Fases

| # | Fase | Guia | Resultado |
|---|------|------|-----------|
| 0 | Entrada e hipóteses | este arquivo | Escala, pé-direito, terreno, norte, estilo, o que é opcional |
| 1 | Leitura da planta | `references/01-leitura-da-planta.md` | `WALLS`, `WINDOWS`, `DOORS`, `ROOMS` em metros, validados sobre a planta |
| 2 | Base do aplicativo | `references/02-arquitetura-do-codigo.md` | Cena, câmeras, modos (3D, Planta, Caminhar), corte de paredes, painel |
| 3 | Móveis | `references/03-moveis.md` | Móveis realistas nas posições da planta |
| 4 | Iluminação | `references/04-iluminacao.md` | Horários, cenas, luminárias, balanço de branco |
| 5 | Portas | `references/05-portas.md` | Portas de marcenaria animadas, com colisão |
| 6 | Veículo (opcional) | `references/06-veiculo.md` | Carro na garagem, com troca de cor |
| 7 | Muros, fachada e portão | `references/07-muros-fachada-portao.md` | Implantação no terreno, portão de correr |
| 8 | Terreno e paisagismo | `references/08-paisagismo.md` | Jardim e vasos, sem inventar o que a planta nega |
| 9 | Rua e vizinhança | `references/09-rua-e-vizinhanca.md` | Contexto urbano, desligável (padrão: vizinhança desligada) |
| 10 | Cobertura | `references/10-cobertura.md` | Laje, telhado embutido atrás de platibanda, drenagem |
| 11 | Tomadas elétricas | `references/11-tomadas-nbr5410.md` | Pontos conforme NBR 5410 e NBR 14136 |
| 12 | Desempenho | `references/12-desempenho.md` | Mescla, sob demanda, perfis de qualidade |
| 13 | Verificação e entrega | `references/13-verificacao-e-armadilhas.md` | Checklist, erros conhecidos, publicação |

A ordem importa: os módulos usam ajudantes definidos antes (`boxGeo`, `wUV`, `addMesh`, `place`, `texCanvas`...). A implementação de referência já está na ordem certa; **mantenha a ordem das seções**.

### Fase 0: entrada e hipóteses

Antes de modelar, anote (e confirme com a pessoa quando fizer diferença):

- **Escala e unidade da planta** (ex.: 1:75, medidas em metros). Se houver planta cotada, use-a para calibrar.
- **Pé-direito**: o projeto original usou 2,80 m (constante `H`). Se a planta não disser, adote 2,80 m e declare.
- **Terreno**: dimensões e recuos. Original: 10 × 20 m, casa centralizada na largura. Se não houver, **pergunte**; se a pessoa não souber, adote um terreno com recuos plausíveis e declare.
- **Norte**: se a planta não indicar, adote o topo da folha como norte e declare (o sol e o balanço de luz dependem disso).
- **Garagem / veículo**: há vaga? Quer carro? (opcional, ver fase 6).
- **Estilo da fachada**: cores e materiais (o original: reboco claro, pedra ferro em filetes, ripado de madeira, portão de metalon preto).
- **O que é opcional**: veículo, paisagismo, vizinhança (padrão desligada), tomadas.

Escreva as hipóteses num bloco de comentário no topo do HTML.

### Fase 1: leitura da planta

Siga `references/01-leitura-da-planta.md`. Resumo: extrair os traços do PDF (`scripts/extract_plan_vectors.py`), separar **linhas de parede** de **linhas de cota** comparando as duas versões da planta, converter para metros e montar `WALLS`, `WINDOWS`, `DOORS`, `ROOMS`. **Sobreponha a planta no piso** (`PLAN_IMG`) e confira cada parede antes de seguir.

### Fases 2 a 12

Cada guia em `references/` traz: **objetivo**, **o que foi feito no projeto original**, **como adaptar a uma planta nova**, **parâmetros** e **verificação**. Os nomes de função citados existem na implementação de referência; abra o trecho correspondente antes de reescrever.

Ao terminar cada fase, **gere o build e abra no navegador**:

```
python scripts/build.py --template casa_template.html --plan plan.b64 --out casa_out.html
```

### Fase 13: entrega

Use `references/13-verificacao-e-armadilhas.md`. Entregue: o HTML (ou o link do artefato), as hipóteses, o que foi verificado e o que não foi.

## Instalação

Copie a pasta `casa-3d-a-partir-da-planta` para a pasta de skills do Claude Code: `~/.claude/skills/` (pessoal) ou `.claude/skills/` dentro do projeto. Depois, numa conversa, anexe a planta e peça: "use a skill casa-3d-a-partir-da-planta com esta planta". Para os scripts: `pip install pymupdf`.

## Arquivos desta skill

- `SKILL.md`: este roteiro.
- `references/01` a `references/13`: guia de cada fase.
- `assets/reference-implementation.html`: implementação de referência completa (marcadores `__PLAN_B64__` e `__SW4_B64__` ficam vazios até o build).
- `assets/alternativas/telhado-ceramico.js`: alternativa de cobertura com telha cerâmica aparente.
- `scripts/extract_plan_vectors.py`: extrai traços e textos do PDF da planta.
- `scripts/pdf_to_png.py`: converte a planta em PNG reduzido para a sobreposição.
- `scripts/build.py`: substitui os marcadores base64 e gera o HTML final.

## O que NÃO fazer

- Não copiar os dados da casa original (paredes, móveis, tomadas, medidas do terreno) para uma planta nova.
- Não deixar posições de móvel, luminária ou tomada "chutadas": derive da planta e valide visualmente.
- Não ligar vizinhança, rua e carro por padrão se atrapalharem a leitura da casa. No original: rua ligada, vizinhança **desligada** por padrão.
- Não usar `fetch` para carregar arquivos (bloqueado no visualizador de artefatos). Use base64 inline.
- Não publicar sem abrir e testar.
