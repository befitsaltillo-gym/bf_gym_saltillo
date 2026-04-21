const { verifyJwt, obtenerBearer } = require('./_auth');
const { llamarAppsScript } = require('./_apps-script');

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
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

    const usuarioId = event.queryStringParameters?.usuario_id || jwt.payload.id;
    if (jwt.payload.rol === 'socio' && usuarioId !== jwt.payload.id) {
      return { statusCode: 403, body: JSON.stringify({ status: 'error', message: 'Acceso denegado' }) };
    }

    const respuesta = await llamarAppsScript('getRutina', { usuario_id: usuarioId });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'ok', data: respuesta.data || respuesta }),
    };
  } catch (error) {
    console.error('Error get-rutina:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'error', message: 'No se pudo obtener la rutina' }),
    };
  }
};
