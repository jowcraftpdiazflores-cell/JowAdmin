// Datos iniciales
let adminUsers = [
  { nombre: "Vahgo", puntos_admin: 3 },
  { nombre: "Nose", puntos_admin: 4 },
  { nombre: "Nose2", puntos_admin: 3 },
  { nombre: "Diego", puntos_admin: 3 },
  { nombre: "Josue", puntos_admin: 3 },
  { nombre: "Gaxoli", puntos_admin: 3 },
  { nombre: "Celeste", puntos_admin: 4 },
  { nombre: "Shady", puntos_admin: 4 },
  { nombre: "Yuka", puntos_admin: 3 },
  { nombre: "Agus", puntos_admin: 4 },
  { nombre: "Joel", puntos_admin: 3 },
];

let oleadaUsers = [
  { nombre: "Nose", puntos_oleada: 1 },
  { nombre: "Celeste", puntos_oleada: 1 },
  { nombre: "Leandro", puntos_oleada: 2 },
  { nombre: "E", puntos_oleada: 1 },
];

// Función para inicializar la aplicación
function initApp() {
  setupTabs();
  loadDataFromStorage();
  renderAdminTable();
  renderOleadaTable();
  setupDailyPointDecrease();
}

// Configuración de las pestañas
function setupTabs() {
  const tabs = document.querySelectorAll(".tab");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const tabId = tab.getAttribute("data-tab");

      // Remover clase active de todas las pestañas y contenidos
      document
        .querySelectorAll(".tab")
        .forEach((t) => t.classList.remove("active"));
      document
        .querySelectorAll(".tab-content")
        .forEach((c) => c.classList.remove("active"));

      // Agregar clase active a la pestaña y contenido seleccionados
      tab.classList.add("active");
      document.getElementById(tabId).classList.add("active");
    });
  });
}

// Cargar datos desde localStorage
function loadDataFromStorage() {
  const savedAdminData = localStorage.getItem("adminUsers");
  const savedOleadaData = localStorage.getItem("oleadaUsers");
  const lastUpdate = localStorage.getItem("lastPointUpdate");

  if (savedAdminData) {
    adminUsers = JSON.parse(savedAdminData);
  }

  if (savedOleadaData) {
    oleadaUsers = JSON.parse(savedOleadaData);
  }

  // Verificar si necesitamos actualizar puntos
  if (lastUpdate) {
    const lastUpdateDate = new Date(lastUpdate);
    const today = new Date();
    const daysSinceLastUpdate = Math.floor(
      (today - lastUpdateDate) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceLastUpdate >= 1) {
      decreaseAdminPoints(daysSinceLastUpdate);
    }
  } else {
    // Primera vez, guardar la fecha actual
    localStorage.setItem("lastPointUpdate", new Date().toISOString());
  }
}

// Guardar datos en localStorage
function saveDataToStorage() {
  localStorage.setItem("adminUsers", JSON.stringify(adminUsers));
  localStorage.setItem("oleadaUsers", JSON.stringify(oleadaUsers));
}

// Configurar la disminución diaria de puntos
function setupDailyPointDecrease() {
  // Verificar cada día si necesitamos actualizar los puntos
  setInterval(() => {
    const lastUpdate = localStorage.getItem("lastPointUpdate");

    if (lastUpdate) {
      const lastUpdateDate = new Date(lastUpdate);
      const today = new Date();
      const daysSinceLastUpdate = Math.floor(
        (today - lastUpdateDate) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceLastUpdate >= 1) {
        decreaseAdminPoints(daysSinceLastUpdate);
      }
    }
  }, 60 * 60 * 1000); // Verificar cada hora
}

// Disminuir puntos de admin
function decreaseAdminPoints(days = 1) {
  let updated = false;

  for (let i = 0; i < adminUsers.length; i++) {
    const newPoints = Math.max(0, adminUsers[i].puntos_admin - days);

    if (newPoints !== adminUsers[i].puntos_admin) {
      adminUsers[i].puntos_admin = newPoints;
      updated = true;
    }
  }

  if (updated) {
    saveDataToStorage();
    localStorage.setItem("lastPointUpdate", new Date().toISOString());
    renderAdminTable();

    // Mostrar notificación si estamos en la pestaña de admin
    if (document.getElementById("admin").classList.contains("active")) {
      showNotification(
        `Se han actualizado los puntos de admin (-${days} punto${
          days > 1 ? "s" : ""
        })`
      );
    }
  }
}

// Renderizar tabla de admin
function renderAdminTable() {
  const adminTableBody = document.getElementById("admin-points-body");
  adminTableBody.innerHTML = "";

  adminUsers.forEach((user) => {
    const row = document.createElement("tr");
    row.innerHTML = `
            <td>${user.nombre}</td>
            <td>${user.puntos_admin}</td>
            <td>${getAdminState(user.puntos_admin)}</td>
        `;
    adminTableBody.appendChild(row);
  });
}

// Obtener estado visual para admin
function getAdminState(puntos) {
  if (puntos === 0) return `<span class="admin-0 circle">⚠️</span>`;
  if (puntos === 1) return `<span class="admin-1 circle"></span>`;
  if (puntos === 2) return `<span class="admin-2 circle"></span>`;
  if (puntos === 3) return `<span class="admin-3 circle"></span>`;
  if (puntos === 4) return `<span class="admin-4 circle"></span>`;
  return `<span class="admin-5 circle"></span>`;
}

// Renderizar tabla de oleada
function renderOleadaTable() {
  const oleadaTableBody = document.getElementById("oleada-points-body");
  oleadaTableBody.innerHTML = "";

  oleadaUsers.forEach((user) => {
    const row = document.createElement("tr");
    row.innerHTML = `
            <td>${user.nombre}</td>
            <td>${user.puntos_oleada}</td>
            <td>${getOleadaState(user.puntos_oleada)}</td>
        `;
    oleadaTableBody.appendChild(row);
  });
}

// Obtener estado visual para oleada
function getOleadaState(puntos) {
  if (puntos === 0) return `<span class="oleada-0 circle">⚠️</span>`;
  if (puntos === 1) return `<span class="oleada-1 circle"></span>`;
  if (puntos === 2) return `<span class="oleada-2 circle"></span>`;
  return `<span class="oleada-3 circle"></span>`;
}

// Mostrar notificación
function showNotification(message) {
  // Crear elemento de notificación
  const notification = document.createElement("div");
  notification.textContent = message;
  notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: #3498db;
        color: white;
        padding: 12px 20px;
        border-radius: 4px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        z-index: 1000;
        transition: opacity 0.3s;
    `;

  document.body.appendChild(notification);

  // Remover después de 3 segundos
  setTimeout(() => {
    notification.style.opacity = "0";
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

// Función para actualizar puntos manualmente (para uso del administrador)
function updateAdminPoints(nombre, nuevosPuntos) {
  const userIndex = adminUsers.findIndex((user) => user.nombre === nombre);

  if (userIndex !== -1) {
    adminUsers[userIndex].puntos_admin = Math.max(0, Math.min(5, nuevosPuntos));
    saveDataToStorage();
    renderAdminTable();
    return true;
  }

  return false;
}

// Función para actualizar puntos de oleada manualmente
function updateOleadaPoints(nombre, nuevosPuntos) {
  const userIndex = oleadaUsers.findIndex((user) => user.nombre === nombre);

  if (userIndex !== -1) {
    oleadaUsers[userIndex].puntos_oleada = Math.max(
      0,
      Math.min(3, nuevosPuntos)
    );
    saveDataToStorage();
    renderOleadaTable();
    return true;
  }

  return false;
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", initApp);

// Hacer las funciones de actualización disponibles globalmente para el administrador
window.updateAdminPoints = updateAdminPoints;
window.updateOleadaPoints = updateOleadaPoints;
