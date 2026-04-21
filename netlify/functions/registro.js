exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ status: 'error', message: 'Método no permitido' }),
    };
  }

  try {
    const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;

    if (!APPS_SCRIPT_URL) {
      throw new Error('Variable de entorno APPS_SCRIPT_URL no configurada');
    }

    let payload = {};
    try {
      payload = JSON.parse(event.body || '{}');
    } catch {
      return {
        statusCode: 400,
        body: JSON.stringify({ status: 'error', message: 'JSON de solicitud inválido' }),
      };
    }

    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const resultText = await response.text();
    let result;

    try {
      result = JSON.parse(resultText);
    } catch {
      console.error('Apps Script respondió texto no JSON', {
        upstreamStatus: response.status,
        snippet: resultText.slice(0, 180),
      });
      return {
        statusCode: 502,
        body: JSON.stringify({ status: 'error', message: 'Respuesta inválida de Apps Script' }),
      };
    }

    // Solo consideramos respuestas esperadas del upstream.
    if (!response.ok) {
      console.error('Apps Script devolvió error HTTP', {
        upstreamStatus: response.status,
        upstreamBody: result,
      });
      return {
        statusCode: 502,
        body: JSON.stringify({
          status: 'error',
          message: result?.message || 'Error al registrar en Apps Script',
        }),
      };
    }

    if (result?.status !== 'ok' && result?.status !== 'duplicate') {
      console.error('Apps Script devolvió estado inesperado', {
        upstreamStatus: response.status,
        upstreamBody: result,
      });
      return {
        statusCode: 502,
        body: JSON.stringify({
          status: 'error',
          message: result?.message || 'Estado inesperado al guardar registro',
        }),
      };
    }

    // Traza mínima para confirmar destino y email enviado en logs de Netlify.
    console.log('Registro procesado', {
      status: result.status,
      email: payload.email || null,
      hasNombre: Boolean(payload.nombre),
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result),
    };

  } catch (err) {
    console.error('Error en función registro', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ status: 'error', message: err.message }),
    };
  }
};
