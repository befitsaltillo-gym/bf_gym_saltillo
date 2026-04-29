const { verifyJwt, obtenerBearer } = require('./_auth');
const { llamarAppsScript } = require('./_apps-script');

// ── Crea o actualiza una rutina predefinida ────────────────────────────────────
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
    if (!body.nombre_rutina || !String(body.nombre_rutina).trim()) {
      return {
        statusCode: 400,
        body: JSON.stringify({ status: 'error', message: 'nombre_rutina es obligatorio' }),
      };
    }

    const payload = {
      ...body,
      coach_id: jwt.payload.id,
      coach_nombre: jwt.payload.nombre_completo || jwt.payload.username || '',
    };

    const respuesta = await llamarAppsScript('saveRutinaPredefinida', payload);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'ok', data: respuesta.data || null }),
    };
  } catch (error) {
    console.error('Error save-rutina-predefinida:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'error', message: 'No se pudo guardar la rutina predefinida' }),
    };
  }
};
