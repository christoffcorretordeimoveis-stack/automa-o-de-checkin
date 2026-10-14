import { Router } from 'express';
import { query } from '../db.js';

export const reservasRouter = Router();

const CANAIS = ['Booking.com', 'Airbnb', 'Expedia', 'Decolar', 'Direto'];
const PREFIXO_CANAL = {
  'Booking.com': 'BKG',
  Airbnb: 'ABB',
  Expedia: 'EXP',
  Decolar: 'DEC',
  Direto: 'DIR',
};

const CAMPOS = `
  r.id, r.codigo, r.canal, r.hospede_nome, r.hospede_email, r.hospede_telefone,
  r.documento, to_char(r.checkin, 'YYYY-MM-DD') AS checkin,
  to_char(r.checkout, 'YYYY-MM-DD') AS checkout,
  r.quarto, r.hospedes, r.observacoes, r.status, r.criado_em,
  c.id AS checkin_id, c.status AS checkin_status
`;

// Lista de reservas, da chegada mais próxima para a mais distante.
reservasRouter.get('/', async (_req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT ${CAMPOS}
      FROM reservas r
      LEFT JOIN checkins c ON c.reserva_id = r.id
      ORDER BY r.checkin ASC, r.id ASC
    `);
    res.json({ canais: CANAIS, reservas: rows });
  } catch (erro) {
    next(erro);
  }
});

// Nova reserva — representa a chegada de uma reserva pelo canal.
reservasRouter.post('/', async (req, res, next) => {
  try {
    const dados = req.body ?? {};
    const obrigatorios = ['canal', 'hospede_nome', 'checkin', 'checkout'];
    const faltando = obrigatorios.filter((campo) => !dados[campo]);

    if (faltando.length > 0) {
      return res.status(400).json({ erro: `Campos obrigatórios: ${faltando.join(', ')}.` });
    }
    if (dados.checkout < dados.checkin) {
      return res.status(400).json({ erro: 'O check-out não pode ser antes do check-in.' });
    }

    const { rows: numero } = await query(`SELECT nextval('reserva_codigo_seq') AS valor`);
    const prefixo = PREFIXO_CANAL[dados.canal] ?? 'RES';
    const codigo = `${prefixo}-${numero[0].valor}`;

    const { rows } = await query(
      `INSERT INTO reservas
         (codigo, canal, hospede_nome, hospede_email, hospede_telefone, documento,
          checkin, checkout, quarto, hospedes, observacoes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id, codigo, canal, hospede_nome, status`,
      [
        codigo,
        dados.canal,
        dados.hospede_nome,
        dados.hospede_email || null,
        dados.hospede_telefone || null,
        dados.documento || null,
        dados.checkin,
        dados.checkout,
        dados.quarto || null,
        Number(dados.hospedes ?? 1),
        dados.observacoes || null,
      ],
    );
    res.status(201).json(rows[0]);
  } catch (erro) {
    next(erro);
  }
});

// Cancela a reserva. O formulário de check-in vinculado é removido em cascata.
reservasRouter.delete('/:id', async (req, res, next) => {
  try {
    const { rows } = await query('DELETE FROM reservas WHERE id = $1 RETURNING id, codigo', [
      Number(req.params.id),
    ]);
    if (rows.length === 0) {
      return res.status(404).json({ erro: 'Reserva não encontrada.' });
    }
    res.json(rows[0]);
  } catch (erro) {
    next(erro);
  }
});
