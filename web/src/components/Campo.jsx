export function Campo({ rotulo, children, largo }) {
  return (
    <label className={`campo${largo ? ' campo--largo' : ''}`}>
      <span className="campo__rotulo">{rotulo}</span>
      {children}
    </label>
  );
}

export function Aviso({ tipo = 'erro', children }) {
  if (!children) return null;
  return <p className={`aviso aviso--${tipo}`}>{children}</p>;
}
