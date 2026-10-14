import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatarData, formatarDataHora } from '../api.js';
import { BadgeCanal, BadgeStatusCheckin } from '../components/Badges.jsx';
import { Aviso } from '../components/Campo.jsx';

export default function Checkins() {
  const [checkins, setCheckins] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  const carregar = useCallback(async () => {
    try {
      setCheckins(await api.listarCheckins());
      setErro(null);
    } catch (falha) {
      setErro(falha.message);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  if (carregando) return <p className="carregando">Carregando check-ins…</p>;

  return (
    <>
      <Aviso>{erro}</Aviso>

      <section className="cartao">
        <h2>Check-ins gerados</h2>
        <div className="tabela__area">
          <table className="tabela">
            <thead>
              <tr>
                <th>Reserva</th>
                <th>Canal</th>
                <th>Hóspede</th>
                <th>Período</th>
                <th>Status</th>
                <th>Green</th>
                <th>Governança</th>
                <th aria-label="Ações" />
              </tr>
            </thead>
            <tbody>
              {checkins.map((checkin) => (
                <tr key={checkin.id}>
                  <td className="mono">{checkin.reserva_codigo}</td>
                  <td>
                    <BadgeCanal canal={checkin.canal} />
                  </td>
                  <td>
                    <strong>{checkin.nome_completo}</strong>
                    <span className="secundario">{checkin.quarto ?? '—'}</span>
                  </td>
                  <td>
                    {formatarData(checkin.checkin)} → {formatarData(checkin.checkout)}
                  </td>
                  <td>
                    <BadgeStatusCheckin status={checkin.status} />
                  </td>
                  <td>{checkin.enviado_green_em ? 'Enviado' : <span className="pendente">Pendente</span>}</td>
                  <td>
                    {checkin.enviado_governanca_em ? (
                      'Enviado'
                    ) : (
                      <span className="pendente">Pendente</span>
                    )}
                  </td>
                  <td className="tabela__acao">
                    <Link className="botao botao--claro" to={`/checkins/${checkin.id}`}>
                      Abrir
                    </Link>
                  </td>
                </tr>
              ))}
              {checkins.length === 0 && (
                <tr>
                  <td colSpan={8} className="tabela__vazia">
                    Nenhum check-in gerado. Gere um a partir da lista de reservas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <p className="secundario">
        Última atualização: {formatarDataHora(checkins[0]?.atualizado_em) ?? '—'}
      </p>
    </>
  );
}
