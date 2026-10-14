# AGENTS.md

Notas não óbvias do ambiente de desenvolvimento deste repositório.

## Subir o app

```bash
docker compose -f docker-compose.base44.yml up -d --build
```

Entrada pública: <http://localhost:3000> (Vite dev server). A API também fica exposta em `localhost:8000`.

## Serviços

| Serviço | O que é | Reload |
| --- | --- | --- |
| `db` | Postgres 16 | — |
| `migrate` | one-shot: cria o schema e insere as reservas de exemplo | roda a cada `up`; é idempotente |
| `api` | Express na 8000 | `node --watch` |
| `web` | Vite na 3000 | HMR do Vite |

## Detalhes que não são óbvios

- **Sem Dockerfile de app.** Os serviços usam `image: node:22` com o código montado por bind mount, e as dependências são instaladas **na inicialização do container** (`npm ci`) em volumes nomeados (`api_node_modules`, `web_node_modules`). Isso significa que o `package-lock.json` precisa estar em dia: ao mudar um `package.json`, rode `npm install --package-lock-only` na pasta correspondente antes de recriar o container.
- **Origem única.** O navegador só fala com a porta 3000 — o Vite faz proxy de `/api` para `http://api:8000` (configurável por `API_PROXY_TARGET`). O backend não tem CORS.
- **HMR atrás do proxy.** Com `BASE44_PREVIEW_MODE=1`, o `vite.config.js` usa `hmr.clientPort = 443`, porque o preview é servido por HTTPS na porta 443 de um host público. Sem a variável (ou com qualquer outro valor) o comportamento padrão é preservado.
- **Hosts externos do dev server.** O compose repassa `__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS` para o serviço `web`; o valor é definido pelo sandbox.
- **Migração/seed idempotente.** As reservas de exemplo entram por `ON CONFLICT (codigo) DO NOTHING`, com datas calculadas a partir do dia em que a migração roda.
- **Exclusão em cascata.** Apagar uma reserva remove o check-in vinculado (`ON DELETE CASCADE`), e o botão *Cancelar* do painel usa `window.confirm`, que bloqueia a aba enquanto o diálogo nativo estiver aberto (não dá para automatizar o clique).

## Integração com o Stays

Importa as reservas direto do PMS, para não digitar as informações à mão. Documentação da API: <https://stays.net/external-api/>.

- **Endpoint usado:** `POST {base}/booking/reservations-export` com corpo `{ "from": "YYYY-MM-DD", "to": "YYYY-MM-DD", "dateType": "arrival" }`. É o relatório em JSON — devolve tudo em **uma chamada** (`client.name/email`, `listing.internalName`, datas, `guestTotalCount`); a alternativa (`GET /booking/reservations`) só traz `_idclient` e exigiria uma chamada extra por reserva.
- **Autenticação:** header `Authorization: Basic base64(client_id:client_secret)`.
- **Variáveis de ambiente:** `STAYS_CLIENT_ID` e `STAYS_CLIENT_SECRET` (obrigatórias para a integração funcionar; fornecidas pelo suporte do Stays) e `STAYS_API_BASE_URL` (opcional, padrão `https://play.stays.net/external/v1` — a doc pede para trocar pelo domínio real do sistema). Chegam pelo `env_file: /run/base44/app.env` do serviço `api`, nunca por `environment:` no compose.
- **Sem credenciais o app funciona normalmente:** `GET /api/stays/status` devolve `{ "configurado": false }` e `POST /api/stays/sincronizar` responde **503** com uma mensagem explicando o que falta; o botão do painel fica desabilitado.
- **Janela padrão:** chegadas de hoje até +30 dias (`dateType=arrival`). O corpo da requisição aceita `from`/`to` para outra janela.
- **Upsert por `codigo`** (= `id` da reserva no Stays), então sincronizar duas vezes não duplica: a primeira rodada cria, as seguintes atualizam. A sincronização **não** mexe em `status` nem no formulário de check-in — isso continua sendo do app.
- **Campos que o Stays não devolve nesse relatório:** telefone e documento do hóspede. Continuam sendo preenchidos no formulário de check-in.

### Verificar a integração sem as credenciais reais

Sobe um stub local que responde o formato documentado e roda a sincronização contra ele (o stub exige o header Basic, então valida também a montagem da autenticação):

```bash
# 1) stub numa porta qualquer, na mesma rede do compose
mkdir -p /tmp/stub   # stub.js e test.mjs descritos abaixo
docker run -d --rm --name stays-stub --network checkin-app_default \
  -v /tmp/stub:/script -w /script node:22 node stub.js

# 2) sincronização de verdade, apontando para o stub
docker run --rm --network checkin-app_default \
  -v "$PWD/api":/app -v checkin-app_api_node_modules:/app/node_modules -v /tmp/stub:/script -w /script \
  -e DATABASE_URL=postgres://checkin:checkin@db:5432/checkin \
  -e STAYS_API_BASE_URL=http://stays-stub:9999 \
  -e STAYS_CLIENT_ID=dev-client -e STAYS_CLIENT_SECRET=dev-secret \
  node:22 node /script/test.mjs
```

`test.mjs` chama `sincronizarReservasStays()` duas vezes e imprime o resumo + as linhas gravadas; a segunda chamada deve dar `atualizadas` (e não `criadas`). **Apague as reservas criadas pelo teste** (`DELETE /api/reservas/:id`) e remova o container do stub no fim.

## Verificação

```bash
curl -s http://localhost:3000/api/health         # {"status":"ok","banco":"ok"}
curl -s http://localhost:3000/api/resumo         # contadores do painel
curl -s http://localhost:3000/api/stays/status   # {"configurado":…}
```

Fluxo principal: painel → **Sincronizar com o Stays** (ou registrar uma reserva à mão) → **Gerar check-in** → preencher o formulário → **Salvar formulário** → **Enviar para o Green** e **Enviar para a governança**. A reserva vai de `aguardando_checkin` → `checkin_gerado` → `concluido`; o check-in, de `rascunho` → `preenchido` → `enviado`.

## Resetar o banco

```bash
docker compose -f docker-compose.base44.yml down -v   # apaga o volume db_data
docker compose -f docker-compose.base44.yml up -d
```
