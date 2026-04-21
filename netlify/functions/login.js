const { signJwt, sha256Hex } = require('./_auth');
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
    if (!JWT_SECRET) {
      throw new Error('JWT_SECRET no configurado');
    }

    const body = JSON.parse(event.body || '{}');
    const username = String(body.username || '').trim().toLowerCase();
    const password = String(body.password || '');

    if (!username || !password) {
      return {
        statusCode: 400,
        body: JSON.stringify({ status: 'error', message: 'Usuario y contrasena son requeridos' }),
      };
    }

    const consulta = await llamarAppsScript('getUsuario', { username });
    const usuario = consulta?.data || consulta?.usuario || null;

    if (!usuario || !usuario.password_hash || !usuario.salt || usuario.activo === false) {
      return {
        statusCode: 401,
        body: JSON.stringify({ status: 'error', message: 'Credenciales incorrectas' }),
      };
    }

    const hashInput = `${password}${usuario.salt}`;
    const hashCalculado = await sha256Hex(hashInput);

    if (hashCalculado !== String(usuario.password_hash).toLowerCase()) {
      return {
        statusCode: 401,
        body: JSON.stringify({ status: 'error', message: 'Credenciales incorrectas' }),
      };
    }

    const token = signJwt(
      {
        id: usuario.id,
        username: usuario.username,
        rol: usuario.rol,
        nombre_completo: usuario.nombre_completo || '',
        numero_socio: usuario.numero_socio || '',
      },
      JWT_SECRET,
      8 * 60 * 60
    );

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'ok',
        data: { token },
      }),
    };
  } catch (error) {
    console.error('Error login:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'error', message: 'No fue posible iniciar sesion' }),
    };
  }
};
