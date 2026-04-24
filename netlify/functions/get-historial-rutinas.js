const { verifyJwt, obtenerBearer } = require('./_auth');
const { llamarAppsScript } = require('./_apps-script');

// ── Retorna todas las rutinas (activas e inactivas) de un socio ───────────
exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ status: 'error', message: 'Metodo no permitido' }),
    };
  }

  try {
    const token = obtenerBearer(event.headers || {});
    const jwt = verifyJwt(token, process.env.JWT_SECRET || '');
    if (!jwt.ok) return { statusCode: 401, body: JSON.stringify({ status: 'error', message: jwt.message }) };

    const usuarioId = event.queryStringParameters?.usuario_id || '';
    if (!usuarioId) {
      return { statusCode: 400, body: JSON.stringify({ status: 'error', message: 'usuario_id requerido' }) };
    }

    // El socio solo puede ver su propio historial
    if (jwt.payload.rol === 'socio' && usuarioId !== jwt.payload.id) {
      return { statusCode: 403, body: JSON.stringify({ status: 'error', message: 'Acceso denegado' }) };
    }

    const respuesta = await llamarAppsScript('getHistorialRutinas', { usuario_id: usuarioId });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=60, stale-while-revalidate=30',
      },
      body: JSON.stringify({ status: 'ok', data: respuesta.data || [] }),
    };
  } catch (error) {
    console.error('Error get-historial-rutinas:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'error', message: 'No se pudo obtener el historial de rutinas' }),
    };
  }
};
