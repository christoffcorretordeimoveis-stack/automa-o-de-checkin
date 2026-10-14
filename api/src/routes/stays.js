import { Router } from 'express';
import { configuracaoStays, sincronizarReservasStays, staysConfigurado } from '../stays.js';

export const staysRouter = Router();

// Por padrão importamos as chegadas dos próximos 30 dias.
const JANELA_PADRAO_DIAS = 30;

function dataISO(dias = 0) {
  const data = new Date();
  data.setUTCDate(data.getUTCDate() + dias);
  return data.toISOString().slice(0, 10);
}

function janela(corpo) {
  const valida = (valor) => /^\d{4}-\d{2}-\d{2}$/.test(valor ?? '');
  return {
    from: valida(corpo.from) ? corpo.from : dataISO(0),
    to: valida(corpo.to) ? corpo.to : dataISO(JANELA_PADRAO_DIAS),
  };
}

staysRouter.get('/status', (_req, res) => {
  const config = configuracaoStays();
  res.json({ configurado: config !== null, base: config?.base ?? null });
});

staysRouter.post('/sincronizar', async (req, res, next) => {
  if (!staysConfigurado()) {
    return res.status(503).json({
      erro: 'Integração com o Stays não configurada. Informe STAYS_CLIENT_ID e STAYS_CLIENT_SECRET para importar as reservas automaticamente.',
    });
  }

  try {
    const { from, to } = janela(req.body ?? {});
    res.json(await sincronizarReservasStays({ from, to }));
  } catch (erro) {
    next(erro);
  }
});
