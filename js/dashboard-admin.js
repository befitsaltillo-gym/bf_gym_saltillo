// ── Dashboard Admin ───────────────────────────────────────────────────────────

(function iniciarDashboardAdmin() {
  const usuario = window.BEFIT_AUTH.protegerRuta(['admin']);
  if (!usuario) return;

  window.BEFIT_AUTH.enlazarCerrarSesion('#btnLogout');
  document.getElementById('nombreAdmin').textContent =
    usuario.nombre_completo || usuario.username || 'Administrador';

  const esSesionDemo = String(usuario.username || '').startsWith('demo.');

  const metricas = document.getElementById('metricas');
  const tabla = document.querySelector('#tablaUsuarios tbody');

  // ── Demo fallback ────────────────────────────────────────────────────────
  const usuariosDemo = [
    { id: 'a1', nombre: 'Andrea Perez', username: 'andrea.p', rol: 'admin', activo: true, fecha: '2026-03-01', numero_socio: '', tieneRutina: false, diasRutina: 0, coach_id: '' },
    { id: 'c1', nombre: 'Mario Soto', username: 'mario.soto', rol: 'coach', activo: true, fecha: '2026-03-05', numero_socio: '', tieneRutina: false, diasRutina: 0, coach_id: '' },
    { id: 's1', nombre: 'Pedro Reyes', username: 'pedro.reyes', rol: 'socio', activo: true, fecha: '2026-03-09', numero_socio: 'BF-001', tieneRutina: true, diasRutina: 17, coach_id: 'c1' },
    { id: 's2', nombre: 'Sofia Lara', username: 'sofia.lara', rol: 'socio', activo: false, fecha: '2026-03-14', numero_socio: 'BF-002', tieneRutina: true, diasRutina: 31, coach_id: 'c1' },
  ];

  let usuariosActuales = [];

  // ── Helpers ──────────────────────────────────────────────────────────────
  function diasDesde(fechaIso) {
    if (!fechaIso) return 0;
    const inicio = new Date(fechaIso).getTime();
    if (Number.isNaN(inicio)) return 0;
    return Math.max(1, Math.floor((Date.now() - inicio) / 86400000) + 1);
  }

  function normalizarSocio(item) {
    const rutina = item?.rutina || item?.rutina_activa || {};
    const dias = diasDesde(rutina?.fecha_inicio);
    return {
      id: item?.id || item?.usuario?.id || '',
      nombre: item?.nombre_completo || item?.usuario?.nombre_completo || item?.nombre || 'Usuario',
      username: item?.username || item?.usuario?.username || '-',
      rol: item?.rol || item?.usuario?.rol || 'socio',
      activo: item?.activo !== false && item?.usuario?.activo !== false,
      fecha: String(item?.fecha_creacion || item?.usuario?.fecha_creacion || '').slice(0, 10) || '-',
      numero_socio: item?.numero_socio || item?.usuario?.numero_socio || '',
      diasRutina: dias,
      tieneRutina: Boolean(rutina?.id || rutina?.nombre_rutina || rutina?.fecha_inicio),
      coach_id: rutina?.coach_id || item?.coach_id || '',
    };
  }

  async function cargarUsuarios() {
    try {
      const respuesta = await window.BEFIT_API.getSocios();
      const data = respuesta?.data;
      const items = Array.isArray(data) ? data : Array.isArray(data?.socios) ? data.socios : [];
      usuariosActuales = items.map(normalizarSocio);
    } catch {
      usuariosActuales = esSesionDemo ? usuariosDemo : [];
    }
  }

  // ── Metricas ─────────────────────────────────────────────────────────────
  function renderMetricas(usuarios) {
    const socios = usuarios.filter((u) => u.rol === 'socio');
    const totalActivos = socios.filter((u) => u.activo).length;
    const coaches = new Set(usuarios.filter((u) => u.rol === 'coach').map((u) => u.id)).size;
    const vencidas = socios.filter((u) => u.tieneRutina && u.diasRutina > 28).length;
    const sinRutina = socios.filter((u) => !u.tieneRutina).length;

    metricas.innerHTML = [
      ['Total socios activos', totalActivos],
      ['Coaches registrados', coaches],
      ['Socios con rutina vencida', vencidas],
      ['Socios sin rutina', sinRutina],
    ]
      .map(
        ([titulo, valor]) => `
        <article class="card quick-card">
          <p class="quick-title">${titulo}</p>
          <p class="quick-value">${valor}</p>
        </article>`
      )
      .join('');
  }

  // ── Tabla ────────────────────────────────────────────────────────────────
  function renderTabla(usuarios) {
    if (!usuarios.length) {
      tabla.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:16px;">No hay usuarios disponibles.</td></tr>';
      return;
    }

    tabla.innerHTML = usuarios
      .map((u) => {
        const badgeRol = u.rol === 'admin' ? 'badge-red' : u.rol === 'coach' ? 'badge-blue' : 'badge-gray';
        const badgeEst = u.activo ? 'badge-green' : 'badge-gray';
        const esPropioAdmin = u.id === usuario.id;
        const toggleLabel = u.activo ? 'Desactivar' : 'Activar';
        const toggleClass = u.activo ? 'danger' : '';

        return `
          <tr data-uid="${u.id}">
            <td>${u.nombre}</td>
            <td>${u.username}</td>
            <td><span class="${badgeRol}">${u.rol}</span></td>
            <td><span class="${badgeEst}">${u.activo ? 'Activo' : 'Inactivo'}</span></td>
            <td>${u.fecha}</td>
            <td>
              <div class="table-actions">
                ${!esPropioAdmin ? `<button class="btn-xs ${toggleClass} btn-toggle-estado" data-uid="${u.id}" data-activo="${u.activo}">${toggleLabel}</button>` : ''}
                ${u.rol !== 'admin' ? `<button class="btn-xs btn-cambiar-rol" data-uid="${u.id}" data-rol="${u.rol}">Rol</button>` : ''}
                <button class="btn-xs btn-reset-pass" data-uid="${u.id}">Pass</button>
              </div>
            </td>
          </tr>`;
      })
      .join('');

    enlazarAccionesTabla();
  }

  // ── Acciones tabla ───────────────────────────────────────────────────────
  function confirmar(titulo, mensaje, onOk) {
    const overlay = document.getElementById('modalConfirm');
    document.getElementById('modalConfirmTitulo').textContent = titulo;
    document.getElementById('modalConfirmMsg').textContent = mensaje;
    overlay.classList.remove('hidden');

    function limpiar() {
      overlay.classList.add('hidden');
      document.getElementById('btnConfirmOk').onclick = null;
      document.getElementById('btnConfirmCancelar').onclick = null;
    }
    document.getElementById('btnConfirmOk').onclick = () => { limpiar(); onOk(); };
    document.getElementById('btnConfirmCancelar').onclick = limpiar;
  }

  function enlazarAccionesTabla() {
    // Activar / Desactivar
    tabla.querySelectorAll('.btn-toggle-estado').forEach((btn) => {
      btn.addEventListener('click', () => {
        const uid = btn.dataset.uid;
        const esActivo = btn.dataset.activo === 'true';
        const u = usuariosActuales.find((x) => x.id === uid);
        if (!u) return;

        if (esActivo) {
          confirmar(
            'Desactivar usuario',
            `Se desactivara la cuenta de ${u.nombre}. El usuario no podra iniciar sesion.`,
            () => ejecutarToggleEstado(uid, false)
          );
        } else {
          ejecutarToggleEstado(uid, true);
        }
      });
    });

    // Cambiar rol
    tabla.querySelectorAll('.btn-cambiar-rol').forEach((btn) => {
      btn.addEventListener('click', () => {
        const uid = btn.dataset.uid;
        const rolActual = btn.dataset.rol;
        const u = usuariosActuales.find((x) => x.id === uid);
        if (!u) return;
        const nuevoRol = rolActual === 'socio' ? 'coach' : 'socio';
        confirmar(
          'Cambiar rol',
          `Se cambiara el rol de ${u.nombre} de "${rolActual}" a "${nuevoRol}". Esto afecta los permisos de acceso.`,
          () => ejecutarCambioRol(uid, nuevoRol)
        );
      });
    });

    // Restablecer contrasena
    tabla.querySelectorAll('.btn-reset-pass').forEach((btn) => {
      btn.addEventListener('click', () => {
        const uid = btn.dataset.uid;
        const u = usuariosActuales.find((x) => x.id === uid);
        if (!u) return;
        const nuevaPass = prompt(`Nueva contrasena temporal para ${u.nombre}:`);
        if (!nuevaPass || !nuevaPass.trim()) return;
        ejecutarResetPass(uid, nuevaPass.trim());
      });
    });
  }

  async function ejecutarToggleEstado(uid, nuevoActivo) {
    try {
      await window.BEFIT_API.updateUsuario({ usuario_id: uid, campo: 'activo', valor: nuevoActivo });
      const u = usuariosActuales.find((x) => x.id === uid);
      if (u) u.activo = nuevoActivo;
      renderMetricas(usuariosActuales);
      renderTabla(filtrarUsuarios());
    } catch {
      alert('Error al actualizar el estado del usuario.');
    }
  }

  async function ejecutarCambioRol(uid, nuevoRol) {
    try {
      await window.BEFIT_API.updateUsuario({ usuario_id: uid, campo: 'rol', valor: nuevoRol });
      const u = usuariosActuales.find((x) => x.id === uid);
      if (u) u.rol = nuevoRol;
      renderMetricas(usuariosActuales);
      renderTabla(filtrarUsuarios());
    } catch {
      alert('Error al cambiar el rol del usuario.');
    }
  }

  async function ejecutarResetPass(uid, nuevaPass) {
    try {
      await window.BEFIT_API.updateUsuario({ usuario_id: uid, campo: 'password', valor: nuevaPass });
      alert('Contrasena restablecida correctamente.');
    } catch {
      alert('Error al restablecer la contrasena.');
    }
  }

  // ── Filtros ───────────────────────────────────────────────────────────────
  function filtrarUsuarios() {
    const rol = document.getElementById('filtroRol').value;
    const estado = document.getElementById('filtroEstado').value;
    const buscar = document.getElementById('filtroBuscar').value.trim().toLowerCase();

    return usuariosActuales.filter((u) => {
      if (rol && u.rol !== rol) return false;
      if (estado === 'activo' && !u.activo) return false;
      if (estado === 'inactivo' && u.activo) return false;
      if (buscar && !u.nombre.toLowerCase().includes(buscar) && !u.username.toLowerCase().includes(buscar)) return false;
      return true;
    });
  }

  ['filtroRol', 'filtroEstado', 'filtroBuscar'].forEach((id) => {
    document.getElementById(id).addEventListener('input', () => {
      renderTabla(filtrarUsuarios());
    });
  });

  // ── Modal Crear Usuario (admin) ───────────────────────────────────────────
  let rolModalActual = 'socio';
  const modalCrear = document.getElementById('modalCrearUsuario');

  function abrirModalCrear(rol) {
    rolModalActual = rol;
    document.getElementById('modalCrearTitulo').textContent =
      rol === 'coach' ? 'Nuevo Coach' : 'Nuevo Socio';
    document.getElementById('crearRolInfo').textContent =
      rol === 'coach' ? 'ROL: COACH' : 'ROL: SOCIO';

    // Numero de socio solo para socios
    const numWrap = document.getElementById('cuNumeroWrap');
    numWrap.style.display = rol === 'socio' ? '' : 'none';
    if (rol === 'socio') {
      const siguiente = String(usuariosActuales.filter((u) => u.rol === 'socio').length + 1).padStart(3, '0');
      document.getElementById('cu_numero').value = `BF-${siguiente}`;
    }

    // Limpiar campos
    ['cu_nombre', 'cu_username', 'cu_email', 'cu_password',
     'cu_edad', 'cu_peso', 'cu_estatura', 'cu_frecuencia',
     'cu_objetivo', 'cu_lesiones', 'cu_contraindicaciones'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });

    document.getElementById('cuError1').textContent = '';
    document.getElementById('cuError2').textContent = '';
    document.getElementById('crearPasoAcceso').classList.remove('hidden');
    document.getElementById('crearPasoPerfil').classList.add('hidden');
    document.getElementById('crearStep1').classList.add('active');
    document.getElementById('crearStep2').classList.remove('active');
    modalCrear.classList.remove('hidden');
  }

  document.getElementById('btnNuevoCoach').addEventListener('click', () => abrirModalCrear('coach'));
  document.getElementById('btnNuevoSocioAdmin').addEventListener('click', () => abrirModalCrear('socio'));
  document.getElementById('btnCerrarModalCrear').addEventListener('click', () => modalCrear.classList.add('hidden'));
  modalCrear.addEventListener('click', (e) => { if (e.target === modalCrear) modalCrear.classList.add('hidden'); });

  document.getElementById('cuBtnSiguiente').addEventListener('click', () => {
    const nombre = document.getElementById('cu_nombre').value.trim();
    const username = document.getElementById('cu_username').value.trim();
    const password = document.getElementById('cu_password').value.trim();
    const err = document.getElementById('cuError1');
    if (!nombre || !username || !password) {
      err.textContent = 'Nombre, usuario y contrasena son obligatorios.';
      return;
    }
    err.textContent = '';
    document.getElementById('crearPasoAcceso').classList.add('hidden');
    document.getElementById('crearPasoPerfil').classList.remove('hidden');
    document.getElementById('crearStep1').classList.remove('active');
    document.getElementById('crearStep2').classList.add('active');
  });

  document.getElementById('cuBtnAnterior').addEventListener('click', () => {
    document.getElementById('crearPasoPerfil').classList.add('hidden');
    document.getElementById('crearPasoAcceso').classList.remove('hidden');
    document.getElementById('crearStep2').classList.remove('active');
    document.getElementById('crearStep1').classList.add('active');
  });

  document.getElementById('cuBtnCrear').addEventListener('click', async () => {
    const err = document.getElementById('cuError2');
    const btn = document.getElementById('cuBtnCrear');

    const payload = {
      rol_nuevo: rolModalActual,
      nombre_completo: document.getElementById('cu_nombre').value.trim(),
      username: document.getElementById('cu_username').value.trim().toLowerCase(),
      email: document.getElementById('cu_email').value.trim(),
      password_temporal: document.getElementById('cu_password').value.trim(),
      numero_socio: rolModalActual === 'socio' ? document.getElementById('cu_numero').value.trim() : '',
      edad: document.getElementById('cu_edad').value,
      peso_kg: document.getElementById('cu_peso').value,
      estatura_cm: document.getElementById('cu_estatura').value,
      frecuencia_semanal: document.getElementById('cu_frecuencia').value,
      objetivo: document.getElementById('cu_objetivo').value.trim(),
      lesiones: document.getElementById('cu_lesiones').value.trim() || 'Ninguna',
      contraindicaciones: document.getElementById('cu_contraindicaciones').value.trim() || 'Ninguna',
    };

    btn.disabled = true;
    err.style.color = 'var(--muted)';
    err.textContent = 'Creando usuario...';

    try {
      await window.BEFIT_API.createUsuario(payload);
      modalCrear.classList.add('hidden');
      await cargarUsuarios();
      renderMetricas(usuariosActuales);
      renderTabla(filtrarUsuarios());
    } catch (e) {
      err.style.color = 'var(--error)';
      err.textContent = e.message || 'Error al crear el usuario.';
    } finally {
      btn.disabled = false;
    }
  });

  // ── Modal confirmacion ────────────────────────────────────────────────────
  document.getElementById('modalConfirm').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modalConfirm')) {
      document.getElementById('modalConfirm').classList.add('hidden');
    }
  });

  // ── Init ──────────────────────────────────────────────────────────────────
  cargarUsuarios().then(() => {
    renderMetricas(usuariosActuales);
    renderTabla(filtrarUsuarios());
  });
})();
