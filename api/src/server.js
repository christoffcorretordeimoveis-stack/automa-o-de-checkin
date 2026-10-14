import express from 'express';
import { query } from './db.js';
import { reservasRouter } from './routes/reservas.js';
import { checkinsRouter } from './routes/checkins.js';
import { staysRouter } from './routes/stays.js';

const app = express();
app.use(express.json());

app.get('/api/health', async (_req, res) => {
  try {
    await query('SELECT 1');
    res.json({ status: 'ok', banco: 'ok' });
  } catch (erro) {
    res.status(503).json({ status: 'degraded', banco: 'erro', erro: erro.message });
  }
});

// Contadores do painel.
app.get('/api/resumo', async (_req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT
        (SELECT COUNT(*) FROM reservas)                                              AS reservas,
        (SELECT COUNT(*) FROM reservas WHERE status = 'aguardando_checkin')          AS aguardando,
        (SELECT COUNT(*) FROM checkins)                                              AS checkins,
        (SELECT COUNT(*) FROM checkins WHERE status = 'rascunho')                    AS rascunhos,
        (SELECT COUNT(*) FROM checkins WHERE enviado_green_em IS NULL)               AS pendentes_green,
        (SELECT COUNT(*) FROM checkins WHERE enviado_governanca_em IS NULL)          AS pendentes_governanca,
        (SELECT COUNT(*) FROM checkins WHERE status = 'enviado')                     AS enviados
    `);
    res.json(
      Object.fromEntries(Object.entries(rows[0]).map(([chave, valor]) => [chave, Number(valor)])),
    );
  } catch (erro) {
    next(erro);
  }
});

app.use('/api/reservas', reservasRouter);
app.use('/api/checkins', checkinsRouter);
app.use('/api/stays', staysRouter);

app.use((erro, _req, res, _next) => {
  console.error(erro);
  res.status(500).json({ erro: erro.message });
});

const porta = Number(process.env.PORT ?? 8000);
app.listen(porta, '0.0.0.0', () => {
  console.log(`API de check-in ouvindo em http://0.0.0.0:${porta}`);
});
