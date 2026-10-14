export const ESTILO_CANAL = {
  'Booking.com': 'canal--booking',
  Airbnb: 'canal--airbnb',
  Expedia: 'canal--expedia',
  Decolar: 'canal--decolar',
  Direto: 'canal--direto',
  Stays: 'canal--stays',
};

export function BadgeCanal({ canal }) {
  return <span className={`canal ${ESTILO_CANAL[canal] ?? 'canal--direto'}`}>{canal}</span>;
}

const ROTULOS_RESERVA = {
  aguardando_checkin: 'Aguardando check-in',
  checkin_gerado: 'Check-in gerado',
  concluido: 'Concluído',
};

const ROTULOS_CHECKIN = {
  rascunho: 'Rascunho',
  preenchido: 'Preenchido',
  enviado: 'Enviado',
};

export function BadgeStatusReserva({ status }) {
  return (
    <span className={`status status--${status}`}>
      {ROTULOS_RESERVA[status] ?? status}
    </span>
  );
}

export function BadgeStatusCheckin({ status }) {
  return (
    <span className={`status status--${status}`}>
      {ROTULOS_CHECKIN[status] ?? status}
    </span>
  );
}
