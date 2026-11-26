# Publicar no servidor J4 Core

O servidor "J4 Core" é o **Galaxy J4 Core (SM-J410G)** que roda `server.py` no
Termux, com túnel da Cloudflare, publicado em <https://dash.spaceapps.online/>.

## Como ele serve arquivos

| Item | Caminho no celular |
|---|---|
| Projeto (onde fica o `server.py`) | `~/site` |
| Raiz pública (servida em `dash.spaceapps.online`) | `~/site/public` |
| Portal Space Apps (servido em `spaceapps.online`) | `~/site/public/spaceapps` |

Rotas: requisições para `dash.spaceapps.online` saem de `public/`; para os outros
hosts (incluindo `spaceapps.online`) saem de `public/spaceapps/`, exceto quando o
caminho começa com `/dash`.

Não existe upload, API de deploy nem escrita remota (PUT/POST respondem `501`).
Para publicar, o arquivo precisa chegar ao sistema de arquivos do celular. Há um
`git pull` automático a cada 5 minutos no projeto — se a maquete entrar nesse
repositório, ela sobe sozinha.

## O que publicar

O projeto da maquete é **um único arquivo** (`casa-3d.html`, autocontido: a casa
é gerada por código, a planta vai embutida em base64 e o SW4 da garagem vai como
glTF binário em base64). São **~5,9 MB**. Ele deve ficar disponível como
`index.html` dentro de uma pasta do portal:

```
~/site/public/spaceapps/casa-3d/index.html
```

Com isso a página responde em:

- <https://spaceapps.online/casa-3d/>
- <https://dash.spaceapps.online/spaceapps/casa-3d/>

## Opção A — direto no Termux (mais rápido)

No celular, abra o Termux e rode:

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/pedropaulodfr/modelagem-3d-casa/main/deploy/j4-core/publicar-casa-3d.sh)
```

O script baixa o `casa-3d.html` do GitHub, cria
`~/site/public/spaceapps/casa-3d/` e grava o `index.html`. Não precisa reiniciar
nada: o `server.py` lê do disco a cada requisição.

Alternativa manual, em 4 comandos:

```bash
mkdir -p ~/site/public/spaceapps/casa-3d
curl -fsSL https://raw.githubusercontent.com/pedropaulodfr/modelagem-3d-casa/main/casa-3d.html \
  -o ~/site/public/spaceapps/casa-3d/index.html
ls -l ~/site/public/spaceapps/casa-3d/
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8080/spaceapps/casa-3d/
```

## Opção B — pelo PC, com o celular no cabo USB

Com a depuração USB ligada (`Configurações > Opções do desenvolvedor`):

```powershell
adb push casa-3d.html /sdcard/Download/casa-3d.html
```

Depois, no Termux do celular:

```bash
mkdir -p ~/site/public/spaceapps/casa-3d
cp ~/storage/downloads/casa-3d.html ~/site/public/spaceapps/casa-3d/index.html
```

## Opção C — pelo repositório que o celular já puxa

Se o `git pull` automático do `~/site` apontar para um repositório no GitHub,
basta o arquivo entrar nele (ex.: `public/spaceapps/casa-3d/index.html`) e o
`watchdog` publica em até 5 minutos. Nesse caso, informe qual é o repositório.

## Conferir depois de publicar

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://spaceapps.online/casa-3d/
curl -s -o /dev/null -w "index: %{http_code}  %{size_download} bytes\n" https://dash.spaceapps.online/spaceapps/casa-3d/
```

Esperado: `200` e cerca de 5,9 MB. Se vier `403`, a pasta existe mas o
`index.html` não foi para o lugar certo; se vier `404`, o caminho está errado.

## Opcional — card no portal

O portal (`~/site/public/index.html`) lista os projetos em cards. Para destacar a
maquete, acrescente um card seguindo o padrão dos existentes, apontando para
`/spaceapps/casa-3d/`. Isso é só apresentação: a página já funciona sem o card.

## Observações técnicas

- A página é estática: o celular só entrega o arquivo (5,9 MB). O WebGL roda no
  navegador de quem visita, não no J4 Core.
- O Three.js 0.160 vem por CDN (jsDelivr) e as fontes do Google Fonts, então o
  visitante precisa de internet — o celular não precisa baixar nada.
- Não há etapa de build nem dependências no servidor.
