// ── API Netlify Functions para BeFit Rutinas ─────────────────────────────────

async function llamarApi(endpoint, options = {}) {
  const token = window.BEFIT_AUTH?.obtenerToken?.();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`/.netlify/functions/${endpoint}`, {
    ...options,
    headers,
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = { status: 'error', message: 'Respuesta no valida del servidor' };
  }

  if (!response.ok || data.status === 'error') {
    const error = new Error(data.message || 'Error de solicitud');
    error.data = data;
    throw error;
  }

  return data;
}

async function login(username, password) {
  return llamarApi('login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

async function getRutina(usuarioId) {
  return llamarApi(`get-rutina?usuario_id=${encodeURIComponent(usuarioId)}`, {
    method: 'GET',
  });
}

async function getSocios() {
  return llamarApi('get-socios', { method: 'GET' });
}

async function updateProgreso(payload) {
  return llamarApi('update-progreso', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

async function saveRutina(payload) {
  return llamarApi('save-rutina', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

async function updatePerfil(payload) {
  return llamarApi('update-perfil', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

async function updateUsuario(payload) {
  return llamarApi('update-usuario', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

async function createUsuario(payload) {
  return llamarApi('create-usuario', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

async function getHistorialRutinas(usuarioId) {
  return llamarApi(`get-historial-rutinas?usuario_id=${encodeURIComponent(usuarioId)}`, {
    method: 'GET',
  });
}

window.BEFIT_API = {
  llamarApi,
  login,
  getRutina,
  getSocios,
  updateProgreso,
  saveRutina,
  updatePerfil,
  updateUsuario,
  createUsuario,
  getHistorialRutinas,
};
