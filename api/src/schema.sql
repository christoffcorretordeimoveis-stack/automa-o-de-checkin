-- Reservas vindas dos canais (Booking.com, Airbnb, Expedia, Decolar, Direto).
CREATE TABLE IF NOT EXISTS reservas (
  id               SERIAL PRIMARY KEY,
  codigo           TEXT NOT NULL UNIQUE,
  canal            TEXT NOT NULL,
  hospede_nome     TEXT NOT NULL,
  hospede_email    TEXT,
  hospede_telefone TEXT,
  documento        TEXT,
  checkin          DATE NOT NULL,
  checkout         DATE NOT NULL,
  quarto           TEXT,
  hospedes         INTEGER NOT NULL DEFAULT 1,
  observacoes      TEXT,
  status           TEXT NOT NULL DEFAULT 'aguardando_checkin',
  criado_em        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sequência usada para numerar o código das reservas criadas no app.
CREATE SEQUENCE IF NOT EXISTS reserva_codigo_seq START WITH 20000;

-- Formulário de check-in gerado a partir de uma reserva.
CREATE TABLE IF NOT EXISTS checkins (
  id                    SERIAL PRIMARY KEY,
  reserva_id            INTEGER NOT NULL UNIQUE REFERENCES reservas(id) ON DELETE CASCADE,
  status                TEXT NOT NULL DEFAULT 'rascunho',
  nome_completo         TEXT,
  documento             TEXT,
  telefone              TEXT,
  email                 TEXT,
  placa_veiculo         TEXT,
  acompanhantes         INTEGER NOT NULL DEFAULT 0,
  horario_chegada       TEXT,
  observacoes           TEXT,
  enviado_green_em      TIMESTAMPTZ,
  enviado_governanca_em TIMESTAMPTZ,
  criado_em             TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em         TIMESTAMPTZ NOT NULL DEFAULT now()
);
