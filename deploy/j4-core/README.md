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

## Deploy automático — o caminho normal

**Basta `git push` na branch `main`.** Em até 5 minutos o site está atualizado,
sem ninguém tocar no aparelho: sem ADB, sem SSH, sem terminal no celular.

Como funciona: o celular roda o `~/watchdog.sh`, que a cada 10 voltas (o loop é de
30 s) executa o `~/deploy/pull.sh`. Esse script lê o `~/deploy/repos.conf`, faz
`git fetch --depth 1` + `git reset --hard origin/main` e publica o arquivo
indicado como `~/site/public/spaceapps/casa-3d/index.html`.

Configuração aplicada em 26/11/2026:

```
# ~/deploy/repos.conf
spaceapps/casa-3d|https://github.com/pedropaulodfr/modelagem-3d-casa.git|main||casa-3d.html
```

- `spaceapps/casa-3d` é o **destino**: o `pull.sh` publica em
  `~/site/public/<nome>/`, e é isso que faz a página responder em
  `spaceapps.online/casa-3d/` (e não em `dash.spaceapps.online/casa-3d/`);
- o 5º campo (`casa-3d.html`) é o **arquivo único** que vira `index.html`;
- o commit publicado fica em `~/deploy/state/spaceapps_casa-3d.sha`; se o commit
  não mudou, o `pull.sh` não reescreve os 6 MB (economiza o cartão e o log);
- log de cada execução: `~/deploy/deploy.log`.

### Conferir que a atualização chegou

```bash
curl -sI https://spaceapps.online/casa-3d/ | grep -i last-modified
curl -s https://spaceapps.online/casa-3d/ | sha256sum
```

Teste ponta a ponta (feito em 26/11/2026): commit + push na `main`, espera de
até 5 min, `tail ~/deploy/deploy.log` mostrando o commit novo e o
`last-modified` da URL mudando — sem nenhuma ação no aparelho.

Compare com o `sha256sum casa-3d.html` do repositório: deve bater (tirando a
diferença de CRLF/LF, se você commitou do Windows).

### Regras para quem edita o projeto

- O site é **um único arquivo** (`casa-3d.html`, ~6 MB, sem etapa de build).
  Edite HTML, CSS e JS direto nele; não introduza bundler.
- Mantenha `<meta charset="utf-8">` como **primeira linha**. O `server.py`
  responde `Content-Type: text/html` sem charset; sem essa meta o navegador lê
  como Latin-1 e todos os acentos quebram.
- Three.js e as fontes vêm de CDN (jsDelivr e Google Fonts): o celular não baixa
  nada, mas quem visita precisa de internet.
- Arquivo com menos de 100 KB é **recusado** pelo `pull.sh` (proteção contra
  commit truncado); o site continua na versão anterior.

## Publicar na mão (fallback)

### Opção A — direto no Termux

```bash
bash ~/deploy/pull.sh     # aplica o que está na main agora, sem esperar os 5 min
```

### Opção B — celular no cabo USB

Com a depuração USB ligada (`Configurações > Opções do desenvolvedor`):

```powershell
adb push casa-3d.html /sdcard/Download/casa-3d.html
```

Depois, no Termux do celular:

```bash
mkdir -p ~/site/public/spaceapps/casa-3d
cp ~/storage/downloads/casa-3d.html ~/site/public/spaceapps/casa-3d/index.html
```

### Opção C — `publicar-casa-3d.sh`

O script `publicar-casa-3d.sh` baixa o `casa-3d.html` do `raw.githubusercontent.com`
e grava direto. **Só use se o pull automático estiver fora do ar** — ele ignora o
`repos.conf` e não registra estado.

## Se algo der errado

1. `tail -50 ~/deploy/deploy.log` — mostra fetch/reset/publicação de cada volta.
2. `pgrep -f watchdog.sh` — vazio significa que o vigilante morreu:
   `nohup bash ~/watchdog.sh >> ~/watchdog.log 2>&1 &`
3. No próprio celular:
   `curl -s -o /dev/null -w '%{http_code}\n' -H 'Host: spaceapps.online' http://127.0.0.1:8080/casa-3d/`
4. **Se o celular reiniciar, nada sobe sozinho** (não há Termux:Boot instalado).
   É preciso abrir o Termux e rodar:
   `nohup bash ~/watchdog.sh >> ~/watchdog.log 2>&1 &`
   Enquanto isso o site fica fora do ar e o deploy automático não roda.

## Opcional — card no portal

O portal (`~/site/public/index.html`) lista os projetos em cards. Para destacar a
maquete, acrescente um card seguindo o padrão dos existentes, apontando para
`/casa-3d/`. Isso é só apresentação: a página já funciona sem o card.

## Observações técnicas

- A página é estática: o celular só entrega o arquivo (6,2 MB). O WebGL roda no
  navegador de quem visita, não no J4 Core.
- Não há etapa de build nem dependências no servidor.
- O `pull.sh` é genérico: aceita vários projetos, um por linha no `repos.conf`,
  no formato `nome|url|branch|subpasta[|arquivo_unico]`.
