// ── Dashboard Socio ───────────────────────────────────────────────────────────
// Reescrito limpiamente: carga real desde get-rutina, historial refresh post-guardado.

(function iniciarDashboardSocio() {
  const usuario = window.BEFIT_AUTH.protegerRuta(['socio']);
  if (!usuario) return;

  window.BEFIT_AUTH.enlazarCerrarSesion('#btnLogout');

  const nombreSocio = document.getElementById('nombreSocio');
  const numeroSocio = document.getElementById('numeroSocio');
  const quickCards = document.getElementById('quickCards');
  const tabsDias = document.getElementById('tabsDias');
  const nombreDia = document.getElementById('nombreDia');
  const listaEjercicios = document.getElementById('listaEjercicios');
  const tituloRutina = document.getElementById('tituloRutina');
  const diasRutina = document.getElementById('diasRutina');
  const alertaRutina = document.getElementById('alertaRutina');
  const tablaHistorial = document.querySelector('#tablaHistorial tbody');
  const btnGuardar = document.getElementById('btnGuardarSesion');
  const notasSesion = document.getElementById('notasSesion');
  const progresoFill = document.getElementById('progresoFill');
  const progresoLabel = document.getElementById('progresoLabel');
  const asistenciaSemanal = document.getElementById('asistenciaSemanal');
  const formCambioPass = document.getElementById('formCambioPass');

  const esSesionDemo = String(usuario.username || '').startsWith('demo.');

  nombreSocio.textContent = usuario.nombre_completo || usuario.username || 'Socio';
  numeroSocio.textContent = usuario.numero_socio || 'BF-000';

  // ── Datos demo como fallback ───────────────────────────────────────────────
  const rutinaDemo = {
    id: 'demo-rutina-1',
    nombre_rutina: 'Rutina Fuerza Mes 1',
    fecha_inicio: new Date(Date.now() - 11 * 86400000).toISOString(),
    perfil: {
      objetivo: 'Ganar masa muscular',
      peso_kg: 72,
      estatura_cm: 173,
      frecuencia_semanal: 5,
    },
    dias: {
      dia1: {
        nombre: 'Pecho y Triceps',
        ejercicios: [
          { id: 'ej_001', nombre: 'Press banca', series: 4, repeticiones: '10-12' },
          { id: 'ej_002', nombre: 'Fondos asistidos', series: 3, repeticiones: '8-10' },
        ],
      },
      dia2: {
        nombre: 'Espalda y Biceps',
        ejercicios: [
          { id: 'ej_003', nombre: 'Jalon frontal', series: 4, repeticiones: '10-12' },
          { id: 'ej_004', nombre: 'Curl mancuernas', series: 3, repeticiones: '12' },
        ],
      },
      dia3: { nombre: 'Pierna', ejercicios: [] },
      dia4: { nombre: 'Hombro', ejercicios: [] },
      dia5: { nombre: 'Core y cardio', ejercicios: [] },
    },
  };

  let rutinaActual = null;
  let historialActual = [];
  let diaActivo = 'dia1';

  // ── Helpers ────────────────────────────────────────────────────────────────
  function parsearJsonSeguro(valor, fallback) {
    if (valor == null) return fallback;
    if (typeof valor === 'object') return valor;
    try {
      return JSON.parse(valor);
    } catch {
      return fallback;
    }
  }

  function diasDesde(fechaIso) {
    const inicio = new Date(fechaIso).getTime();
    if (Number.isNaN(inicio)) return 1;
    return Math.max(1, Math.floor((Date.now() - inicio) / 86400000) + 1);
  }

  function mostrarToast(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 2200);
  }

  // ── Normalizacion ──────────────────────────────────────────────────────────
  function normalizarEjercicio(ejercicio, index) {
    return {
      id: ejercicio?.id || `ej_${index + 1}`,
      nombre: ejercicio?.nombre || 'Ejercicio',
      series: ejercicio?.series || '-',
      repeticiones: ejercicio?.repeticiones || '-',
      peso_sugerido: ejercicio?.peso_sugerido || '',
      notas: ejercicio?.notas || '',
    };
  }

  function normalizarDias(diasCrudos) {
    const dias = parsearJsonSeguro(diasCrudos, {});
    const claves = Object.keys(dias);
    if (!claves.length) {
      const resultado = {};
      for (let i = 1; i <= 5; i += 1) {
        resultado[`dia${i}`] = { nombre: `Dia ${i}`, ejercicios: [] };
      }
      return resultado;
    }
    const resultado = {};
    claves.forEach((clave) => {
      const dia = dias[clave] || {};
      const ejercicios = Array.isArray(dia?.ejercicios) ? dia.ejercicios : [];
      resultado[clave] = {
        nombre: dia?.nombre || clave,
        ejercicios: ejercicios.map(normalizarEjercicio),
      };
    });
    return resultado;
  }

  function normalizarHistorial(historialCrudo) {
    const historial = Array.isArray(historialCrudo)
      ? historialCrudo
      : Array.isArray(historialCrudo?.items)
        ? historialCrudo.items
        : [];
    return historial.slice(0, 10).map((item) => {
      const ejercicios = parsearJsonSeguro(item?.ejercicios_completados, []);
      return {
        fecha: String(item?.fecha || '').slice(0, 10) || '-',
        dia: item?.dia || '-',
        completados: Array.isArray(ejercicios) ? `${ejercicios.length}` : '-',
        notas: item?.notas_sesion || '-',
      };
    });
  }

  function construirRutinaDesdeApi(data) {
    const fuenteRutina = data?.rutina || data?.rutina_activa || data?.data?.rutina || data;
    const perfil = data?.perfil || data?.socio_perfil || data?.socio || fuenteRutina?.perfil || {};
    const historial = data?.historial || data?.progreso || data?.sesiones || [];

    if (!fuenteRutina || !fuenteRutina.id) {
      return { rutina: null, historial: normalizarHistorial(historial) };
    }
    return {
      rutina: {
        id: fuenteRutina.id,
        nombre_rutina: fuenteRutina.nombre_rutina || 'Rutina activa',
        fecha_inicio: fuenteRutina.fecha_inicio || new Date().toISOString(),
        perfil: {
          objetivo: perfil?.objetivo || 'Sin objetivo definido',
          peso_kg: perfil?.peso_kg || '-',
          estatura_cm: perfil?.estatura_cm || '-',
          frecuencia_semanal: perfil?.frecuencia_semanal || '-',
        },
        dias: normalizarDias(fuenteRutina.dias),
      },
      historial: normalizarHistorial(historial),
    };
  }

  function obtenerRutinaRenderizable() {
    return rutinaActual || rutinaDemo;
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  function renderCards() {
    const rutina = obtenerRutinaRenderizable();
    const numDias = diasDesde(rutina.fecha_inicio);
    const cards = [
      ['\uD83C\uDFAF Objetivo', rutina.perfil.objetivo],
      ['\u2696\uFE0F Peso actual', `${rutina.perfil.peso_kg} kg`],
      ['\uD83D\uDCCF Estatura', `${rutina.perfil.estatura_cm} cm`],
      ['\uD83D\uDCC5 Frecuencia', `${rutina.perfil.frecuencia_semanal} dias/semana`],
      ['\u23F1\uFE0F Dias de rutina', `Dia ${numDias} de 30`],
    ];
    quickCards.innerHTML = cards
      .map(
        ([titulo, valor]) => `
        <article class="card quick-card">
          <p class="quick-title">${titulo}</p>
          <p class="quick-value">${valor}</p>
        </article>
      `
      )
      .join('');
    diasRutina.textContent = `Dia ${numDias} de 30`;
    alertaRutina.classList.toggle('hidden', numDias <= 28);

    // ── Barra de progreso ────────────────────────────────────────────────
    if (progresoFill && progresoLabel) {
      const pct = Math.min(100, Math.round((numDias / 30) * 100));
      progresoFill.style.width = `${pct}%`;
      progresoFill.classList.toggle('vencida', numDias > 28);
      progresoLabel.textContent = `Dia ${numDias} de 30`;
    }
  }

  function renderTabs() {
    const rutina = obtenerRutinaRenderizable();
    tabsDias.innerHTML = Object.keys(rutina.dias)
      .map((diaKey, index) => {
        const activa = diaKey === diaActivo ? 'active' : '';
        return `<button type="button" class="tab ${activa}" data-dia="${diaKey}">Dia ${index + 1}</button>`;
      })
      .join('');
    tabsDias.querySelectorAll('.tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        diaActivo = tab.dataset.dia;
        renderTabs();
        renderEjercicios();
      });
    });
  }

  function renderEjercicios() {
    const rutina = obtenerRutinaRenderizable();
    const datosDia = rutina.dias[diaActivo];
    const ejercicios = datosDia?.ejercicios || [];

    nombreDia.textContent = datosDia?.nombre || 'Dia de entrenamiento';

    if (!ejercicios.length) {
      listaEjercicios.innerHTML =
        '<article class="card" style="padding:12px;">No hay ejercicios cargados para este dia.</article>';
      return;
    }

    listaEjercicios.innerHTML = ejercicios
      .map(
        (ej) => `
        <article class="card exercise" data-id="${ej.id}">
          <div class="exercise-top">
            <h3 class="exercise-name">${ej.nombre}</h3>
          </div>
          <div class="exercise-meta">
            <span class="chip">${ej.series} series</span>
            <span class="chip">${ej.repeticiones} reps</span>
            ${ej.peso_sugerido ? `<span class="chip">&#x1F3CB;&#xFE0F; ${ej.peso_sugerido}</span>` : ''}
          </div>
          ${ej.notas ? `<div class="muted" style="font-size:12px;padding:6px;background:rgba(255,255,255,0.05);border-radius:4px;margin:6px 0;">💬 <strong>Coach:</strong> ${ej.notas}</div>` : ''}
          <div class="exercise-actions">
            <input type="checkbox" class="check-large" aria-label="Completar ejercicio" />
            <input type="text" class="input-field" placeholder="Peso usado..." style="max-width:180px;" />
          </div>
        </article>
      `
      )
      .join('');

    listaEjercicios.querySelectorAll('.exercise').forEach((card) => {
      const check = card.querySelector('.check-large');
      check.addEventListener('change', () => {
        card.classList.toggle('done', check.checked);
      });
    });
  }

  function renderHistorial() {
    const filas =
      historialActual.length > 0
        ? historialActual
        : esSesionDemo
          ? [
              { fecha: '2026-04-19', dia: 'dia1', completados: '2', notas: 'Buen bombeo de pecho' },
              { fecha: '2026-04-17', dia: 'dia2', completados: '2', notas: 'Aumente 5lb en jalon' },
              { fecha: '2026-04-15', dia: 'dia1', completados: '1', notas: 'Falto un ejercicio' },
            ]
          : [];
    tablaHistorial.innerHTML = filas.length
      ? filas
          .map(
            (item) =>
              `<tr><td>${item.fecha}</td><td>${item.dia}</td><td>${item.completados}</td><td>${item.notas}</td></tr>`
          )
          .join('')
      : '<tr><td colspan="4">Sin historial disponible</td></tr>';

    // ── Indicador de asistencia semanal ──────────────────────────────────
    if (asistenciaSemanal) {
      const dias = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
      // Obtener dias de esta semana (lunes=0 a domingo=6)
      const hoy = new Date();
      const lunesActual = new Date(hoy);
      const dayOfWeek = (hoy.getDay() + 6) % 7; // lunes = 0
      lunesActual.setDate(hoy.getDate() - dayOfWeek);

      const fechasSemana = dias.map((_, i) => {
        const d = new Date(lunesActual);
        d.setDate(lunesActual.getDate() + i);
        return d.toISOString().slice(0, 10);
      });

      // Fechas con sesion en historial
      const fechasConSesion = new Set(filas.map((item) => String(item.fecha).slice(0, 10)));

      asistenciaSemanal.innerHTML = dias
        .map((nombre, i) => {
          const tiene = fechasConSesion.has(fechasSemana[i]);
          return `
            <div class="asistencia-dia">
              <div class="asistencia-circulo ${tiene ? 'presente' : ''}">
                ${tiene ? '&#x2713;' : ''}
              </div>
              ${nombre}
            </div>`;
        })
        .join('');
    }
  }

  function renderSinRutina() {
    quickCards.innerHTML = '';
    tabsDias.innerHTML = '';
    nombreDia.textContent = '';
    tituloRutina.textContent = 'Sin rutina asignada';
    diasRutina.textContent = 'Pendiente';
    alertaRutina.classList.add('hidden');
    btnGuardar.disabled = true;
    notasSesion.disabled = true;
    listaEjercicios.innerHTML = `
      <article class="card" style="padding:24px;text-align:center;">
        <div style="font-size:40px;margin-bottom:8px;">&#x1F4CB;</div>
        <h3 style="margin:0 0 8px 0;">Tu coach aun no ha asignado una rutina</h3>
        <p class="muted" style="margin:0;line-height:1.6;">Pronto comenzamos.</p>
      </article>
    `;
    tablaHistorial.innerHTML = '<tr><td colspan="4">Sin historial disponible</td></tr>';
  }

  function renderTituloRutina() {
    const rutina = obtenerRutinaRenderizable();
    tituloRutina.textContent = `${rutina.nombre_rutina} - Inicio ${String(rutina.fecha_inicio).slice(0, 10)}`;
    btnGuardar.disabled = false;
    notasSesion.disabled = false;
  }

  function renderTodo() {
    if (!rutinaActual && !esSesionDemo) {
      renderSinRutina();
      return;
    }
    renderTituloRutina();
    renderCards();
    renderTabs();
    renderEjercicios();
    renderHistorial();
  }

  // ── Carga de datos ─────────────────────────────────────────────────────────
  async function cargarRutinaReal() {
    try {
      const respuesta = await window.BEFIT_API.getRutina(usuario.id);
      const normalizado = construirRutinaDesdeApi(respuesta?.data || respuesta);
      rutinaActual = normalizado.rutina;
      historialActual = normalizado.historial;
    } catch {
      rutinaActual = null;
      historialActual = [];
      if (!esSesionDemo) mostrarToast('toastError');
    }
  }

  async function recargarHistorial() {
    try {
      const respuesta = await window.BEFIT_API.getRutina(usuario.id);
      const normalizado = construirRutinaDesdeApi(respuesta?.data || respuesta);
      historialActual = normalizado.historial;
      renderHistorial();
    } catch {
      // historial no critico
    }
  }

  // ── Guardar sesion ─────────────────────────────────────────────────────────
  btnGuardar.addEventListener('click', async () => {
    const rutina = obtenerRutinaRenderizable();
    if (!rutina?.id) return;

    const checks = Array.from(listaEjercicios.querySelectorAll('.exercise')).map((card) => {
      const id = card.dataset.id;
      const done = card.querySelector('.check-large')?.checked;
      const peso = card.querySelector('input[type="text"]')?.value?.trim() || '';
      return { id, done, peso };
    });

    const completados = checks.filter((item) => item.done).map((item) => item.id);
    const pesos = checks.reduce((acc, item) => {
      if (item.peso) acc[item.id] = item.peso;
      return acc;
    }, {});

    try {
      await window.BEFIT_API.updateProgreso({
        usuario_id: usuario.id,
        rutina_id: rutina.id,
        dia: diaActivo,
        ejercicios_completados: completados,
        pesos_registrados: pesos,
        notas_sesion: notasSesion.value.trim(),
      });
      mostrarToast('toastOk');
      notasSesion.value = '';
      if (!esSesionDemo) recargarHistorial();
    } catch {
      mostrarToast('toastError');
    }
  });

  // ── Cambio de contrasena ───────────────────────────────────────────────────
  if (formCambioPass) {
    formCambioPass.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nueva = document.getElementById('passNueva').value;
      const confirmada = document.getElementById('passConfirmar').value;
      const errEl = document.getElementById('passError');

      if (!nueva || nueva.length < 6) {
        errEl.textContent = 'La contrasena debe tener al menos 6 caracteres.';
        return;
      }
      if (nueva !== confirmada) {
        errEl.textContent = 'Las contrasenas no coinciden.';
        return;
      }

      errEl.textContent = '';
      const btn = formCambioPass.querySelector('button[type="submit"]');
      btn.disabled = true;

      try {
        await window.BEFIT_API.updateUsuario({
          usuario_id: usuario.id,
          campo: 'password',
          valor: nueva,
        });
        errEl.style.color = '#4ade80';
        errEl.textContent = 'Contrasena actualizada correctamente.';
        formCambioPass.reset();
        setTimeout(() => { errEl.textContent = ''; errEl.style.color = ''; }, 4000);
      } catch {
        errEl.style.color = 'var(--error)';
        errEl.textContent = 'Error al actualizar la contrasena.';
      } finally {
        btn.disabled = false;
      }
    });
  }

  cargarRutinaReal().finally(renderTodo);
})();
