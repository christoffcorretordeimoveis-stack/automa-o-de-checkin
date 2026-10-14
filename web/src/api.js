const CABECALHOS = { 'Content-Type': 'application/json' };

async function requisitar(caminho, opcoes) {
  const resposta = await fetch(`/api${caminho}`, { headers: CABECALHOS, ...opcoes });
  const corpo = await resposta.json().catch(() => null);

  if (!resposta.ok) {
    throw new Error(corpo?.erro ?? `Falha na requisição (${resposta.status}).`);
  }
  return corpo;
}

export const api = {
  resumo: () => requisitar('/resumo'),
  listarReservas: () => requisitar('/reservas'),
  criarReserva: (dados) =>
    requisitar('/reservas', { method: 'POST', body: JSON.stringify(dados) }),
  cancelarReserva: (id) => requisitar(`/reservas/${id}`, { method: 'DELETE' }),
  listarCheckins: () => requisitar('/checkins'),
  obterCheckin: (id) => requisitar(`/checkins/${id}`),
  gerarCheckin: (reservaId) =>
    requisitar('/checkins', { method: 'POST', body: JSON.stringify({ reserva_id: reservaId }) }),
  salvarCheckin: (id, dados) =>
    requisitar(`/checkins/${id}`, { method: 'PUT', body: JSON.stringify(dados) }),
  enviarCheckin: (id, destino) =>
    requisitar(`/checkins/${id}/enviar`, { method: 'POST', body: JSON.stringify({ destino }) }),
};

export function formatarData(iso) {
  if (!iso) return '—';
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

export function formatarDataHora(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}
