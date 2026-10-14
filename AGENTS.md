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
- **Sem credenciais externas.** A chegada de reservas pelos canais é registrada pelo formulário do painel; não existe integração real com OTA nem chaves de API.
- **Exclusão em cascata.** Apagar uma reserva remove o check-in vinculado (`ON DELETE CASCADE`), e o botão *Cancelar* do painel usa `window.confirm`, que bloqueia a aba enquanto o diálogo nativo estiver aberto (não dá para automatizar o clique).

## Verificação

```bash
curl -s http://localhost:3000/api/health    # {"status":"ok","banco":"ok"}
curl -s http://localhost:3000/api/resumo    # contadores do painel
```

Fluxo principal: painel → **Gerar check-in** → preencher o formulário → **Salvar formulário** → **Enviar para o Green** e **Enviar para a governança**. A reserva vai de `aguardando_checkin` → `checkin_gerado` → `concluido`; o check-in, de `rascunho` → `preenchido` → `enviado`.

## Resetar o banco

```bash
docker compose -f docker-compose.base44.yml down -v   # apaga o volume db_data
docker compose -f docker-compose.base44.yml up -d
```
