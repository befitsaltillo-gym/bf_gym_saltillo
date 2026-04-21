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
    const rolNuevo = body.rol_nuevo;

    const puedeCrearSocio = ['admin', 'coach'].includes(jwt.payload.rol) && rolNuevo === 'socio';
    const puedeCrearCoach = jwt.payload.rol === 'admin' && rolNuevo === 'coach';

    if (!puedeCrearSocio && !puedeCrearCoach) {
      return { statusCode: 403, body: JSON.stringify({ status: 'error', message: 'No tienes permiso para crear este usuario' }) };
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const password_hash = await sha256Hex(`${body.password_temporal || ''}${salt}`);

    const payload = {
      ...body,
      id: crypto.randomUUID(),
      salt,
      password_hash,
      fecha_creacion: new Date().toISOString(),
      activo: true,
    };

    const respuesta = await llamarAppsScript('createUsuario', payload);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'ok', data: respuesta.data || null }),
    };
  } catch (error) {
    console.error('Error create-usuario:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'error', message: 'No se pudo crear el usuario' }),
    };
  }
};
