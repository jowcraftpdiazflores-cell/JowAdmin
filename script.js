const STORAGE_KEY = "staffMembers";
const APPEALS_KEY = "appeals";
const LAST_UPDATE_KEY = "lastPointUpdate";
const MAX_POINTS = 7;

let staffMembers = [
  {
    nombre: "Jow",
    rango: "Owner",
    cargos: ["Inspector"],
    puntos: 7,
    estadoManual: "Activo",
  },
  {
    nombre: "Agus",
    rango: "Owner",
    cargos: ["Colaborador"],
    puntos: 6.8,
    estadoManual: "Activo",
  },
  {
    nombre: "Celeste",
    rango: "Admin",
    cargos: ["Inspector", "Mod"],
    puntos: 5.6,
    estadoManual: "Seguimiento",
  },
  {
    nombre: "Leandro",
    rango: "Admin",
    cargos: ["Mod"],
    puntos: 4.2,
    estadoManual: "Seguimiento",
  },
  {
    nombre: "Yuka",
    rango: "Tester",
    cargos: ["Colaborador"],
    puntos: 2.4,
    estadoManual: "En riesgo",
  },
  {
    nombre: "Joel",
    rango: "Tester",
    cargos: ["Mod"],
    puntos: 1.5,
    estadoManual: "En riesgo",
  },
];

let appeals = [
  {
    miembro: "Diego",
    motivo: "Llegó a 0 puntos y fue degradado a Usuario",
    plazo: "23h restantes",
    estado: "Abierta",
  },
  {
    miembro: "Shady",
    motivo: "Revisión por inactividad prolongada",
    plazo: "12h restantes",
    estado: "En revisión",
  },
];

function initApp() {
  setupTabs();
  loadDataFromStorage();
  renderAll();
  setupDailyPointDecrease();
}

function setupTabs() {
  const tabs = document.querySelectorAll(".tab");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const tabId = tab.getAttribute("data-tab");

      document.querySelectorAll(".tab").forEach((item) => {
        item.classList.remove("active");
      });

      document.querySelectorAll(".tab-content").forEach((section) => {
        section.classList.remove("active");
      });

      tab.classList.add("active");
      document.getElementById(tabId).classList.add("active");
    });
  });
}

function loadDataFromStorage() {
  const savedStaffData = localStorage.getItem(STORAGE_KEY);
  const savedAppeals = localStorage.getItem(APPEALS_KEY);
  const lastUpdate = localStorage.getItem(LAST_UPDATE_KEY);

  if (savedStaffData) {
    staffMembers = JSON.parse(savedStaffData);
  }

  if (savedAppeals) {
    appeals = JSON.parse(savedAppeals);
  }

  if (lastUpdate) {
    const lastUpdateDate = new Date(lastUpdate);
    const today = new Date();
    const daysSinceLastUpdate = Math.floor(
      (today - lastUpdateDate) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceLastUpdate >= 1) {
      decreasePoints(daysSinceLastUpdate);
    }
  } else {
    localStorage.setItem(LAST_UPDATE_KEY, new Date().toISOString());
  }
}

function saveDataToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(staffMembers));
  localStorage.setItem(APPEALS_KEY, JSON.stringify(appeals));
}

function setupDailyPointDecrease() {
  setInterval(() => {
    const lastUpdate = localStorage.getItem(LAST_UPDATE_KEY);

    if (!lastUpdate) {
      localStorage.setItem(LAST_UPDATE_KEY, new Date().toISOString());
      return;
    }

    const lastUpdateDate = new Date(lastUpdate);
    const today = new Date();
    const daysSinceLastUpdate = Math.floor(
      (today - lastUpdateDate) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceLastUpdate >= 1) {
      decreasePoints(daysSinceLastUpdate);
    }
  }, 60 * 60 * 1000);
}

function decreasePoints(days = 1) {
  let updated = false;

  staffMembers = staffMembers.map((member) => {
    const nuevosPuntos = roundPoints(Math.max(0, member.puntos - days));

    if (nuevosPuntos !== member.puntos) {
      updated = true;
    }

    return {
      ...member,
      puntos: nuevosPuntos,
    };
  });

  if (updated) {
    saveDataToStorage();
    localStorage.setItem(LAST_UPDATE_KEY, new Date().toISOString());
    renderAll();

    const pointsSection = document.getElementById("points");
    if (pointsSection && pointsSection.classList.contains("active")) {
      showNotification(
        `Se aplicó la reducción automática de puntos (-${days} por día).`
      );
    }
  }
}

function renderAll() {
  renderStaffTable();
  renderPointsTable();
  renderAppealsTable();
  renderDashboardStats();
}

function renderStaffTable() {
  const staffTableBody = document.getElementById("staff-table-body");
  staffTableBody.innerHTML = "";

  staffMembers.forEach((member) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${member.nombre}</td>
      <td>${member.rango}</td>
      <td>${renderTags(member.cargos)}</td>
      <td>${getManualStatusBadge(member.estadoManual)}</td>
    `;
    staffTableBody.appendChild(row);
  });
}

function renderPointsTable() {
  const pointsTableBody = document.getElementById("staff-points-body");
  pointsTableBody.innerHTML = "";

  staffMembers.forEach((member) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${member.nombre}</td>
      <td>${member.rango}</td>
      <td>${member.puntos.toFixed(1)}</td>
      <td>${getPointsState(member.puntos)}</td>
    `;
    pointsTableBody.appendChild(row);
  });
}

function renderAppealsTable() {
  const appealsTableBody = document.getElementById("appeals-table-body");
  appealsTableBody.innerHTML = "";

  appeals.forEach((appeal) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${appeal.miembro}</td>
      <td>${appeal.motivo}</td>
      <td>${appeal.plazo}</td>
      <td>${getAppealStatusBadge(appeal.estado)}</td>
    `;
    appealsTableBody.appendChild(row);
  });
}

function renderDashboardStats() {
  const totalOwners = document.getElementById("total-owners");
  const totalAdmins = document.getElementById("total-admins");
  const totalTesters = document.getElementById("total-testers");
  const staffAtRisk = document.getElementById("staff-at-risk");
  const openAppeals = document.getElementById("open-appeals");
  const ownersLegend = document.getElementById("owners-legend");
  const adminsLegend = document.getElementById("admins-legend");
  const testersLegend = document.getElementById("testers-legend");
  const ownersBar = document.getElementById("owners-bar");
  const adminsBar = document.getElementById("admins-bar");
  const testersBar = document.getElementById("testers-bar");

  const ownerCount = staffMembers.filter((member) => member.rango === "Owner").length;
  const adminCount = staffMembers.filter((member) => member.rango === "Admin").length;
  const testerCount = staffMembers.filter((member) => member.rango === "Tester").length;
  const totalWithRange = Math.max(ownerCount + adminCount + testerCount, 1);

  totalOwners.textContent = String(ownerCount);
  totalAdmins.textContent = String(adminCount);
  totalTesters.textContent = String(testerCount);
  staffAtRisk.textContent = String(
    staffMembers.filter((member) => member.puntos <= 2).length
  );
  openAppeals.textContent = String(
    appeals.filter((appeal) => appeal.estado !== "Cerrada").length
  );

  ownersLegend.textContent = String(ownerCount);
  adminsLegend.textContent = String(adminCount);
  testersLegend.textContent = String(testerCount);

  ownersBar.style.width = `${(ownerCount / totalWithRange) * 100}%`;
  adminsBar.style.width = `${(adminCount / totalWithRange) * 100}%`;
  testersBar.style.width = `${(testerCount / totalWithRange) * 100}%`;
}

function renderTags(tags) {
  return tags
    .map((tag) => `<span class="tag">${tag}</span>`)
    .join(" ");
}

function getManualStatusBadge(status) {
  const normalizedStatus = normalizeStatus(status);
  return `<span class="status-badge status-${normalizedStatus}">${status}</span>`;
}

function getAppealStatusBadge(status) {
  const normalizedStatus = normalizeStatus(status);
  return `<span class="status-badge status-${normalizedStatus}">${status}</span>`;
}

function getPointsState(points) {
  if (points === 0) {
    return `<span class="points-state"><span class="points-0 circle"></span>Crítico</span>`;
  }

  if (points <= 2) {
    return `<span class="points-state"><span class="points-2 circle"></span>Riesgo alto</span>`;
  }

  if (points <= 4) {
    return `<span class="points-state"><span class="points-4 circle"></span>Seguimiento</span>`;
  }

  if (points <= 6) {
    return `<span class="points-state"><span class="points-6 circle"></span>Estable</span>`;
  }

  return `<span class="points-state"><span class="points-7 circle"></span>Óptimo</span>`;
}

function roundPoints(value) {
  return Math.round(value * 10) / 10;
}

function normalizeStatus(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-");
}

function showNotification(message) {
  const notification = document.createElement("div");
  notification.className = "notification";
  notification.textContent = message;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.classList.add("hide");

    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 3000);
}

function updateStaffPoints(nombre, nuevosPuntos) {
  const memberIndex = staffMembers.findIndex((member) => member.nombre === nombre);

  if (memberIndex === -1) {
    return false;
  }

  staffMembers[memberIndex].puntos = roundPoints(
    Math.max(0, Math.min(MAX_POINTS, nuevosPuntos))
  );

  saveDataToStorage();
  renderAll();
  return true;
}

document.addEventListener("DOMContentLoaded", initApp);

window.updateStaffPoints = updateStaffPoints;
