async function llamarAppsScript(action, payload) {
  const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;
  if (!APPS_SCRIPT_URL) {
    throw new Error('APPS_SCRIPT_URL no configurada');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);

  let response;
  try {
    response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, payload }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      throw new Error('Apps Script no respondio a tiempo (timeout 9s)');
    }
    throw err;
  }
  clearTimeout(timer);

  const texto = await response.text();
  let json;
  try {
    json = JSON.parse(texto);
  } catch {
    throw new Error('Respuesta no JSON desde Apps Script');
  }

  if (!response.ok || json.status === 'error') {
    const msg = json?.message || `Error Apps Script (${response.status})`;
    throw new Error(msg);
  }

  return json;
}

module.exports = { llamarAppsScript };
