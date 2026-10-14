import { query } from './db.js';

// API externa do Stays: https://stays.net/external-api/
// O domínio varia por ambiente (a doc usa play.stays.net como exemplo), por isso
// STAYS_API_BASE_URL é configurável e tem um padrão.
const BASE_PADRAO = 'https://play.stays.net/external/v1';

export function configuracaoStays() {
  const clientId = process.env.STAYS_CLIENT_ID;
  const clientSecret = process.env.STAYS_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  return {
    base: (process.env.STAYS_API_BASE_URL || BASE_PADRAO).replace(/\/+$/, ''),
    autorizacao: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
  };
}

export const staysConfigurado = () => configuracaoStays() !== null;

// Relatório de reservas do período (POST /booking/reservations-export).
// dateType aceito pelo Stays: arrival | departure | creation | creationorig | included
export async function buscarReservasStays({ from, to, dateType = 'arrival' }) {
  const config = configuracaoStays();
  if (!config) {
    throw new Error(
      'Integração com o Stays não configurada (faltam STAYS_CLIENT_ID e STAYS_CLIENT_SECRET).',
    );
  }

  const resposta = await fetch(`${config.base}/booking/reservations-export`, {
    method: 'POST',
    headers: {
      Authorization: config.autorizacao,
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({ from, to, dateType }),
    signal: AbortSignal.timeout(20000),
  });

  if (!resposta.ok) {
    const detalhe = await resposta.text().catch(() => '');
    throw new Error(
      `Stays respondeu ${resposta.status}${detalhe ? `: ${detalhe.slice(0, 180)}` : ''}`,
    );
  }

  const dados = await resposta.json();
  return Array.isArray(dados) ? dados : [];
}

// Converte a reserva do Stays no formato da nossa tabela `reservas`.
export function mapearReservaStays(reserva) {
  const cliente = reserva.client ?? {};
  const nome =
    cliente.name || [cliente.firstName, cliente.lastName].filter(Boolean).join(' ') || 'Hóspede Stays';

  return {
    codigo: reserva.id,
    canal: 'Stays',
    hospede_nome: nome,
    hospede_email: cliente.email || null,
    hospede_telefone: cliente.phone || null,
    documento: cliente.document || null,
    checkin: reserva.checkInDate,
    checkout: reserva.checkOutDate,
    quarto: reserva.listing?.internalName || reserva.listing?.id || null,
    hospedes: Number(reserva.guestTotalCount) || 1,
    observacoes: null,
  };
}

// Importa as reservas do Stays. A sincronização não mexe no status nem no
// formulário de check-in — isso continua sendo do app.
export async function sincronizarReservasStays({ from, to, dateType = 'arrival' }) {
  const reservas = await buscarReservasStays({ from, to, dateType });
  const resumo = { from, to, recebidas: reservas.length, criadas: 0, atualizadas: 0, ignoradas: 0 };

  for (const reserva of reservas) {
    const dados = mapearReservaStays(reserva);
    if (!dados.codigo || !dados.checkin || !dados.checkout) {
      resumo.ignoradas += 1;
      continue;
    }

    const { rows } = await query(
      `INSERT INTO reservas
         (codigo, canal, hospede_nome, hospede_email, hospede_telefone, documento,
          checkin, checkout, quarto, hospedes, observacoes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (codigo) DO UPDATE SET
         canal            = EXCLUDED.canal,
         hospede_nome     = EXCLUDED.hospede_nome,
         hospede_email    = EXCLUDED.hospede_email,
         hospede_telefone = EXCLUDED.hospede_telefone,
         documento        = EXCLUDED.documento,
         checkin          = EXCLUDED.checkin,
         checkout         = EXCLUDED.checkout,
         quarto           = EXCLUDED.quarto,
         hospedes         = EXCLUDED.hospedes
       RETURNING (xmax = 0) AS inserida`,
      [
        dados.codigo,
        dados.canal,
        dados.hospede_nome,
        dados.hospede_email,
        dados.hospede_telefone,
        dados.documento,
        dados.checkin,
        dados.checkout,
        dados.quarto,
        dados.hospedes,
        dados.observacoes,
      ],
    );

    if (rows[0].inserida) resumo.criadas += 1;
    else resumo.atualizadas += 1;
  }

  return resumo;
}
