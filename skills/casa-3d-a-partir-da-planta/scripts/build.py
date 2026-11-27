#!/usr/bin/env python3
"""Gera o HTML final a partir do modelo-fonte, trocando os marcadores base64.

Uso:
  python build.py --template casa_template.html --plan plan.b64 --out casa_out.html [--car car.b64] [--preview] [--standalone]

Marcadores:
  __PLAN_B64__  planta de fundo (PNG em base64, sem o prefixo "data:")
  __SW4_B64__   modelo do carro (GLB em base64, sem o prefixo). Sem carro, deixe vazio e remova o módulo de veículo.

--standalone grava o --out como documento completo (doctype, UTF-8, viewport). Use para hospedar
fora de artefato (index.html em servidor); sem isso o navegador lê os acentos errado.
--preview grava também preview.html (com <body> envolvendo o script), para servir em localhost.
Caminhos são resolvidos a partir do diretório atual; use caminhos absolutos se for rodar de outra pasta.
O modelo-fonte NUNCA é alterado.
"""
import argparse, os, sys

ap = argparse.ArgumentParser()
ap.add_argument('--template', required=True)
ap.add_argument('--plan', required=True)
ap.add_argument('--car', default=None)
ap.add_argument('--out', required=True)
ap.add_argument('--preview', action='store_true')
ap.add_argument('--standalone', action='store_true')
a = ap.parse_args()

s = open(a.template, encoding='utf-8').read()
s = s.replace('__PLAN_B64__', open(a.plan).read().strip())
s = s.replace('__SW4_B64__', open(a.car).read().strip() if a.car else '')
if '__PLAN_B64__' in s or '__SW4_B64__' in s:
    sys.exit('Marcador não substituído')
if '__dbg' in s:
    print('AVISO: o HTML ainda contém o gancho de depuração __dbg. Remova antes de publicar.', file=sys.stderr)
HEAD = ('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">')
out = HEAD + s if a.standalone else s
open(a.out, 'w', encoding='utf-8').write(out)
print(f'{a.out}: {os.path.getsize(a.out) / 1e6:.2f} MB')

if a.preview:
    pre = ('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
           '<style>:root{color-scheme:light}body{margin:0;font:14px system-ui}[hidden]{display:none!important}</style></head><body>')
    p = os.path.join(os.path.dirname(os.path.abspath(a.out)), 'preview.html')
    open(p, 'w', encoding='utf-8').write(pre + s + '</body></html>')
    print(p)
