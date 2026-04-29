const { verifyJwt, obtenerBearer } = require('./_auth');
const { llamarAppsScript } = require('./_apps-script');

// ── Elimina una rutina predefinida ────────────────────────────────────────────
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
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

    const body = JSON.parse(event.body || '{}');
    if (!body.id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ status: 'error', message: 'id de plantilla requerido' }),
      };
    }

    const respuesta = await llamarAppsScript('deleteRutinaPredefinida', {
      id: body.id,
      coach_id: jwt.payload.id,
      rol: jwt.payload.rol,
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'ok', data: respuesta.data || null }),
    };
  } catch (error) {
    console.error('Error delete-rutina-predefinida:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'error', message: 'No se pudo eliminar la rutina predefinida' }),
    };
  }
};
