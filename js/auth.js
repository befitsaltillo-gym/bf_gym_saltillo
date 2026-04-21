// ── Auth base para BeFit Rutinas ──────────────────────────────────────────────

const CLAVE_TOKEN = 'befit_jwt';

function obtenerToken() {
  return sessionStorage.getItem(CLAVE_TOKEN) || '';
}

function guardarToken(token) {
  sessionStorage.setItem(CLAVE_TOKEN, token);
}

function limpiarSesion() {
  sessionStorage.removeItem(CLAVE_TOKEN);
}

function decodificarToken(token) {
  if (!token || typeof token !== 'string') return null;

  const partes = token.split('.');
  if (partes.length !== 3) return null;

  try {
    const base64 = partes[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function tokenExpirado(payload) {
  if (!payload || typeof payload.exp !== 'number') return true;
  const ahora = Math.floor(Date.now() / 1000);
  return ahora >= payload.exp;
}

function usuarioActual() {
  const token = obtenerToken();
  const payload = decodificarToken(token);

  if (!payload || tokenExpirado(payload)) {
    limpiarSesion();
    return null;
  }

  return payload;
}

function protegerRuta(rolesPermitidos) {
  const usuario = usuarioActual();

  if (!usuario) {
    window.location.href = 'rutinas-login.html';
    return null;
  }

  if (Array.isArray(rolesPermitidos) && rolesPermitidos.length > 0) {
    if (!rolesPermitidos.includes(usuario.rol)) {
      window.location.href = 'rutinas-login.html';
      return null;
    }
  }

  return usuario;
}

function mapearDashboardPorRol(rol) {
  if (rol === 'admin') return 'dashboard-admin.html';
  if (rol === 'coach') return 'dashboard-coach.html';
  return 'dashboard-socio.html';
}

function enlazarCerrarSesion(selector) {
  const btn = document.querySelector(selector);
  if (!btn) return;

  btn.addEventListener('click', () => {
    limpiarSesion();
    window.location.href = 'rutinas-login.html';
  });
}

window.BEFIT_AUTH = {
  CLAVE_TOKEN,
  obtenerToken,
  guardarToken,
  limpiarSesion,
  decodificarToken,
  tokenExpirado,
  usuarioActual,
  protegerRuta,
  mapearDashboardPorRol,
  enlazarCerrarSesion,
};

// ── Banner offline ────────────────────────────────────────────────────────────
(function iniciarBannerOffline() {
  function actualizarBanner() {
    const banner = document.getElementById('offlineBanner');
    if (!banner) return;
    banner.classList.toggle('hidden', navigator.onLine);
  }

  window.addEventListener('online', actualizarBanner);
  window.addEventListener('offline', actualizarBanner);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', actualizarBanner);
  } else {
    actualizarBanner();
  }
})();
