/* ============================================================================
   CONFIG
============================================================================ */
const BACKEND = "http://127.0.0.1:8000";
let TOKEN = null;

/* ============================================================================
   LIMPIEZA — RESULTADOS Y FORMULARIO
============================================================================ */

// Limpia SOLO el formulario (se usa al cambiar de módulo)
function limpiarFormulario() {
    ["nombre", "dpi", "nit"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });
}

//  Limpia resultados de pantalla (no el formulario)
function limpiarResultados() {
    ["internal-result", "external-result", "historial-json", "numeros-list"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = "";
    });

    ["result-area", "historial-area", "numeros-area"].forEach(area => {
        const el = document.getElementById(area);
        if (el) el.style.display = "none";
    });
}

//  Limpia TODO (solo se usa al cambiar de módulo o al cerrar sesión)
function limpiarTodo() {
    limpiarResultados();
    limpiarFormulario();
}

/* ============================================================================
   HELPERS
============================================================================ */
function showAlert(msg) {
    alert(msg);
}

function setLoading(on) {
    const s = document.getElementById("spinner");
    if (s) s.style.display = on ? "inline-block" : "none";
}

/* ============================================================================
   LOGIN
============================================================================ */
async function loginPin() {
    const pin = (document.getElementById("pin-input")?.value || "").trim();
    if (!pin) return showAlert("Ingrese PIN");

    try {
        setLoading(true);
        const res = await fetch(`${BACKEND}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pin })
        });

        const data = await res.json();
        if (res.ok && data.token) {
            TOKEN = data.token;
            document.getElementById("asesor-name").innerText = data.asesor || "Conectado";
            document.getElementById("pin-msg").innerText = "Conectado ✔";
            showAlert("Login correcto");
        } else {
            document.getElementById("pin-msg").innerText = data.detail || "PIN inválido";
            showAlert("PIN inválido");
        }

    } catch (e) {
        showAlert("Error al conectar con el servidor (login).");
    } finally {
        setLoading(false);
    }
}

/* ============================================================================
   BUSCAR (Principal)
============================================================================ */
async function realizarBusqueda() {
    if (!TOKEN) return showAlert("Debe iniciar sesión con PIN");

    limpiarResultados();
    setLoading(true);

    const nombre = document.getElementById("nombre").value.trim();
    const dpi = document.getElementById("dpi").value.trim();
    const nit = document.getElementById("nit").value.trim();

    if (!nombre && !dpi && !nit) {
        setLoading(false);
        return showAlert("Ingrese al menos un campo para buscar.");
    }

    const params = new URLSearchParams({ nombre, dpi, nit });

    try {
        const response = await fetch(`${BACKEND}/buscar?${params.toString()}`, {
            headers: { "x-api-key": TOKEN }
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            return showAlert(err.detail || "Error en la búsqueda.");
        }

        const data = await response.json();
        window.lastResult = data;

        mostrarInterno(data.internal || []);
        mostrarExterno(data.external || {});

    } catch (e) {
        showAlert("Error al conectar con el servidor.");
    } finally {
        setLoading(false);
    }
}

/* ============================================================================
   BUSCAR POR VALOR PARCIAL
============================================================================ */
async function buscarPorValor() {
    if (!TOKEN) return showAlert("Debe iniciar sesión con PIN");

    const valor = prompt("Ingrese valor para búsqueda parcial:");
    if (!valor) return;

    limpiarResultados();
    setLoading(true);

    try {
        const response = await fetch(`${BACKEND}/buscar?valor=${encodeURIComponent(valor)}`, {
            headers: { "x-api-key": TOKEN }
        });

        const data = await response.json();
        mostrarInterno(data.internal || []);
        mostrarExterno(data.external || {});

    } catch (e) {
        showAlert("Error al conectar con el servidor.");
    } finally {
        setLoading(false);
    }
}

/* ============================================================================
   RELOAD BASE
============================================================================ */
async function reloadBase() {
    if (!TOKEN) return showAlert("Debe iniciar sesión con PIN");
    if (!confirm("¿Recargar la base desde Excel?")) return;

    setLoading(true);

    try {
        const res = await fetch(`${BACKEND}/reload`, {
            headers: { "x-api-key": TOKEN }
        });

        const data = await res.json();
        showAlert(res.ok ? `Base recargada: ${data.rows_loaded} filas` : data.detail);

    } catch (e) {
        showAlert("Error al recargar la base.");
    } finally {
        setLoading(false);
    }
}

/* ============================================================================
   EXPORTAR CSV
============================================================================ */
async function exportar() {
    if (!TOKEN) return showAlert("Debe iniciar sesión con PIN");

    setLoading(true);

    try {
        const res = await fetch(`${BACKEND}/export`, {
            headers: { "x-api-key": TOKEN }
        });

        if (!res.ok) return showAlert("Error al exportar.");

        const data = await res.json();

        const blob = new Blob([data.csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = "resultado.csv";
        a.click();

    } catch (e) {
        showAlert("Error al exportar CSV.");
    } finally {
        setLoading(false);
    }
}

/* ============================================================================
   MOSTRAR RESULTADOS INTERNOS
============================================================================ */
function mostrarInterno(lista) {
    const div = document.getElementById("internal-result");
    div.innerHTML = "";

    if (!lista.length) {
        div.innerHTML = "<p>No hay resultados.</p>";
        document.getElementById("result-area").style.display = "block";
        return;
    }

    lista.forEach(item => {
        const telefonos = (item.TelBase || [])
            .filter(t => t && String(t).trim())
            .join(" | ");

        div.insertAdjacentHTML("beforeend", `
            <div class="resultado-item">
                <strong>Nombre:</strong> ${item.Nombre}<br>
                <strong>DPI:</strong> ${item.DPI}<br>
                <strong>NIT:</strong> ${item.NIT}<br>
                <strong>Email:</strong> ${item.Email || "No registrado"}<br>
                <strong>Fecha nacimiento:</strong> ${item.FechaNacimiento || "No registrado"}<br>
                <strong>Teléfonos:</strong> ${telefonos || "No tiene"}<br>
            </div>
            <hr>
        `);
    });

    document.getElementById("result-area").style.display = "block";
}

/* ============================================================================
   MOSTRAR RESULTADOS EXTERNOS
============================================================================ */
function mostrarExterno(ext) {
    const div = document.getElementById("external-result");
    div.innerHTML = "";

    const links = (ext.links || []).map(l => `<a href="${l}" target="_blank">${l}</a>`).join("<br>");
    const phones = (ext.phones || []).join(" | ");
    const emails = (ext.emails || []).join(" | ");

    div.innerHTML = `
        <strong>Links encontrados:</strong><br>
        ${links || "No links"}<br><br>

        <strong>Teléfonos detectados:</strong> ${phones || "Ninguno"}<br>
        <strong>Emails detectados:</strong> ${emails || "Ninguno"}<br>
    `;
}

/* ============================================================================
   HISTORIAL
============================================================================ */
async function cargarHistorial() {
    if (!TOKEN) return showAlert("Debe iniciar sesión con PIN");

    limpiarTodo();
    setLoading(true);

    try {
        const res = await fetch(`${BACKEND}/history`, {
            headers: { "x-api-key": TOKEN }
        });

        const data = await res.json();

        const table = document.createElement("table");
        table.innerHTML = `
            <thead>
                <tr><th>Fecha</th><th>Nombre</th><th>DPI</th><th>NIT</th></tr>
            </thead>
            <tbody>
                ${data.history.map(row => `
                    <tr>
                        <td>${row.fecha}</td>
                        <td>${row.nombre}</td>
                        <td>${row.dpi}</td>
                        <td>${row.nit}</td>
                    </tr>
                `).join("")}
            </tbody>
        `;

        document.getElementById("historial-json").appendChild(table);
        document.getElementById("historial-area").style.display = "block";

    } catch (e) {
        showAlert("Error cargando historial");
    } finally {
        setLoading(false);
    }
}

/* ============================================================================
   BASE DE NÚMEROS
============================================================================ */
async function verBase() {
    if (!TOKEN) return showAlert("Debe iniciar sesión con PIN");

    limpiarTodo();
    setLoading(true);

    try {
        const res = await fetch(`${BACKEND}/numeros/full?limit=100`, {
            headers: { "x-api-key": TOKEN }
        });

        const data = await res.json();

        const table = document.createElement("table");

        table.innerHTML = `
            <thead>
                <tr>
                    <th>ID</th><th>Nombre</th><th>DPI</th><th>NIT</th><th>Fecha</th>
                    <th>Email</th><th>Tel1</th><th>Tel2</th><th>Tel3</th><th>Tel4</th><th>Tel5</th>
                </tr>
            </thead>
            <tbody>
                ${data.rows.map(r => `
                    <tr>
                        <td>${r.ID}</td>
                        <td>${r.NOMBRE_CLIENTE}</td>
                        <td>${r.DPI}</td>
                        <td>${r.NIT}</td>
                        <td>${r.fecha_nacimiento}</td>
                        <td>${r.EMAIL}</td>
                        <td>${r.Tel_1}</td>
                        <td>${r.Tel_2}</td>
                        <td>${r.Tel_3}</td>
                        <td>${r.Tel_4}</td>
                        <td>${r.Tel_5}</td>
                    </tr>
                `).join("")}
            </tbody>
        `;

        document.getElementById("numeros-list").appendChild(table);
        document.getElementById("numeros-area").style.display = "block";

    } catch (e) {
        showAlert("Error cargando base");
    } finally {
        setLoading(false);
    }
}

/* ============================================================================
   LOGOUT
============================================================================ */
function logout() {
    TOKEN = null;
    limpiarTodo();
    document.getElementById("asesor-name").innerText = "No conectado";
    document.getElementById("pin-input").value = "";
    document.getElementById("pin-msg").innerText = "";
    showAlert("Sesión cerrada.");
}

/* ============================================================================
   EVENTOS
============================================================================ */
document.getElementById("pin-btn").addEventListener("click", loginPin);
document.getElementById("buscar-btn").addEventListener("click", realizarBusqueda);
document.getElementById("buscar-valor-btn").addEventListener("click", buscarPorValor);
document.getElementById("reload-btn").addEventListener("click", reloadBase);
document.getElementById("export-btn").addEventListener("click", exportar);
document.getElementById("menu-historial").addEventListener("click", cargarHistorial);
document.getElementById("menu-numeros").addEventListener("click", verBase);
document.getElementById("logout-btn").addEventListener("click", logout);

// Mostrar formulario de búsqueda
document.getElementById("menu-buscar").addEventListener("click", () => {
    limpiarTodo();
    document.getElementById("formulario-buscar").style.display = "block";
});

// INIT
limpiarTodo();
