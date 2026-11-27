#!/usr/bin/env python3
"""Extrai os traços vetoriais e os textos de uma planta baixa em PDF.

Uso:
  python extract_plan_vectors.py planta.pdf --scale 75 --out plano.json [--page 0]

Saída (JSON):
  - page: tamanho da página em pontos e em metros (já com a escala)
  - stroke_widths: espessuras de traço encontradas, com a contagem e o comprimento total de cada uma
  - segments: segmentos de reta {x1, y1, x2, y2, w, len} em METROS, Y para baixo
  - texts: textos com posição em metros (cotas, nomes de cômodos, áreas)

Como usar o resultado:
  1. A espessura de traço das paredes costuma ser a mais frequente entre os traços longos e grossos
     (no projeto original, 1,29 pt). Cotas e linhas de chamada são mais finas.
  2. Rode também na planta SEM cotas e compare: o que existe nas duas é parede.
  3. Use --walls-width W para gravar em "walls" só os segmentos dessa espessura (tolerância 0,05 pt).

Requer PyMuPDF (pip install pymupdf). Plantas em imagem não têm vetores: meça em pixels e declare a incerteza.
"""
import argparse, json, math, sys
from collections import defaultdict

try:
    import pymupdf as fitz  # PyMuPDF (nome novo); cai para "fitz" nas versões antigas
except ImportError:
    try:
        import fitz
    except ImportError:
        sys.exit('Instale o PyMuPDF: pip install pymupdf')

PT_TO_M = 0.0254 / 72.0   # 1 pt = 1/72 pol = 0,0254/72 m no papel; multiplicado pela escala dá o metro real


def segments_from_drawings(page, k):
    segs = []
    for d in page.get_drawings():
        w = d.get('width') or 0.0
        for it in d['items']:
            if it[0] == 'l':                       # linha
                a, b = it[1], it[2]
                segs.append((a.x, a.y, b.x, b.y, w))
            elif it[0] == 're':                    # retângulo vira 4 linhas
                r = it[1]
                for (x1, y1, x2, y2) in ((r.x0, r.y0, r.x1, r.y0), (r.x1, r.y0, r.x1, r.y1), (r.x1, r.y1, r.x0, r.y1), (r.x0, r.y1, r.x0, r.y0)):
                    segs.append((x1, y1, x2, y2, w))
            elif it[0] == 'qu':                    # quadrilátero
                q = it[1]
                pts = [q.ul, q.ur, q.lr, q.ll]
                for i in range(4):
                    a, b = pts[i], pts[(i + 1) % 4]
                    segs.append((a.x, a.y, b.x, b.y, w))
    return [(x1 * k, y1 * k, x2 * k, y2 * k, w) for (x1, y1, x2, y2, w) in segs]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('pdf')
    ap.add_argument('--scale', type=float, required=True, help='denominador da escala (1:75 -> 75)')
    ap.add_argument('--page', type=int, default=0)
    ap.add_argument('--out', default='plano.json')
    ap.add_argument('--walls-width', type=float, default=None, help='espessura do traço de parede, em pt')
    ap.add_argument('--min-len', type=float, default=0.05, help='descarta segmentos menores que isto, em metros')
    a = ap.parse_args()

    doc = fitz.open(a.pdf)
    page = doc[a.page]
    k = PT_TO_M * a.scale
    segs = segments_from_drawings(page, k)

    stats = defaultdict(lambda: [0, 0.0])
    out = []
    for x1, y1, x2, y2, w in segs:
        L = math.hypot(x2 - x1, y2 - y1)
        if L < a.min_len:
            continue
        key = round(w, 2)
        stats[key][0] += 1
        stats[key][1] += L
        out.append({'x1': round(x1, 4), 'y1': round(y1, 4), 'x2': round(x2, 4), 'y2': round(y2, 4), 'w': round(w, 3), 'len': round(L, 4)})

    texts = []
    for (x0, y0, x1, y1, txt, *_rest) in page.get_text('words'):
        texts.append({'t': txt, 'x': round(x0 * k, 3), 'y': round(y0 * k, 3)})

    res = {
        'page': {'w_pt': page.rect.width, 'h_pt': page.rect.height, 'w_m': round(page.rect.width * k, 3), 'h_m': round(page.rect.height * k, 3), 'scale': a.scale},
        'stroke_widths': [{'w_pt': w, 'count': c, 'total_len_m': round(L, 2)} for w, (c, L) in sorted(stats.items(), key=lambda kv: -kv[1][1])],
        'segments': out,
        'texts': texts,
    }
    if a.walls_width is not None:
        res['walls'] = [s for s in out if abs(s['w'] - a.walls_width) <= 0.05]
    json.dump(res, open(a.out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f"{len(out)} segmentos, {len(texts)} textos -> {a.out}")
    print('Espessuras (pt) por comprimento total:')
    for e in res['stroke_widths'][:8]:
        print(f"  {e['w_pt']:>5}  {e['count']:>5} segmentos  {e['total_len_m']:>8} m")


if __name__ == '__main__':
    main()
