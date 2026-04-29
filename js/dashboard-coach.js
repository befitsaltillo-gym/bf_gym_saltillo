// ── Dashboard Coach ───────────────────────────────────────────────────────────

(function iniciarDashboardCoach() {
  const usuario = window.BEFIT_AUTH.protegerRuta(['coach', 'admin']);
  if (!usuario) return;

  window.BEFIT_AUTH.enlazarCerrarSesion('#btnLogout');
  document.getElementById('nombreCoach').textContent =
    usuario.nombre_completo || usuario.username || 'Coach';

  const esSesionDemo = String(usuario.username || '').startsWith('demo.');

  const filtro = document.getElementById('filtroSocio');
  const lista = document.getElementById('listaSocios');
  const detalle = document.getElementById('detalleSocio');

  // ── Demo fallback ────────────────────────────────────────────────────────
  const sociosDemo = [
    {
      id: 'demo-1', numero_socio: 'BF-001', nombre: 'Pedro Reyes',
      objetivo: 'Ganancia muscular', dias: 17, estado: 'Rutina activa',
      perfil: { edad: 28, peso_kg: 80, estatura_cm: 178, objetivo: 'Ganancia muscular',
        lesiones: 'Ninguna', contraindicaciones: 'Ninguna', frecuencia_semanal: 4 },
      rutina: { id: 'r-1', nombre_rutina: 'Fuerza Mes 1',
        fecha_inicio: new Date(Date.now() - 17 * 86400000).toISOString().slice(0, 10),
        observaciones: '', dias: {} },
    },
    {
      id: 'demo-2', numero_socio: 'BF-002', nombre: 'Sofia Lara',
      objetivo: 'Perdida de grasa', dias: 31, estado: 'Rutina vencida',
      perfil: { edad: 25, peso_kg: 62, estatura_cm: 165, objetivo: 'Perdida de grasa',
        lesiones: 'Rodilla derecha', contraindicaciones: 'Ninguna', frecuencia_semanal: 3 },
      rutina: { id: 'r-2', nombre_rutina: 'Cardio + Fuerza',
        fecha_inicio: new Date(Date.now() - 31 * 86400000).toISOString().slice(0, 10),
        observaciones: '', dias: {} },
    },
    {
      id: 'demo-3', numero_socio: 'BF-003', nombre: 'Luis Cantu',
      objetivo: 'Resistencia', dias: 0, estado: 'Sin rutina',
      perfil: { edad: 32, peso_kg: 75, estatura_cm: 172, objetivo: 'Resistencia',
        lesiones: 'Ninguna', contraindicaciones: 'Ninguna', frecuencia_semanal: 5 },
      rutina: { id: '', nombre_rutina: 'Sin rutina activa', fecha_inicio: '', observaciones: '', dias: {} },
    },
  ];

  let sociosActuales = [];
  let plantillasActuales = [];
  let plantillaACargar = null;

  // ── Helpers ──────────────────────────────────────────────────────────────
  function parsearJsonSeguro(valor, fallback) {
    if (valor == null) return fallback;
    if (typeof valor === 'object') return valor;
    try { return JSON.parse(valor); } catch { return fallback; }
  }

  function diasDesde(fechaIso) {
    if (!fechaIso) return 0;
    const inicio = new Date(fechaIso).getTime();
    if (Number.isNaN(inicio)) return 0;
    return Math.max(1, Math.floor((Date.now() - inicio) / 86400000) + 1);
  }

  function mostrarMensaje(el, texto, esError = false) {
    el.textContent = texto;
    el.style.color = esError ? 'var(--error)' : '#4ade80';
    setTimeout(() => { el.textContent = ''; }, 4000);
  }

  // ── Normalizacion ─────────────────────────────────────────────────────────
  function normalizarSocio(item) {
    const perfil = item?.perfil || item?.socio_perfil || {};
    const rutina = item?.rutina || item?.rutina_activa || {};
    const diasRutina = diasDesde(rutina?.fecha_inicio);
    const tieneRutina = Boolean(rutina?.id || rutina?.fecha_inicio || rutina?.nombre_rutina);
    const estado = !tieneRutina ? 'Sin rutina' : diasRutina > 28 ? 'Rutina vencida' : 'Rutina activa';

    return {
      id: item?.id || item?.usuario_id || item?.usuario?.id || '',
      rol: item?.rol || item?.usuario?.rol || '',
      numero_socio: item?.numero_socio || item?.usuario?.numero_socio || 'BF-000',
      nombre: item?.nombre_completo || item?.usuario?.nombre_completo || item?.nombre || 'Socio',
      objetivo: perfil?.objetivo || 'Sin objetivo',
      dias: tieneRutina ? diasRutina : 0,
      estado,
      perfil: {
        edad: perfil?.edad || '',
        peso_kg: perfil?.peso_kg || '',
        estatura_cm: perfil?.estatura_cm || '',
        objetivo: perfil?.objetivo || '',
        lesiones: perfil?.lesiones || 'Ninguna',
        contraindicaciones: perfil?.contraindicaciones || 'Ninguna',
        frecuencia_semanal: perfil?.frecuencia_semanal || '',
      },
      rutina: {
        id: rutina?.id || '',
        nombre_rutina: rutina?.nombre_rutina || 'Sin rutina activa',
        fecha_inicio: String(rutina?.fecha_inicio || '').slice(0, 10),
        observaciones: rutina?.observaciones || '',
        dias: parsearJsonSeguro(rutina?.dias, {}),
      },
    };
  }

  // ── Carga socios ─────────────────────────────────────────────────────────
  async function cargarSocios() {
    try {
      const respuesta = await window.BEFIT_API.getSocios();
      const data = respuesta?.data;
      const items = Array.isArray(data)
        ? data
        : Array.isArray(data?.socios) ? data.socios : [];
      sociosActuales = items.map(normalizarSocio).filter((s) => s.rol === 'socio' || s.rol === '');
    } catch {
      sociosActuales = esSesionDemo ? sociosDemo : [];
    }
  }

  // ── Lista de socios ───────────────────────────────────────────────────────
  function pintar(items) {
    if (!items.length) {
      lista.innerHTML = '<article class="card" style="padding:12px;">No hay socios disponibles.</article>';
      detalle.innerHTML = 'Selecciona un socio para comenzar.';
      return;
    }

    lista.innerHTML = items
      .map((s) => {
        const badge = s.estado === 'Rutina activa' ? 'badge-green'
          : s.estado === 'Rutina vencida' ? 'badge-red' : 'badge-gray';
        return `
          <article class="card" style="padding:12px;display:grid;gap:8px;">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
              <strong>${s.numero_socio} – ${s.nombre}</strong>
              <span class="${badge}">${s.estado}</span>
            </div>
            <div class="muted" style="font-size:12px;">Objetivo: ${s.objetivo}</div>
            <div class="muted" style="font-size:12px;">Dias con rutina: ${s.dias}</div>
            <button type="button" class="btn-red" data-socio="${s.numero_socio}">Ver / Editar rutina</button>
          </article>
        `;
      })
      .join('');

    lista.querySelectorAll('button[data-socio]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const socio = sociosActuales.find((s) => s.numero_socio === btn.dataset.socio);
        if (socio) mostrarDetalle(socio);
      });
    });
  }

  // ── Panel detalle ─────────────────────────────────────────────────────────
  function mostrarDetalle(socio) {
    let tabActiva = 'perfil';

    function renderTabs() {
      return `
        <div style="display:flex;gap:8px;margin-bottom:16px;overflow-x:auto;padding-bottom:4px;">
          <button type="button" class="tab ${tabActiva === 'perfil' ? 'active' : ''}" data-tab="perfil">Perfil</button>
          <button type="button" class="tab ${tabActiva === 'rutina' ? 'active' : ''}" data-tab="rutina">Rutina</button>
          <button type="button" class="tab ${tabActiva === 'historial' ? 'active' : ''}" data-tab="historial">Historial</button>
        </div>`;
    }

    function enlazarTabs() {
      detalle.querySelectorAll('.tab[data-tab]').forEach((t) => {
        t.addEventListener('click', () => {
          tabActiva = t.dataset.tab;
          renderActiva();
        });
      });
    }

    function renderActiva() {
      if (tabActiva === 'perfil') renderPerfil();
      else if (tabActiva === 'rutina') renderRutina();
      else renderHistorial();
    }

    // ── TAB PERFIL EDITABLE ────────────────────────────────────────────────
    function renderPerfil() {
      const p = socio.perfil;
      detalle.innerHTML = `
        <h3 style="margin:0 0 4px 0;">${socio.nombre}</h3>
        <p class="muted" style="margin:0 0 12px 0;">${socio.numero_socio}</p>
        ${renderTabs()}
        <form id="formPerfil" style="display:grid;gap:10px;">
          <div class="perfil-row">
            <div class="field">
              <label>Edad</label>
              <input id="pf_edad" class="input-field" type="number" value="${p.edad}" min="10" max="100" />
            </div>
            <div class="field">
              <label>Peso (kg)</label>
              <input id="pf_peso" class="input-field" type="number" value="${p.peso_kg}" />
            </div>
            <div class="field">
              <label>Estatura (cm)</label>
              <input id="pf_estatura" class="input-field" type="number" value="${p.estatura_cm}" />
            </div>
            <div class="field">
              <label>Frecuencia semanal</label>
              <input id="pf_frecuencia" class="input-field" type="number" value="${p.frecuencia_semanal}" min="1" max="7" />
            </div>
          </div>
          <div class="field">
            <label>Objetivo</label>
            <input id="pf_objetivo" class="input-field" type="text" value="${p.objetivo}" />
          </div>
          <div class="field">
            <label>Lesiones</label>
            <input id="pf_lesiones" class="input-field" type="text" value="${p.lesiones}" />
          </div>
          <div class="field">
            <label>Contraindicaciones</label>
            <input id="pf_contraindicaciones" class="input-field" type="text" value="${p.contraindicaciones}" />
          </div>
          <div id="msgPerfil" style="min-height:18px;font-size:12px;"></div>
          <button type="submit" class="btn-red">Guardar cambios</button>
        </form>
      `;
      enlazarTabs();
      detalle.querySelector('#formPerfil').addEventListener('submit', async (e) => {
        e.preventDefault();
        const msg = detalle.querySelector('#msgPerfil');
        const payload = {
          usuario_id: socio.id,
          edad: detalle.querySelector('#pf_edad').value,
          peso_kg: detalle.querySelector('#pf_peso').value,
          estatura_cm: detalle.querySelector('#pf_estatura').value,
          frecuencia_semanal: detalle.querySelector('#pf_frecuencia').value,
          objetivo: detalle.querySelector('#pf_objetivo').value.trim(),
          lesiones: detalle.querySelector('#pf_lesiones').value.trim(),
          contraindicaciones: detalle.querySelector('#pf_contraindicaciones').value.trim(),
        };
        try {
          await window.BEFIT_API.updatePerfil(payload);
          // Actualizar datos locales
          Object.assign(socio.perfil, {
            edad: payload.edad,
            peso_kg: payload.peso_kg,
            estatura_cm: payload.estatura_cm,
            frecuencia_semanal: payload.frecuencia_semanal,
            objetivo: payload.objetivo,
            lesiones: payload.lesiones,
            contraindicaciones: payload.contraindicaciones,
          });
          socio.objetivo = payload.objetivo;
          pintar(sociosActuales);
          mostrarMensaje(msg, 'Perfil actualizado correctamente.');
        } catch {
          mostrarMensaje(msg, 'Error al guardar el perfil.', true);
        }
      });
    }

    // ── TAB RUTINA EDITABLE ────────────────────────────────────────────────
    function buildDiasState() {
      const fuente = plantillaACargar || socio.rutina;
      const diasExistentes = fuente?.dias || {};
      const claves = Object.keys(diasExistentes);
      if (claves.length > 0) {
        return claves.map((clave) => {
          const dia = diasExistentes[clave] || {};
          return {
            nombre: dia.nombre || '',
            ejercicios: Array.isArray(dia.ejercicios)
              ? dia.ejercicios.map((ej) => ({
                  nombre: ej.nombre || '',
                  series: ej.series || '',
                  repeticiones: ej.repeticiones || '',
                  descanso: ej.descanso || '',
                  peso_sugerido: ej.peso_sugerido || '',
                  notas: ej.notas || '',
                }))
              : [{ nombre: '', series: '', repeticiones: '', descanso: '', peso_sugerido: '', notas: '' }],
          };
        });
      }
      return [{ nombre: '', ejercicios: [{ nombre: '', series: '', repeticiones: '', descanso: '', peso_sugerido: '', notas: '' }] }];
    }

    function htmlEjercicio(ej) {
      return `
        <div class="ejercicio-row" draggable="true"
             style="border:1px solid var(--border);border-radius:8px;padding:8px;margin-bottom:6px;display:grid;gap:6px;">
          <div style="display:flex;align-items:center;gap:6px;">
            <span class="drag-handle" title="Arrastrar">&#x2630;</span>
            <input class="input-field ej-nombre" type="text" placeholder="Nombre del ejercicio" value="${ej.nombre}" style="flex:1;" />
            <button type="button" class="btn-xs danger btn-rm-ej" title="Quitar">&#x2715;</button>
          </div>
          <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:5px;">
            <input class="input-field ej-series" type="text" placeholder="Series" value="${ej.series}" style="font-size:11px;min-height:36px;padding:6px 8px;" />
            <input class="input-field ej-reps" type="text" placeholder="Reps" value="${ej.repeticiones}" style="font-size:11px;min-height:36px;padding:6px 8px;" />
          </div>
          <input class="ej-descanso" type="hidden" value="${ej.descanso || ''}" />
          <input class="ej-peso" type="hidden" value="${ej.peso_sugerido || ''}" />
          <input class="input-field ej-notas" type="text" placeholder="Notas del coach (opcional)" value="${ej.notas || ''}" style="font-size:11px;min-height:36px;padding:6px 8px;" />
        </div>`;
    }

    function htmlDia(diaIndex, dia) {
      return `
        <div class="dia-bloque accordion-item open" data-dia="${diaIndex}"
             style="margin-bottom:10px;">
          <div class="accordion-header">
            <input class="input-field dia-nombre" type="text" placeholder="Nombre del dia"
                   value="${dia.nombre}" style="flex:1;background:transparent;border:none;padding:0;font-weight:700;" />
            <span class="accordion-chevron">&#x25BC;</span>
          </div>
          <div class="accordion-body">
            <div class="lista-ejercicios" style="margin-bottom:8px;">
              ${dia.ejercicios.map(htmlEjercicio).join('')}
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button type="button" class="btn-ghost btn-add-ej" style="font-size:11px;">+ Ejercicio</button>
              <button type="button" class="btn-xs danger btn-rm-dia" style="">&#x1F5D1; Eliminar dia</button>
            </div>
          </div>
        </div>`;
    }

    function renderRutina() {
      const dias = buildDiasState();
      const nombreRutinaVal = plantillaACargar
        ? plantillaACargar.nombre_rutina || ''
        : (socio.rutina.nombre_rutina !== 'Sin rutina activa' ? socio.rutina.nombre_rutina : '');
      detalle.innerHTML = `
        <h3 style="margin:0 0 4px 0;">${socio.nombre}</h3>
        <p class="muted" style="margin:0 0 12px 0;">${socio.numero_socio}</p>
        ${renderTabs()}
        <div style="display:flex;gap:8px;margin-bottom:6px;">
          <input id="inputNombreRutina" class="input-field" type="text" placeholder="Nombre de la rutina"
                 value="${nombreRutinaVal}" style="flex:1;" />
          <button type="button" id="btnCargarPlantilla" class="btn-ghost"
                  style="font-size:11px;white-space:nowrap;">&#x1F4CB; Plantilla</button>
        </div>
        <div style="display:grid;gap:10px;margin-bottom:14px;">
          <input id="inputFechaInicio" class="input-field" type="date"
                 value="${socio.rutina.fecha_inicio || new Date().toISOString().slice(0, 10)}" />
          <textarea id="inputObservaciones" class="input-field" rows="2"
                    placeholder="Observaciones del coach...">${socio.rutina.observaciones || ''}</textarea>
        </div>
        <div id="contenedorDias">${dias.map((dia, i) => htmlDia(i, dia)).join('')}</div>
        <button type="button" id="btnAddDia" class="btn-ghost" style="margin-bottom:14px;font-size:12px;">+ Agregar dia</button>
        <div id="msgRutina" style="min-height:18px;font-size:12px;margin-bottom:8px;"></div>
        <button type="button" id="btnGuardarRutina" class="btn-red" style="width:100%;">Guardar rutina</button>
      `;
      enlazarTabs();
      enlazarAccordions();
      enlazarFormRutina();
      enlazarDragDrop(detalle.querySelector('#contenedorDias'));
    }

    function enlazarAccordions() {
      detalle.querySelectorAll('.accordion-header').forEach((header) => {
        header.querySelector('.accordion-chevron').addEventListener('click', () => {
          header.closest('.accordion-item').classList.toggle('open');
        });
      });
    }

    function agregarEjercicio(diaBloque) {
      const listaEl = diaBloque.querySelector('.lista-ejercicios');
      const div = document.createElement('div');
      div.innerHTML = htmlEjercicio({ nombre: '', series: '', repeticiones: '', descanso: '' });
      const row = div.firstElementChild;
      listaEl.appendChild(row);
      enlazarQuitarEjercicio(row);
      enlazarDragDropRow(row, listaEl);
    }

    function enlazarQuitarEjercicio(row) {
      row.querySelector('.btn-rm-ej').addEventListener('click', () => row.remove());
    }

    function enlazarQuitarDia(bloque) {
      bloque.querySelector('.btn-rm-dia').addEventListener('click', () => bloque.remove());
    }

    function enlazarAgregarEjercicio(bloque) {
      bloque.querySelector('.btn-add-ej').addEventListener('click', () => agregarEjercicio(bloque));
    }

    // ── Drag & Drop de ejercicios ──────────────────────────────────────────
    let dragSrc = null;

    function enlazarDragDropRow(row, container) {
      row.addEventListener('dragstart', (e) => {
        dragSrc = row;
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => row.classList.add('dragging'), 0);
      });
      row.addEventListener('dragend', () => {
        row.classList.remove('dragging');
        container.querySelectorAll('.ejercicio-row').forEach((r) => r.classList.remove('drag-over'));
        dragSrc = null;
      });
      row.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (dragSrc && dragSrc !== row) {
          container.querySelectorAll('.ejercicio-row').forEach((r) => r.classList.remove('drag-over'));
          row.classList.add('drag-over');
        }
      });
      row.addEventListener('drop', (e) => {
        e.preventDefault();
        if (dragSrc && dragSrc !== row) {
          const rows = [...container.querySelectorAll('.ejercicio-row')];
          const srcIdx = rows.indexOf(dragSrc);
          const tgtIdx = rows.indexOf(row);
          if (srcIdx < tgtIdx) row.after(dragSrc);
          else row.before(dragSrc);
          row.classList.remove('drag-over');
        }
      });
    }

    function enlazarDragDrop(contenedor) {
      contenedor.querySelectorAll('.dia-bloque').forEach((bloque) => {
        const listaEl = bloque.querySelector('.lista-ejercicios');
        bloque.querySelectorAll('.ejercicio-row').forEach((row) => enlazarDragDropRow(row, listaEl));
      });
    }

    function enlazarFormRutina() {
      const contenedor = detalle.querySelector('#contenedorDias');

      detalle.querySelector('#btnCargarPlantilla').addEventListener('click', () => {
        abrirSelectorPlantilla((plantillaSeleccionada) => {
          plantillaACargar = plantillaSeleccionada;
          renderRutina();
        });
      });

      contenedor.querySelectorAll('.dia-bloque').forEach((bloque) => {
        enlazarQuitarDia(bloque);
        enlazarAgregarEjercicio(bloque);
        bloque.querySelectorAll('.ejercicio-row').forEach((row) => enlazarQuitarEjercicio(row));
      });

      detalle.querySelector('#btnAddDia').addEventListener('click', () => {
        const diaIndex = contenedor.querySelectorAll('.dia-bloque').length;
        const div = document.createElement('div');
        div.innerHTML = htmlDia(diaIndex, {
          nombre: '',
          ejercicios: [{ nombre: '', series: '', repeticiones: '', descanso: '', peso_sugerido: '', notas: '' }],
        });
        const bloque = div.firstElementChild;
        contenedor.appendChild(bloque);
        enlazarAccordions();
        enlazarQuitarDia(bloque);
        enlazarAgregarEjercicio(bloque);
        bloque.querySelectorAll('.ejercicio-row').forEach((row) => {
          enlazarQuitarEjercicio(row);
          const listaEl = bloque.querySelector('.lista-ejercicios');
          enlazarDragDropRow(row, listaEl);
        });
      });

      detalle.querySelector('#btnGuardarRutina').addEventListener('click', async () => {
        const msg = detalle.querySelector('#msgRutina');
        const nombreRutina = detalle.querySelector('#inputNombreRutina').value.trim();
        const fechaInicio = detalle.querySelector('#inputFechaInicio').value.trim();
        const observaciones = detalle.querySelector('#inputObservaciones').value.trim();

        if (!nombreRutina) {
          mostrarMensaje(msg, 'El nombre de la rutina es obligatorio.', true);
          return;
        }

        const diasObj = {};
        contenedor.querySelectorAll('.dia-bloque').forEach((bloque, i) => {
          const clave = `dia${i + 1}`;
          const nombreDia = bloque.querySelector('.dia-nombre').value.trim() || `Dia ${i + 1}`;
          const ejercicios = [];
          bloque.querySelectorAll('.ejercicio-row').forEach((row) => {
            const nombre = row.querySelector('.ej-nombre').value.trim();
            if (!nombre) return;
            ejercicios.push({
              nombre,
              series: row.querySelector('.ej-series').value.trim() || '-',
              repeticiones: row.querySelector('.ej-reps').value.trim() || '-',
              descanso: row.querySelector('.ej-descanso').value.trim() || '-',
              peso_sugerido: row.querySelector('.ej-peso').value.trim(),
              notas: row.querySelector('.ej-notas').value.trim(),
            });
          });
          diasObj[clave] = { nombre: nombreDia, ejercicios };
        });

        detalle.querySelector('#btnGuardarRutina').disabled = true;
        mostrarMensaje(msg, 'Guardando...', false);

        try {
          await window.BEFIT_API.saveRutina({
            usuario_id: socio.id,
            nombre_rutina: nombreRutina,
            fecha_inicio: fechaInicio,
            observaciones,
            dias: diasObj,
            activa: true,
          });
          // Actualizar estado local
          socio.rutina.nombre_rutina = nombreRutina;
          socio.rutina.fecha_inicio = fechaInicio;
          socio.rutina.observaciones = observaciones;
          socio.rutina.dias = diasObj;
          socio.estado = 'Rutina activa';
          socio.dias = diasDesde(fechaInicio);
          plantillaACargar = null;
          pintar(sociosActuales);
          mostrarMensaje(msg, 'Rutina guardada correctamente.');
        } catch {
          mostrarMensaje(msg, 'Error al guardar la rutina.', true);
        } finally {
          const btn = detalle.querySelector('#btnGuardarRutina');
          if (btn) btn.disabled = false;
        }
      });
    }

    // ── TAB HISTORIAL ──────────────────────────────────────────────────────
    async function renderHistorial() {
      detalle.innerHTML = `
        <h3 style="margin:0 0 4px 0;">${socio.nombre}</h3>
        <p class="muted" style="margin:0 0 12px 0;">${socio.numero_socio}</p>
        ${renderTabs()}
        <div id="listaHistorial">
          <div class="skeleton skeleton-card" style="margin-bottom:8px;"></div>
          <div class="skeleton skeleton-card"></div>
        </div>
      `;
      enlazarTabs();

      try {
        const resp = await window.BEFIT_API.getHistorialRutinas(socio.id);
        const rutinas = Array.isArray(resp?.data) ? resp.data : [];
        const contenedor = detalle.querySelector('#listaHistorial');

        if (!rutinas.length) {
          contenedor.innerHTML = '<p class="muted" style="font-size:13px;">Sin rutinas anteriores registradas.</p>';
          return;
        }

        contenedor.innerHTML = rutinas
          .map((r) => {
            const activa = r.activa ? '<span class="badge-green">Activa</span>' : '<span class="badge-gray">Finalizada</span>';
            return `
              <article class="card" style="padding:12px;margin-bottom:8px;display:grid;gap:6px;">
                <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
                  <strong style="font-size:13px;">${r.nombre_rutina || 'Rutina'}</strong>
                  ${activa}
                </div>
                <div class="muted" style="font-size:11px;">
                  Inicio: ${String(r.fecha_inicio || '').slice(0, 10) || '-'} &nbsp;|&nbsp;
                  Fin: ${String(r.fecha_fin || '').slice(0, 10) || '-'}
                </div>
                ${r.observaciones ? `<div class="muted" style="font-size:11px;">${r.observaciones}</div>` : ''}
              </article>`;
          })
          .join('');
      } catch {
        const contenedor = detalle.querySelector('#listaHistorial');
        if (contenedor) contenedor.innerHTML = '<p class="muted" style="font-size:13px;">No se pudo cargar el historial.</p>';
      }
    }

    // Renderizar primera tab
    renderActiva();
  }

  // ── Filtro en tiempo real ─────────────────────────────────────────────────
  filtro.addEventListener('input', () => {
    const q = filtro.value.trim().toLowerCase();
    const filtrados = sociosActuales.filter(
      (s) => s.nombre.toLowerCase().includes(q) || s.numero_socio.toLowerCase().includes(q)
    );
    pintar(filtrados);
  });

  // ── Modal: Nuevo socio ────────────────────────────────────────────────────
  const modalOverlay = document.getElementById('modalNuevoSocio');
  const btnNuevoSocio = document.getElementById('btnNuevoSocio');
  const btnCerrar = document.getElementById('btnCerrarModalSocio');
  const pasoAcceso = document.getElementById('pasoAcceso');
  const pasoPerfil = document.getElementById('pasoPerfil');
  const step1Indicator = document.getElementById('step1Indicator');
  const step2Indicator = document.getElementById('step2Indicator');

  function abrirModal() {
    // Limpiar campos
    ['ns_nombre', 'ns_username', 'ns_email', 'ns_password', 'ns_numero',
     'ns_edad', 'ns_peso', 'ns_estatura', 'ns_frecuencia',
     'ns_objetivo', 'ns_lesiones', 'ns_contraindicaciones'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    // Auto-generar numero de socio sugerido
    const siguiente = String(sociosActuales.length + 1).padStart(3, '0');
    document.getElementById('ns_numero').value = `BF-${siguiente}`;

    document.getElementById('nsError1').textContent = '';
    document.getElementById('nsError2').textContent = '';
    pasoAcceso.classList.remove('hidden');
    pasoPerfil.classList.add('hidden');
    step1Indicator.classList.add('active');
    step2Indicator.classList.remove('active');
    modalOverlay.classList.remove('hidden');
  }

  function cerrarModal() {
    modalOverlay.classList.add('hidden');
  }

  btnNuevoSocio.addEventListener('click', abrirModal);
  btnCerrar.addEventListener('click', cerrarModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) cerrarModal();
  });

  document.getElementById('btnSiguientePaso').addEventListener('click', () => {
    const nombre = document.getElementById('ns_nombre').value.trim();
    const username = document.getElementById('ns_username').value.trim();
    const password = document.getElementById('ns_password').value.trim();
    const errEl = document.getElementById('nsError1');

    if (!nombre || !username || !password) {
      errEl.textContent = 'Nombre, usuario y contrasena son obligatorios.';
      return;
    }
    errEl.textContent = '';
    pasoAcceso.classList.add('hidden');
    pasoPerfil.classList.remove('hidden');
    step1Indicator.classList.remove('active');
    step2Indicator.classList.add('active');
  });

  document.getElementById('btnAnteriorPaso').addEventListener('click', () => {
    pasoPerfil.classList.add('hidden');
    pasoAcceso.classList.remove('hidden');
    step2Indicator.classList.remove('active');
    step1Indicator.classList.add('active');
  });

  document.getElementById('btnCrearSocio').addEventListener('click', async () => {
    const errEl = document.getElementById('nsError2');
    const btn = document.getElementById('btnCrearSocio');

    const payload = {
      rol_nuevo: 'socio',
      nombre_completo: document.getElementById('ns_nombre').value.trim(),
      username: document.getElementById('ns_username').value.trim().toLowerCase(),
      email: document.getElementById('ns_email').value.trim(),
      password_temporal: document.getElementById('ns_password').value.trim(),
      numero_socio: document.getElementById('ns_numero').value.trim(),
      // Perfil
      edad: document.getElementById('ns_edad').value,
      peso_kg: document.getElementById('ns_peso').value,
      estatura_cm: document.getElementById('ns_estatura').value,
      frecuencia_semanal: document.getElementById('ns_frecuencia').value,
      objetivo: document.getElementById('ns_objetivo').value.trim(),
      lesiones: document.getElementById('ns_lesiones').value.trim() || 'Ninguna',
      contraindicaciones: document.getElementById('ns_contraindicaciones').value.trim() || 'Ninguna',
    };

    if (!payload.nombre_completo || !payload.username || !payload.password_temporal) {
      errEl.textContent = 'Faltan datos del paso 1.';
      return;
    }

    btn.disabled = true;
    errEl.textContent = '';
    errEl.style.color = 'var(--muted)';
    errEl.textContent = 'Creando socio...';

    try {
      await window.BEFIT_API.createUsuario(payload);
      cerrarModal();
      // Recargar lista
      await cargarSocios();
      pintar(sociosActuales);
    } catch (err) {
      errEl.style.color = 'var(--error)';
      errEl.textContent = err.message || 'Error al crear el socio.';
    } finally {
      btn.disabled = false;
    }
  });

  // ── Carga de plantillas ───────────────────────────────────────────────────
  async function cargarPlantillas() {
    try {
      const resp = await window.BEFIT_API.getRutinasPredefinidas();
      plantillasActuales = Array.isArray(resp?.data) ? resp.data : [];
    } catch {
      plantillasActuales = [];
    }
  }

  // ── Lista de plantillas ───────────────────────────────────────────────────
  function pintarPlantillas(items) {
    const listaPlantillas = document.getElementById('listaPlantillas');
    if (!listaPlantillas) return;
    if (!items.length) {
      listaPlantillas.innerHTML = '<article class="card" style="padding:12px;font-size:13px;">Sin plantillas creadas.</article>';
      return;
    }
    listaPlantillas.innerHTML = items
      .map(
        (p) => `
        <article class="card" style="padding:12px;display:grid;gap:6px;">
          <strong style="font-size:13px;">${p.nombre_rutina || 'Sin nombre'}</strong>
          ${p.coach_nombre ? `<div class="muted" style="font-size:11px;">Por: ${p.coach_nombre}</div>` : ''}
          <button type="button" class="btn-ghost" data-plantilla="${p.id}" style="font-size:11px;">Ver / Editar</button>
        </article>
      `,
      )
      .join('');
    listaPlantillas.querySelectorAll('button[data-plantilla]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const p = plantillasActuales.find((x) => x.id === btn.dataset.plantilla);
        if (p) mostrarEditorPlantilla(p);
      });
    });
  }

  // ── Selector de plantilla (modal dinamico) ────────────────────────────────
  function abrirSelectorPlantilla(onSeleccion) {
    const existing = document.getElementById('modalSelectorPlantilla');
    if (existing) existing.remove();

    if (!plantillasActuales.length) {
      // eslint-disable-next-line no-alert
      alert('No hay plantillas disponibles. Primero crea una en la seccion Plantillas.');
      return;
    }

    const overlay = document.createElement('div');
    overlay.id = 'modalSelectorPlantilla';
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-panel" style="max-width:420px;">
        <button class="modal-close" id="btnCerrarSelectorPlantilla" type="button">&#x2715;</button>
        <h2>Seleccionar plantilla</h2>
        <p class="muted" style="font-size:12px;margin:0 0 14px;">La plantilla pre-llenara el formulario. Podras editar antes de guardar.</p>
        <div style="display:grid;gap:8px;max-height:340px;overflow-y:auto;">
          ${plantillasActuales
            .map(
              (p) => `
            <button type="button" class="card" data-pid="${p.id}"
                    style="padding:10px;text-align:left;border:none;cursor:pointer;width:100%;background:var(--card);">
              <div style="font-weight:600;font-size:13px;">${p.nombre_rutina || 'Sin nombre'}</div>
              ${p.coach_nombre ? `<div class="muted" style="font-size:11px;">Por: ${p.coach_nombre}</div>` : ''}
            </button>
          `,
            )
            .join('')}
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    document.getElementById('btnCerrarSelectorPlantilla').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelectorAll('[data-pid]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const p = plantillasActuales.find((x) => x.id === btn.dataset.pid);
        if (p) { overlay.remove(); onSeleccion(p); }
      });
    });
  }

  // ── Editor de plantilla ───────────────────────────────────────────────────
  function mostrarEditorPlantilla(plantillaInicial) {
    let plantilla = plantillaInicial;
    let esNueva = !plantilla?.id;

    function _htmlEjercicio(ej) {
      return `
        <div class="ejercicio-row" draggable="true"
             style="border:1px solid var(--border);border-radius:8px;padding:8px;margin-bottom:6px;display:grid;gap:6px;">
          <div style="display:flex;align-items:center;gap:6px;">
            <span class="drag-handle" title="Arrastrar">&#x2630;</span>
            <input class="input-field ej-nombre" type="text" placeholder="Nombre del ejercicio" value="${ej.nombre}" style="flex:1;" />
            <button type="button" class="btn-xs danger btn-rm-ej" title="Quitar">&#x2715;</button>
          </div>
          <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:5px;">
            <input class="input-field ej-series" type="text" placeholder="Series" value="${ej.series}" style="font-size:11px;min-height:36px;padding:6px 8px;" />
            <input class="input-field ej-reps" type="text" placeholder="Reps" value="${ej.repeticiones}" style="font-size:11px;min-height:36px;padding:6px 8px;" />
          </div>
          <input class="ej-descanso" type="hidden" value="${ej.descanso || ''}" />
          <input class="ej-peso" type="hidden" value="${ej.peso_sugerido || ''}" />
          <input class="input-field ej-notas" type="text" placeholder="Notas (opcional)" value="${ej.notas || ''}" style="font-size:11px;min-height:36px;padding:6px 8px;" />
        </div>`;
    }

    function _htmlDia(diaIndex, dia) {
      return `
        <div class="dia-bloque accordion-item open" data-dia="${diaIndex}"
             style="margin-bottom:10px;">
          <div class="accordion-header">
            <input class="input-field dia-nombre" type="text" placeholder="Nombre del dia"
                   value="${dia.nombre}" style="flex:1;background:transparent;border:none;padding:0;font-weight:700;" />
            <span class="accordion-chevron">&#x25BC;</span>
          </div>
          <div class="accordion-body">
            <div class="lista-ejercicios" style="margin-bottom:8px;">
              ${dia.ejercicios.map(_htmlEjercicio).join('')}
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button type="button" class="btn-ghost btn-add-ej" style="font-size:11px;">+ Ejercicio</button>
              <button type="button" class="btn-xs danger btn-rm-dia">&#x1F5D1; Eliminar dia</button>
            </div>
          </div>
        </div>`;
    }

    const diasArr = plantilla
      ? Object.keys(plantilla.dias || {}).map((clave) => {
          const dia = plantilla.dias[clave];
          return {
            nombre: dia.nombre || '',
            ejercicios: Array.isArray(dia.ejercicios)
              ? dia.ejercicios.map((ej) => ({
                  nombre: ej.nombre || '',
                  series: ej.series || '',
                  repeticiones: ej.repeticiones || '',
                  descanso: ej.descanso || '',
                  peso_sugerido: ej.peso_sugerido || '',
                  notas: ej.notas || '',
                }))
              : [{ nombre: '', series: '', repeticiones: '', descanso: '', peso_sugerido: '', notas: '' }],
          };
        })
      : [{ nombre: '', ejercicios: [{ nombre: '', series: '', repeticiones: '', descanso: '', peso_sugerido: '', notas: '' }] }];

    detalle.innerHTML = `
      <h3 style="margin:0 0 4px 0;">${esNueva ? 'Nueva plantilla' : 'Editar plantilla'}</h3>
      ${!esNueva && plantilla.coach_nombre
        ? `<p class="muted" style="margin:0 0 12px 0;font-size:12px;">Creada por: ${plantilla.coach_nombre}</p>`
        : '<div style="margin-bottom:12px;"></div>'}
      <div style="margin-bottom:14px;">
        <input id="inputNombrePlantilla" class="input-field" type="text" placeholder="Nombre de la plantilla"
               value="${plantilla?.nombre_rutina || ''}" />
      </div>
      <div id="contenedorDiasPlantilla">${diasArr.map((dia, i) => _htmlDia(i, dia)).join('')}</div>
      <button type="button" id="btnAddDiaPlantilla" class="btn-ghost" style="margin-bottom:14px;font-size:12px;">+ Agregar dia</button>
      <div id="msgPlantilla" style="min-height:18px;font-size:12px;margin-bottom:8px;"></div>
      <div style="display:flex;gap:8px;">
        ${!esNueva ? '<button type="button" id="btnEliminarPlantilla" class="btn-ghost" style="color:var(--error);border-color:var(--error);">Eliminar</button>' : ''}
        <button type="button" id="btnGuardarPlantilla" class="btn-red" style="flex:1;">Guardar plantilla</button>
      </div>
    `;

    const cont = detalle.querySelector('#contenedorDiasPlantilla');
    const msg = detalle.querySelector('#msgPlantilla');

    let _dragSrc = null;

    function _enlazarDragDropRow(row, container) {
      row.addEventListener('dragstart', (e) => {
        _dragSrc = row;
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => row.classList.add('dragging'), 0);
      });
      row.addEventListener('dragend', () => {
        row.classList.remove('dragging');
        container.querySelectorAll('.ejercicio-row').forEach((r) => r.classList.remove('drag-over'));
        _dragSrc = null;
      });
      row.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (_dragSrc && _dragSrc !== row) {
          container.querySelectorAll('.ejercicio-row').forEach((r) => r.classList.remove('drag-over'));
          row.classList.add('drag-over');
        }
      });
      row.addEventListener('drop', (e) => {
        e.preventDefault();
        if (_dragSrc && _dragSrc !== row) {
          const rows = [...container.querySelectorAll('.ejercicio-row')];
          const srcIdx = rows.indexOf(_dragSrc);
          const tgtIdx = rows.indexOf(row);
          if (srcIdx < tgtIdx) row.after(_dragSrc);
          else row.before(_dragSrc);
          row.classList.remove('drag-over');
        }
      });
    }

    function _enlazarQuitarEjercicio(row) {
      row.querySelector('.btn-rm-ej').addEventListener('click', () => row.remove());
    }

    function _agregarEjercicio(diaBloque) {
      const listaEl = diaBloque.querySelector('.lista-ejercicios');
      const div = document.createElement('div');
      div.innerHTML = _htmlEjercicio({ nombre: '', series: '', repeticiones: '', descanso: '', peso_sugerido: '', notas: '' });
      const row = div.firstElementChild;
      listaEl.appendChild(row);
      _enlazarQuitarEjercicio(row);
      _enlazarDragDropRow(row, listaEl);
    }

    function _enlazarBloque(bloque) {
      const header = bloque.querySelector('.accordion-header');
      if (header) {
        header.querySelector('.accordion-chevron').addEventListener('click', () => {
          bloque.classList.toggle('open');
        });
      }
      bloque.querySelector('.btn-rm-dia').addEventListener('click', () => bloque.remove());
      bloque.querySelector('.btn-add-ej').addEventListener('click', () => _agregarEjercicio(bloque));
      bloque.querySelectorAll('.ejercicio-row').forEach((row) => {
        _enlazarQuitarEjercicio(row);
        _enlazarDragDropRow(row, bloque.querySelector('.lista-ejercicios'));
      });
    }

    cont.querySelectorAll('.dia-bloque').forEach(_enlazarBloque);

    detalle.querySelector('#btnAddDiaPlantilla').addEventListener('click', () => {
      const idx = cont.querySelectorAll('.dia-bloque').length;
      const div = document.createElement('div');
      div.innerHTML = _htmlDia(idx, {
        nombre: '',
        ejercicios: [{ nombre: '', series: '', repeticiones: '', descanso: '', peso_sugerido: '', notas: '' }],
      });
      const bloque = div.firstElementChild;
      cont.appendChild(bloque);
      _enlazarBloque(bloque);
    });

    function _leerDias() {
      const diasObj = {};
      cont.querySelectorAll('.dia-bloque').forEach((bloque, i) => {
        const clave = `dia${i + 1}`;
        const nombreDia = bloque.querySelector('.dia-nombre').value.trim() || `Dia ${i + 1}`;
        const ejercicios = [];
        bloque.querySelectorAll('.ejercicio-row').forEach((row) => {
          const nombre = row.querySelector('.ej-nombre').value.trim();
          if (!nombre) return;
          ejercicios.push({
            nombre,
            series: row.querySelector('.ej-series').value.trim() || '-',
            repeticiones: row.querySelector('.ej-reps').value.trim() || '-',
            descanso: row.querySelector('.ej-descanso').value.trim() || '-',
            peso_sugerido: row.querySelector('.ej-peso').value.trim(),
            notas: row.querySelector('.ej-notas').value.trim(),
          });
        });
        diasObj[clave] = { nombre: nombreDia, ejercicios };
      });
      return diasObj;
    }

    function _enlazarDeleteBtn() {
      const btnEliminar = detalle.querySelector('#btnEliminarPlantilla');
      if (!btnEliminar) return;
      btnEliminar.addEventListener('click', async () => {
        // eslint-disable-next-line no-alert
        if (!confirm('¿Eliminar esta plantilla? Esta accion no se puede deshacer.')) return;
        btnEliminar.disabled = true;
        try {
          await window.BEFIT_API.deleteRutinaPredefinida(plantilla.id);
          plantillasActuales = plantillasActuales.filter((p) => p.id !== plantilla.id);
          pintarPlantillas(plantillasActuales);
          detalle.innerHTML = '<p class="muted" style="padding:12px;">Plantilla eliminada. Selecciona o crea una nueva.</p>';
        } catch {
          mostrarMensaje(msg, 'Error al eliminar la plantilla.', true);
          btnEliminar.disabled = false;
        }
      });
    }

    if (!esNueva) _enlazarDeleteBtn();

    detalle.querySelector('#btnGuardarPlantilla').addEventListener('click', async () => {
      const nombre = detalle.querySelector('#inputNombrePlantilla').value.trim();
      if (!nombre) {
        mostrarMensaje(msg, 'El nombre de la plantilla es obligatorio.', true);
        return;
      }
      const diasObj = _leerDias();
      const payload = {
        id: plantilla?.id || '',
        nombre_rutina: nombre,
        dias: diasObj,
      };
      const btnGuardar = detalle.querySelector('#btnGuardarPlantilla');
      btnGuardar.disabled = true;
      mostrarMensaje(msg, 'Guardando...', false);
      try {
        const resp = await window.BEFIT_API.saveRutinaPredefinida(payload);
        const saved = resp?.data || {};
        if (esNueva) {
          plantilla = {
            ...payload,
            id: saved.id || String(Date.now()),
            coach_nombre: usuario.nombre_completo || usuario.username || '',
          };
          esNueva = false;
          plantillasActuales.push(plantilla);
          const btnGuardarEl = detalle.querySelector('#btnGuardarPlantilla');
          btnGuardarEl.insertAdjacentHTML(
            'beforebegin',
            '<button type="button" id="btnEliminarPlantilla" class="btn-ghost" style="color:var(--error);border-color:var(--error);">Eliminar</button>',
          );
          _enlazarDeleteBtn();
        } else {
          const idx = plantillasActuales.findIndex((p) => p.id === plantilla.id);
          if (idx > -1) {
            plantillasActuales[idx] = { ...plantillasActuales[idx], nombre_rutina: nombre, dias: diasObj };
            plantilla = plantillasActuales[idx];
          }
        }
        pintarPlantillas(plantillasActuales);
        mostrarMensaje(msg, 'Plantilla guardada correctamente.');
      } catch {
        mostrarMensaje(msg, 'Error al guardar la plantilla.', true);
      } finally {
        btnGuardar.disabled = false;
      }
    });
  }

  // ── Toggle Socios / Plantillas ────────────────────────────────────────────
  const tabSociosBtn = document.getElementById('tabSocios');
  const tabPlantillasBtn = document.getElementById('tabPlantillas');
  const seccionSocios = document.getElementById('seccionSocios');
  const seccionPlantillas = document.getElementById('seccionPlantillas');

  tabSociosBtn.addEventListener('click', () => {
    tabSociosBtn.classList.add('active');
    tabPlantillasBtn.classList.remove('active');
    seccionSocios.classList.remove('hidden');
    seccionPlantillas.classList.add('hidden');
    detalle.innerHTML = 'Selecciona un socio para comenzar.';
  });

  tabPlantillasBtn.addEventListener('click', () => {
    tabPlantillasBtn.classList.add('active');
    tabSociosBtn.classList.remove('active');
    seccionPlantillas.classList.remove('hidden');
    seccionSocios.classList.add('hidden');
    pintarPlantillas(plantillasActuales);
    detalle.innerHTML = '<p class="muted" style="padding:12px;">Selecciona una plantilla o crea una nueva.</p>';
  });

  document.getElementById('btnNuevaPlantilla').addEventListener('click', () => {
    mostrarEditorPlantilla(null);
  });

  document.getElementById('filtroPlantilla').addEventListener('input', () => {
    const q = document.getElementById('filtroPlantilla').value.trim().toLowerCase();
    const filtrados = plantillasActuales.filter((p) => (p.nombre_rutina || '').toLowerCase().includes(q));
    pintarPlantillas(filtrados);
  });

  // ── Init ──────────────────────────────────────────────────────────────────
  cargarSocios().finally(() => {
    if (!sociosActuales.length && esSesionDemo) sociosActuales = sociosDemo;
    pintar(sociosActuales);
  });
  cargarPlantillas();
})();
