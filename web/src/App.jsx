import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import Reservas from './pages/Reservas.jsx';
import Checkins from './pages/Checkins.jsx';
import CheckinDetalhe from './pages/CheckinDetalhe.jsx';

export default function App() {
  return (
    <div className="app">
      <header className="topo">
        <div className="topo__marca">
          <span className="topo__logo">CI</span>
          <div>
            <h1>Automação de Check-in</h1>
            <p>Dos canais de reserva para o Stays, o Green e a governança</p>
          </div>
        </div>
        <nav className="topo__menu">
          <NavLink to="/" end>
            Reservas
          </NavLink>
          <NavLink to="/checkins">Check-ins</NavLink>
        </nav>
      </header>

      <main className="conteudo">
        <Routes>
          <Route path="/" element={<Reservas />} />
          <Route path="/checkins" element={<Checkins />} />
          <Route path="/checkins/:id" element={<CheckinDetalhe />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
