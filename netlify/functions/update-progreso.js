const { verifyJwt, obtenerBearer } = require('./_auth');
const { llamarAppsScript } = require('./_apps-script');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ status: 'error', message: 'Metodo no permitido' }),
    };
  }

  try {
    const JWT_SECRET = process.env.JWT_SECRET;
    const token = obtenerBearer(event.headers || {});
    const jwt = verifyJwt(token, JWT_SECRET || '');

    if (!jwt.ok) {
      return { statusCode: 401, body: JSON.stringify({ status: 'error', message: jwt.message }) };
    }

    const body = JSON.parse(event.body || '{}');

    if (jwt.payload.rol !== 'socio' || body.usuario_id !== jwt.payload.id) {
      return { statusCode: 403, body: JSON.stringify({ status: 'error', message: 'Acceso denegado' }) };
    }

    const payload = {
      ...body,
      fecha: new Date().toISOString(),
    };

    const respuesta = await llamarAppsScript('saveProgreso', payload);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'ok', data: respuesta.data || null }),
    };
  } catch (error) {
    console.error('Error update-progreso:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'error', message: 'No se pudo guardar la sesion' }),
    };
  }
};
