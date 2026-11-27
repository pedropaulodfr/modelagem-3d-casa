#!/usr/bin/env python3
"""Converte uma página de PDF em PNG com largura limitada (para a planta sobreposta no piso).

Uso:
  python pdf_to_png.py planta.pdf --width 1400 --out plan.png [--page 0]
Depois:
  base64 -w0 plan.png > plan.b64     (no Windows/Git Bash também funciona)

Mantenha o PNG pequeno (dezenas de KB): ele vai embutido em base64 no HTML.
Requer PyMuPDF (pip install pymupdf).
"""
import argparse, sys

try:
    import pymupdf as fitz
except ImportError:
    try:
        import fitz
    except ImportError:
        sys.exit('Instale o PyMuPDF: pip install pymupdf')

ap = argparse.ArgumentParser()
ap.add_argument('pdf')
ap.add_argument('--width', type=int, default=1400)
ap.add_argument('--page', type=int, default=0)
ap.add_argument('--out', default='plan.png')
a = ap.parse_args()

page = fitz.open(a.pdf)[a.page]
zoom = a.width / page.rect.width
pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom), alpha=False)
pix.save(a.out)
print(f'{a.out}: {pix.width}x{pix.height} px (zoom {zoom:.2f})')
