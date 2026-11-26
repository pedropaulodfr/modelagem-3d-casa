#!/data/data/com.termux/files/usr/bin/bash
# Publica a maquete "Casa 3D" no servidor do J4 Core (Termux).
# Uso:   bash publicar-casa-3d.sh
# Requer: curl (já vem no Termux) e o projeto em ~/site.

set -euo pipefail

REPO_RAW="https://raw.githubusercontent.com/pedropaulodfr/modelagem-3d-casa/main/casa-3d.html"
SITE="${SITE:-$HOME/site}"
DESTINO="$SITE/public/spaceapps/casa-3d"

echo "==> Baixando casa-3d.html do GitHub"
TMP="$(mktemp)"
curl -fsSL "$REPO_RAW" -o "$TMP"
TAMANHO=$(wc -c < "$TMP" | tr -d ' ')
echo "    $TAMANHO bytes"

if [ "$TAMANHO" -lt 100000 ]; then
  echo "ERRO: arquivo baixado pequeno demais ($TAMANHO bytes). Abortando." >&2
  rm -f "$TMP"
  exit 1
fi

echo "==> Garantindo a pasta $DESTINO"
mkdir -p "$DESTINO"

echo "==> Instalando como index.html"
cp "$TMP" "$DESTINO/index.html"
rm -f "$TMP"

echo "==> Pronto. Conteudo da pasta:"
ls -la "$DESTINO"

echo
echo "Teste local:"
echo "  curl -s -o /dev/null -w '%{http_code}\\n' http://127.0.0.1:8080/spaceapps/casa-3d/"
echo "Publico:"
echo "  https://spaceapps.online/casa-3d/"
echo "  https://dash.spaceapps.online/spaceapps/casa-3d/"
