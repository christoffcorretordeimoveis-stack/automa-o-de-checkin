import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, formatarData } from '../api.js';
import { BadgeCanal, BadgeStatusReserva } from '../components/Badges.jsx';
import { Aviso, Campo } from '../components/Campo.jsx';

const FORMULARIO_VAZIO = {
  canal: 'Booking.com',
  hospede_nome: '',
  hospede_email: '',
  hospede_telefone: '',
  documento: '',
  checkin: '',
  checkout: '',
  quarto: '',
  hospedes: 1,
  observacoes: '',
};

export default function Reservas() {
  const navegar = useNavigate();
  const [resumo, setResumo] = useState(null);
  const [reservas, setReservas] = useState([]);
  const [canais, setCanais] = useState([]);
  const [staysConfigurado, setStaysConfigurado] = useState(null);
  const [formulario, setFormulario] = useState(FORMULARIO_VAZIO);
  const [carregando, setCarregando] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);
  const [avisoSincronizacao, setAvisoSincronizacao] = useState(null);
  const [erro, setErro] = useState(null);
  const [gerando, setGerando] = useState(null);

  const carregar = useCallback(async () => {
    try {
      const [dadosResumo, dadosReservas, dadosStays] = await Promise.all([
        api.resumo(),
        api.listarReservas(),
        api.statusStays(),
      ]);
      setResumo(dadosResumo);
      setReservas(dadosReservas.reservas);
      setCanais(dadosReservas.canais);
      setStaysConfigurado(dadosStays.configurado);
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

  function alterar(campo, valor) {
    setFormulario((atual) => ({ ...atual, [campo]: valor }));
  }

  async function enviarReserva(evento) {
    evento.preventDefault();
    try {
      await api.criarReserva(formulario);
      setFormulario(FORMULARIO_VAZIO);
      setErro(null);
      await carregar();
    } catch (falha) {
      setErro(falha.message);
    }
  }

  async function gerarCheckin(reservaId) {
    setGerando(reservaId);
    try {
      const checkin = await api.gerarCheckin(reservaId);
      navegar(`/checkins/${checkin.id}`);
    } catch (falha) {
      setErro(falha.message);
      setGerando(null);
    }
  }

  async function cancelarReserva(reserva) {
    const confirmado = window.confirm(
      `Cancelar a reserva ${reserva.codigo}? O check-in vinculado também será removido.`,
    );
    if (!confirmado) return;

    try {
      await api.cancelarReserva(reserva.id);
      setErro(null);
      await carregar();
    } catch (falha) {
      setErro(falha.message);
    }
  }

  async function sincronizarStays() {
    setSincronizando(true);
    setAvisoSincronizacao(null);
    try {
      const resultado = await api.sincronizarStays();
      await carregar();
      setAvisoSincronizacao(
        `Stays: ${resultado.criadas} reserva(s) importada(s)` +
          (resultado.atualizadas ? `, ${resultado.atualizadas} atualizada(s)` : '') +
          ` — chegadas de ${formatarData(resultado.from)} a ${formatarData(resultado.to)}.`,
      );
    } catch (falha) {
      setErro(falha.message);
    } finally {
      setSincronizando(false);
    }
  }

  if (carregando) return <p className="carregando">Carregando reservas…</p>;

  return (
    <>
      <Aviso>{erro}</Aviso>

      {resumo && (
        <section className="indicadores">
          <article className="indicador">
            <span className="indicador__valor">{resumo.reservas}</span>
            <span className="indicador__rotulo">Reservas recebidas</span>
          </article>
          <article className="indicador">
            <span className="indicador__valor">{resumo.aguardando}</span>
            <span className="indicador__rotulo">Aguardando check-in</span>
          </article>
          <article className="indicador">
            <span className="indicador__valor">{resumo.pendentes_green}</span>
            <span className="indicador__rotulo">Pendentes no Green</span>
          </article>
          <article className="indicador">
            <span className="indicador__valor">{resumo.pendentes_governanca}</span>
            <span className="indicador__rotulo">Pendentes na governança</span>
          </article>
          <article className="indicador">
            <span className="indicador__valor">{resumo.enviados}</span>
            <span className="indicador__rotulo">Check-ins repassados</span>
          </article>
        </section>
      )}

      <section className="cartao">
        <div className="cartao__cabecalho">
          <div>
            <h2>Reservas dos canais</h2>
            <p className="secundario">
              Importe as reservas direto do Stays para não digitar as informações à mão.
            </p>
          </div>
          <button
            type="button"
            className="botao"
            disabled={sincronizando || staysConfigurado === false}
            onClick={sincronizarStays}
          >
            {sincronizando ? 'Sincronizando…' : 'Sincronizar com o Stays'}
          </button>
        </div>

        <Aviso tipo="ok">{avisoSincronizacao}</Aviso>

        {staysConfigurado === false && (
          <p className="nota">
            Integração com o Stays ainda não configurada. Informe <code>STAYS_CLIENT_ID</code> e{' '}
            <code>STAYS_CLIENT_SECRET</code> para habilitar a importação automática das reservas.
          </p>
        )}

        <div className="tabela__area">
          <table className="tabela">
            <thead>
              <tr>
                <th>Código</th>
                <th>Canal</th>
                <th>Hóspede</th>
                <th>Período</th>
                <th>Unidade</th>
                <th>Status</th>
                <th aria-label="Ações" />
              </tr>
            </thead>
            <tbody>
              {reservas.map((reserva) => (
                <tr key={reserva.id}>
                  <td className="mono">{reserva.codigo}</td>
                  <td>
                    <BadgeCanal canal={reserva.canal} />
                  </td>
                  <td>
                    <strong>{reserva.hospede_nome}</strong>
                    <span className="secundario">
                      {reserva.hospedes} hóspede{reserva.hospedes > 1 ? 's' : ''}
                    </span>
                  </td>
                  <td>
                    {formatarData(reserva.checkin)} → {formatarData(reserva.checkout)}
                  </td>
                  <td>{reserva.quarto ?? '—'}</td>
                  <td>
                    <BadgeStatusReserva status={reserva.status} />
                  </td>
                  <td className="tabela__acao">
                    <div className="acoes">
                      {reserva.checkin_id ? (
                        <button
                          type="button"
                          className="botao botao--claro"
                          onClick={() => navegar(`/checkins/${reserva.checkin_id}`)}
                        >
                          Abrir check-in
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="botao"
                          disabled={gerando === reserva.id}
                          onClick={() => gerarCheckin(reserva.id)}
                        >
                          {gerando === reserva.id ? 'Gerando…' : 'Gerar check-in'}
                        </button>
                      )}
                      <button
                        type="button"
                        className="botao botao--texto"
                        onClick={() => cancelarReserva(reserva)}
                      >
                        Cancelar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {reservas.length === 0 && (
                <tr>
                  <td colSpan={7} className="tabela__vazia">
                    Nenhuma reserva recebida pelos canais ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="cartao">
        <h2>Registrar reserva recebida</h2>
        <p className="secundario">
          Use este formulário para registrar uma reserva que chegou pelo canal — no lugar da
          integração automática.
        </p>
        <form className="formulario" onSubmit={enviarReserva}>
          <Campo rotulo="Canal">
            <select value={formulario.canal} onChange={(e) => alterar('canal', e.target.value)}>
              {canais.map((canal) => (
                <option key={canal} value={canal}>
                  {canal}
                </option>
              ))}
            </select>
          </Campo>
          <Campo rotulo="Hóspede">
            <input
              required
              value={formulario.hospede_nome}
              onChange={(e) => alterar('hospede_nome', e.target.value)}
              placeholder="Nome completo"
            />
          </Campo>
          <Campo rotulo="E-mail">
            <input
              type="email"
              value={formulario.hospede_email}
              onChange={(e) => alterar('hospede_email', e.target.value)}
              placeholder="hospede@exemplo.com"
            />
          </Campo>
          <Campo rotulo="Telefone">
            <input
              value={formulario.hospede_telefone}
              onChange={(e) => alterar('hospede_telefone', e.target.value)}
              placeholder="(11) 90000-0000"
            />
          </Campo>
          <Campo rotulo="Check-in">
            <input
              required
              type="date"
              value={formulario.checkin}
              onChange={(e) => alterar('checkin', e.target.value)}
            />
          </Campo>
          <Campo rotulo="Check-out">
            <input
              required
              type="date"
              value={formulario.checkout}
              onChange={(e) => alterar('checkout', e.target.value)}
            />
          </Campo>
          <Campo rotulo="Unidade">
            <input
              value={formulario.quarto}
              onChange={(e) => alterar('quarto', e.target.value)}
              placeholder="Apto 204 — Bloco A"
            />
          </Campo>
          <Campo rotulo="Hóspedes">
            <input
              type="number"
              min="1"
              value={formulario.hospedes}
              onChange={(e) => alterar('hospedes', e.target.value)}
            />
          </Campo>
          <Campo rotulo="Observações" largo>
            <textarea
              rows="2"
              value={formulario.observacoes}
              onChange={(e) => alterar('observacoes', e.target.value)}
              placeholder="Pedidos especiais, horário de chegada…"
            />
          </Campo>
          <div className="formulario__acoes">
            <button type="submit" className="botao">
              Registrar reserva
            </button>
          </div>
        </form>
      </section>
    </>
  );
}
