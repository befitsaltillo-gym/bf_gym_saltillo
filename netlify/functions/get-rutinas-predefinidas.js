const { verifyJwt, obtenerBearer } = require('./_auth');
const { llamarAppsScript } = require('./_apps-script');

// ── Retorna todas las rutinas predefinidas (compartidas entre coaches) ────────
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

    if (!['coach', 'admin'].includes(jwt.payload.rol)) {
      return { statusCode: 403, body: JSON.stringify({ status: 'error', message: 'Acceso denegado' }) };
    }

    const respuesta = await llamarAppsScript('getRutinasPredefinidas', {});

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=60, stale-while-revalidate=30',
      },
      body: JSON.stringify({ status: 'ok', data: respuesta.data || [] }),
    };
  } catch (error) {
    console.error('Error get-rutinas-predefinidas:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'error', message: 'No se pudo obtener las rutinas predefinidas' }),
    };
  }
};
