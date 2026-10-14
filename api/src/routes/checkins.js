import { Router } from 'express';
import { query } from '../db.js';

export const checkinsRouter = Router();

// Destino do repasse: Green (sistema) e equipe de governança.
const COLUNA_DESTINO = { green: 'enviado_green_em', governanca: 'enviado_governanca_em' };

const CAMPOS = `
  c.id, c.reserva_id, c.status, c.nome_completo, c.documento, c.telefone, c.email,
  c.placa_veiculo, c.acompanhantes, c.horario_chegada, c.observacoes,
  c.enviado_green_em, c.enviado_governanca_em, c.atualizado_em,
  r.codigo AS reserva_codigo, r.canal, r.quarto,
  to_char(r.checkin, 'YYYY-MM-DD') AS checkin,
  to_char(r.checkout, 'YYYY-MM-DD') AS checkout,
  r.hospedes AS reserva_hospedes
`;

const FROM = 'FROM checkins c JOIN reservas r ON r.id = c.reserva_id';

checkinsRouter.get('/', async (_req, res, next) => {
  try {
    const { rows } = await query(`SELECT ${CAMPOS} ${FROM} ORDER BY c.id DESC`);
    res.json(rows);
  } catch (erro) {
    next(erro);
  }
});

// Gera o formulário de check-in de uma reserva (idempotente).
checkinsRouter.post('/', async (req, res, next) => {
  try {
    const reservaId = Number(req.body?.reserva_id);
    if (!Number.isInteger(reservaId)) {
      return res.status(400).json({ erro: 'Informe a reserva (reserva_id).' });
    }

    const { rows: criados } = await query(
      `INSERT INTO checkins (reserva_id, nome_completo, documento, telefone, email)
       SELECT id, hospede_nome, documento, hospede_telefone, hospede_email
       FROM reservas WHERE id = $1
       ON CONFLICT (reserva_id) DO NOTHING
       RETURNING id`,
      [reservaId],
    );

    if (criados.length === 0) {
      const { rows } = await query(`SELECT ${CAMPOS} ${FROM} WHERE c.reserva_id = $1`, [reservaId]);
      if (rows.length === 0) {
        return res.status(404).json({ erro: 'Reserva não encontrada.' });
      }
      return res.json(rows[0]);
    }

    await query(`UPDATE reservas SET status = 'checkin_gerado' WHERE id = $1`, [reservaId]);
    const { rows } = await query(`SELECT ${CAMPOS} ${FROM} WHERE c.id = $1`, [criados[0].id]);
    res.status(201).json(rows[0]);
  } catch (erro) {
    next(erro);
  }
});

checkinsRouter.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await query(`SELECT ${CAMPOS} ${FROM} WHERE c.id = $1`, [Number(req.params.id)]);
    if (rows.length === 0) {
      return res.status(404).json({ erro: 'Check-in não encontrado.' });
    }
    res.json(rows[0]);
  } catch (erro) {
    next(erro);
  }
});

// Salva o formulário preenchido pela recepção.
checkinsRouter.put('/:id', async (req, res, next) => {
  try {
    const dados = req.body ?? {};
    const { rows } = await query(
      `UPDATE checkins SET
         nome_completo    = $2,
         documento        = $3,
         telefone         = $4,
         email            = $5,
         placa_veiculo    = $6,
         acompanhantes    = $7,
         horario_chegada  = $8,
         observacoes      = $9,
         status           = CASE
                              WHEN enviado_green_em IS NOT NULL AND enviado_governanca_em IS NOT NULL
                                THEN 'enviado'
                              ELSE 'preenchido'
                            END,
         atualizado_em    = now()
       WHERE id = $1
       RETURNING reserva_id, status`,
      [
        Number(req.params.id),
        dados.nome_completo || null,
        dados.documento || null,
        dados.telefone || null,
        dados.email || null,
        dados.placa_veiculo || null,
        Number(dados.acompanhantes ?? 0),
        dados.horario_chegada || null,
        dados.observacoes || null,
      ],
    );

    if (rows.length === 0) {
      return res.status(404).json({ erro: 'Check-in não encontrado.' });
    }
    await query(`UPDATE reservas SET status = 'checkin_gerado' WHERE id = $1 AND status <> 'concluido'`, [
      rows[0].reserva_id,
    ]);

    const { rows: atualizado } = await query(`SELECT ${CAMPOS} ${FROM} WHERE c.id = $1`, [
      Number(req.params.id),
    ]);
    res.json(atualizado[0]);
  } catch (erro) {
    next(erro);
  }
});

// Repassa o check-in para o Green ou para a equipe de governança.
checkinsRouter.post('/:id/enviar', async (req, res, next) => {
  try {
    const destino = req.body?.destino;
    const coluna = COLUNA_DESTINO[destino];
    if (!coluna) {
      return res.status(400).json({ erro: 'Destino inválido. Use "green" ou "governanca".' });
    }

    const { rows } = await query(
      `UPDATE checkins SET
         ${coluna}     = now(),
         atualizado_em = now()
       WHERE id = $1
       RETURNING reserva_id, (enviado_green_em IS NOT NULL AND enviado_governanca_em IS NOT NULL) AS concluido`,
      [Number(req.params.id)],
    );

    if (rows.length === 0) {
      return res.status(404).json({ erro: 'Check-in não encontrado.' });
    }

    await query(
      `UPDATE checkins SET status = CASE
         WHEN enviado_green_em IS NOT NULL AND enviado_governanca_em IS NOT NULL THEN 'enviado'
         ELSE 'preenchido'
       END
       WHERE id = $1`,
      [Number(req.params.id)],
    );
    await query(`UPDATE reservas SET status = $2 WHERE id = $1`, [
      rows[0].reserva_id,
      rows[0].concluido ? 'concluido' : 'checkin_gerado',
    ]);

    const { rows: atualizado } = await query(`SELECT ${CAMPOS} ${FROM} WHERE c.id = $1`, [
      Number(req.params.id),
    ]);
    res.json(atualizado[0]);
  } catch (erro) {
    next(erro);
  }
});
