async function llamarAppsScript(action, payload) {
  const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;
  if (!APPS_SCRIPT_URL) {
    throw new Error('APPS_SCRIPT_URL no configurada');
  }

  const response = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, payload }),
  });

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
