import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './db.js';
import { RESERVAS_SEED } from './seed-data.js';

const pastaAtual = path.dirname(fileURLToPath(import.meta.url));

function somarDias(dias) {
  const data = new Date();
  data.setUTCDate(data.getUTCDate() + dias);
  return data.toISOString().slice(0, 10);
}

// Idempotente: pode rodar a cada `up` sem duplicar as reservas de exemplo.
async function main() {
  const schema = await readFile(path.join(pastaAtual, 'schema.sql'), 'utf8');
  await pool.query(schema);

  for (const reserva of RESERVAS_SEED) {
    await pool.query(
      `INSERT INTO reservas
         (codigo, canal, hospede_nome, hospede_email, hospede_telefone, documento,
          checkin, checkout, quarto, hospedes, observacoes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (codigo) DO NOTHING`,
      [
        reserva.codigo,
        reserva.canal,
        reserva.hospede_nome,
        reserva.hospede_email,
        reserva.hospede_telefone,
        reserva.documento,
        somarDias(reserva.dias_ate_checkin),
        somarDias(reserva.dias_ate_checkin + reserva.noites),
        reserva.quarto,
        reserva.hospedes,
        reserva.observacoes,
      ],
    );
  }

  const { rows } = await pool.query('SELECT COUNT(*)::int AS total FROM reservas');
  console.log(`Migração concluída. Reservas no banco: ${rows[0].total}.`);
  await pool.end();
}

main().catch((erro) => {
  console.error('Falha na migração:', erro);
  process.exit(1);
});
