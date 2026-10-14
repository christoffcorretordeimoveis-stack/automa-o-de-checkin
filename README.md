# automa-o-de-checkin
autotomação de checkin com integração vinda direto dos canais de reserva para o stays, gerando um formes para que depois seja repassado para o grenn e para equipe de governança

## Stack

| Serviço | Tecnologia | Porta |
| --- | --- | --- |
| `web` | React + Vite | 3000 |
| `api` | Node + Express | 8000 |
| `db` | Postgres 16 | interna |

## Como rodar

```bash
docker compose -f docker-compose.base44.yml up -d --build
```

Depois abra <http://localhost:3000>.

Fluxo do app: as reservas chegam pelos canais (Booking.com, Airbnb, Expedia, Decolar ou direto) → gerar o formulário de check-in da reserva → preencher os dados do hóspede → repassar para o **Green** e para a **equipe de governança**.

As reservas são importadas direto do **Stays** pelo botão *Sincronizar com o Stays* — veja [`AGENTS.md`](./AGENTS.md) para configurar as credenciais (`STAYS_CLIENT_ID` e `STAYS_CLIENT_SECRET`). O formulário do painel continua disponível para registrar uma reserva manualmente.
