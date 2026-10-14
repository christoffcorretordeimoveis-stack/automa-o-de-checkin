import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, formatarData, formatarDataHora } from '../api.js';
import { BadgeCanal, BadgeStatusCheckin } from '../components/Badges.jsx';
import { Aviso, Campo } from '../components/Campo.jsx';

const CAMPOS_FORMULARIO = [
  'nome_completo',
  'documento',
  'telefone',
  'email',
  'placa_veiculo',
  'acompanhantes',
  'horario_chegada',
  'observacoes',
];

export default function CheckinDetalhe() {
  const { id } = useParams();
  const [checkin, setCheckin] = useState(null);
  const [formulario, setFormulario] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [enviando, setEnviando] = useState(null);
  const [mensagem, setMensagem] = useState(null);
  const [erro, setErro] = useState(null);

  const aplicar = useCallback((dados) => {
    setCheckin(dados);
    setFormulario(
      Object.fromEntries(
        CAMPOS_FORMULARIO.map((campo) => [campo, dados[campo] ?? (campo === 'acompanhantes' ? 0 : '')]),
      ),
    );
  }, []);

  const carregar = useCallback(async () => {
    try {
      aplicar(await api.obterCheckin(id));
      setErro(null);
    } catch (falha) {
      setErro(falha.message);
    } finally {
      setCarregando(false);
    }
  }, [id, aplicar]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  function alterar(campo, valor) {
    setFormulario((atual) => ({ ...atual, [campo]: valor }));
    setMensagem(null);
  }

  async function salvar(evento) {
    evento.preventDefault();
    setSalvando(true);
    try {
      aplicar(await api.salvarCheckin(id, formulario));
      setMensagem('Formulário de check-in salvo.');
      setErro(null);
    } catch (falha) {
      setErro(falha.message);
    } finally {
      setSalvando(false);
    }
  }

  async function repassar(destino) {
    setEnviando(destino);
    try {
      aplicar(await api.enviarCheckin(id, destino));
      setMensagem(
        destino === 'green'
          ? 'Check-in repassado para o Green.'
          : 'Check-in repassado para a equipe de governança.',
      );
      setErro(null);
    } catch (falha) {
      setErro(falha.message);
    } finally {
      setEnviando(null);
    }
  }

  if (carregando) return <p className="carregando">Carregando check-in…</p>;
  if (erro && !formulario) return <Aviso>{erro}</Aviso>;

  return (
    <>
      <Link className="voltar" to="/checkins">
        ← Todos os check-ins
      </Link>

      <section className="cartao">
        <div className="cartao__cabecalho">
          <div>
            <h2>Check-in — {checkin.reserva_codigo}</h2>
            <p className="secundario">
              <BadgeCanal canal={checkin.canal} /> · {checkin.quarto ?? 'sem unidade definida'} ·{' '}
              {formatarData(checkin.checkin)} → {formatarData(checkin.checkout)} · {checkin.reserva_hospedes}{' '}
              hóspede{checkin.reserva_hospedes > 1 ? 's' : ''}
            </p>
          </div>
          <BadgeStatusCheckin status={checkin.status} />
        </div>

        <Aviso>{erro}</Aviso>
        <Aviso tipo="ok">{mensagem}</Aviso>

        <form className="formulario" onSubmit={salvar}>
          <Campo rotulo="Nome completo" largo>
            <input
              value={formulario.nome_completo}
              onChange={(e) => alterar('nome_completo', e.target.value)}
              placeholder="Nome do hóspede responsável"
            />
          </Campo>
          <Campo rotulo="Documento (RG/CPF)">
            <input
              value={formulario.documento}
              onChange={(e) => alterar('documento', e.target.value)}
              placeholder="000.000.000-00"
            />
          </Campo>
          <Campo rotulo="Telefone">
            <input
              value={formulario.telefone}
              onChange={(e) => alterar('telefone', e.target.value)}
              placeholder="(11) 90000-0000"
            />
          </Campo>
          <Campo rotulo="E-mail">
            <input
              type="email"
              value={formulario.email}
              onChange={(e) => alterar('email', e.target.value)}
              placeholder="hospede@exemplo.com"
            />
          </Campo>
          <Campo rotulo="Placa do veículo">
            <input
              value={formulario.placa_veiculo}
              onChange={(e) => alterar('placa_veiculo', e.target.value)}
              placeholder="ABC1D23"
            />
          </Campo>
          <Campo rotulo="Acompanhantes">
            <input
              type="number"
              min="0"
              value={formulario.acompanhantes}
              onChange={(e) => alterar('acompanhantes', e.target.value)}
            />
          </Campo>
          <Campo rotulo="Horário de chegada">
            <input
              value={formulario.horario_chegada}
              onChange={(e) => alterar('horario_chegada', e.target.value)}
              placeholder="14:30"
            />
          </Campo>
          <Campo rotulo="Observações para a governança" largo>
            <textarea
              rows="3"
              value={formulario.observacoes}
              onChange={(e) => alterar('observacoes', e.target.value)}
              placeholder="Preferências, solicitações e pendências do apartamento"
            />
          </Campo>

          <div className="formulario__acoes">
            <button type="submit" className="botao" disabled={salvando}>
              {salvando ? 'Salvando…' : 'Salvar formulário'}
            </button>
          </div>
        </form>
      </section>

      <section className="cartao">
        <h2>Repassar</h2>
        <p className="secundario">
          Depois de salvar o formulário, repasse o check-in para o Green e para a equipe de
          governança.
        </p>
        <div className="repasses">
          <article className="repasse">
            <div>
              <strong>Green</strong>
              <span className="secundario">
                {checkin.enviado_green_em
                  ? `Enviado em ${formatarDataHora(checkin.enviado_green_em)}`
                  : 'Ainda não enviado'}
              </span>
            </div>
            <button
              type="button"
              className="botao botao--claro"
              disabled={enviando === 'green'}
              onClick={() => repassar('green')}
            >
              {enviando === 'green' ? 'Enviando…' : 'Enviar para o Green'}
            </button>
          </article>
          <article className="repasse">
            <div>
              <strong>Equipe de governança</strong>
              <span className="secundario">
                {checkin.enviado_governanca_em
                  ? `Enviado em ${formatarDataHora(checkin.enviado_governanca_em)}`
                  : 'Ainda não enviado'}
              </span>
            </div>
            <button
              type="button"
              className="botao botao--claro"
              disabled={enviando === 'governanca'}
              onClick={() => repassar('governanca')}
            >
              {enviando === 'governanca' ? 'Enviando…' : 'Enviar para a governança'}
            </button>
          </article>
        </div>
      </section>
    </>
  );
}
