const crypto = require('crypto');
const { verifyJwt, obtenerBearer, sha256Hex } = require('./_auth');
const { llamarAppsScript } = require('./_apps-script');

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

    const body = JSON.parse(event.body || '{}');
    const campo = body.campo;

    const esCambioAdmin = ['activo', 'rol'].includes(campo);
    const esCambioPassword = campo === 'password';

    if (esCambioAdmin && jwt.payload.rol !== 'admin') {
      return { statusCode: 403, body: JSON.stringify({ status: 'error', message: 'Solo admin puede cambiar este campo' }) };
    }

    if (esCambioPassword) {
      const propio = body.usuario_id === jwt.payload.id;
      if (!propio && jwt.payload.rol !== 'admin') {
        return { statusCode: 403, body: JSON.stringify({ status: 'error', message: 'No tienes permiso para cambiar esta contrasena' }) };
      }

      const salt = crypto.randomBytes(16).toString('hex');
      const password_hash = await sha256Hex(`${body.valor || ''}${salt}`);
      body.password_hash = password_hash;
      body.salt = salt;
      delete body.valor;
      body.campo = 'password_hash';
    }

    const respuesta = await llamarAppsScript('updateUsuario', body);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'ok', data: respuesta.data || null }),
    };
  } catch (error) {
    console.error('Error update-usuario:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'error', message: 'No se pudo actualizar el usuario' }),
    };
  }
};
