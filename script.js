const authScreen = document.getElementById('authScreen');
const appScreen = document.getElementById('appScreen');
const loginForm = document.getElementById('loginForm');
const logoutButton = document.getElementById('logoutButton');
const userBadge = document.getElementById('userBadge');
const form = document.getElementById('inspectionForm');
const reportOutput = document.getElementById('reportOutput');
const generateReportButton = document.getElementById('generateReport');
const clearFormButton = document.getElementById('clearForm');
const historyList = document.getElementById('historyList');
const STORAGE_KEY = 'fleetChecklists';
const USERS_KEY = 'fleetUsers';
const ACTIVE_USER_KEY = 'fleetActiveUser';
let checklistSaved = false;

const itemLabels = {
  oil: 'Nível de óleo do motor',
  coolant: 'Nível do líquido de arrefecimento',
  fuel: 'Nível de combustível',
  leaks: 'Vazamentos de óleo, água ou combustível',
  battery: 'Bateria e conexões',
  tires: 'Condição dos pneus',
  tirePressure: 'Pressão dos pneus',
  brakes: 'Sistema de freios',
  suspension: 'Sistema de direção e suspensão',
  lights: 'Faróis, lanternas e indicadores',
  signals: 'Seta e buzina',
  mirrors: 'Espelhos retrovisores e visibilidade',
  safety: 'Cinto de segurança e equipamentos de proteção',
  body: 'Estado visual da cabine e carroceria',
  doors: 'Portas, travas e fechaduras',
  windows: 'Vidros e limpa-vidros',
  documents: 'Documentação do veículo e habilitação',
};

function ensureDefaultUsers() {
  const currentUsers = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');

  if (currentUsers.length > 0) {
    return;
  }

  const defaultUsers = [
    { username: 'usuario1', password: '1', role: 'Operador', name: 'Usuário 1' },
    { username: 'usuario2', password: '2', role: 'Operador', name: 'Usuário 2' },
    { username: 'usuario3', password: '3', role: 'Operador', name: 'Usuário 3' },
    { username: 'usuario4', password: '4', role: 'Operador', name: 'Usuário 4' },
    { username: 'usuario5', password: '5', role: 'Operador', name: 'Usuário 5' }
  ];

  localStorage.setItem(USERS_KEY, JSON.stringify(defaultUsers));
}

function loginUser(username, password) {
  const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  const normalizedUsername = username.trim();
  const normalizedPassword = String(password).trim();

  const match = users.find((user) => {
    const storedUsername = String(user.username || '').trim();
    const storedName = String(user.name || '').trim();
    return (storedUsername === normalizedUsername || storedName === normalizedUsername) && String(user.password) === normalizedPassword;
  });

  if (match) {
    return match;
  }

  if (['1', '2', '3', '4', '5'].includes(normalizedPassword)) {
    const customUser = {
      username: normalizedUsername,
      password: normalizedPassword,
      role: 'Operador',
      name: normalizedUsername
    };
    users.push(customUser);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    return customUser;
  }

  return null;
}

function setActiveUser(user) {
  localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(user));
  if (userBadge) {
    userBadge.textContent = `${user.name || user.username} • ${user.role}`;
  }
  if (authScreen) {
    authScreen.classList.add('hidden');
  }
  if (appScreen) {
    appScreen.classList.remove('hidden');
  }
}

function clearActiveUser() {
  localStorage.removeItem(ACTIVE_USER_KEY);
  if (authScreen) {
    authScreen.classList.remove('hidden');
  }
  if (appScreen) {
    appScreen.classList.add('hidden');
  }
  if (userBadge) {
    userBadge.textContent = 'Usuário';
  }
}

function initializeAuth() {
  ensureDefaultUsers();
  const activeUser = JSON.parse(localStorage.getItem(ACTIVE_USER_KEY) || 'null');

  if (activeUser) {
    setActiveUser(activeUser);
  } else {
    clearActiveUser();
  }
}

function getLocalDateTime() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');

  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

  return { date, time };
}

function setCurrentDateTime() {
  const dateInput = document.getElementById('date');
  const timeInput = document.getElementById('time');
  const { date, time } = getLocalDateTime();

  if (dateInput && !dateInput.value) {
    dateInput.value = date;
  }

  if (timeInput && !timeInput.value) {
    timeInput.value = time;
  }
}

function getFormData() {
  const formData = new FormData(form);
  const values = {};

  for (const [key, value] of formData.entries()) {
    if (value) {
      values[key] = value;
    }
  }

  return values;
}

function getStoredHistory() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    return [];
  }
}

function saveInspectionToHistory(summary) {
  const history = getStoredHistory();
  history.unshift(summary);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, 10)));
}

function renderHistory() {
  if (!historyList) {
    return;
  }

  const history = getStoredHistory();

  if (!history.length) {
    historyList.innerHTML = '<div class="history-item"><strong>Nenhuma inspeção salva ainda.</strong><div class="history-meta">Os registros aparecerão aqui após o primeiro envio.</div></div>';
    return;
  }

  historyList.innerHTML = history
    .map((item) => {
      const status = item.hasIssue ? 'Com pendência' : 'Sem pendência';
      return `
        <div class="history-item">
          <strong>${item.vehicle}</strong>
          <div class="history-meta">${item.date} • ${item.time} • ${item.location}</div>
          <div class="history-meta">Status: ${status} • Severidade: ${item.severity}</div>
        </div>
      `;
    })
    .join('');
}

function clearForm() {
  if (!form) {
    return;
  }

  form.reset();
  checklistSaved = false;
  if (generateReportButton) {
    generateReportButton.disabled = true;
  }
  if (reportOutput) {
    reportOutput.textContent = '';
    reportOutput.classList.remove('alert', 'ok');
  }
  setCurrentDateTime();

  const defaultLocation = document.getElementById('location');
  if (defaultLocation) {
    defaultLocation.value = 'Pátio';
  }
}

function getPhotoNames() {
  const photoInput = document.getElementById('photos');
  const files = photoInput && photoInput.files ? photoInput.files : [];

  if (!files.length) {
    return 'Nenhuma foto anexada.';
  }

  return Array.from(files).map((file) => file.name).join(', ');
}

function buildReport() {
  if (!reportOutput || !form) {
    return;
  }

  const data = getFormData();
  const vehicle = data.vehicle || 'Não informado';
  const date = data.date || 'Não informado';
  const time = data.time || 'Não informado';
  const operator = data.operator || 'Não informado';
  const responsible = data.maintenanceResponsible || 'Não informado';
  const location = data.location || 'Não informado';
  const observations = data.observations || 'Nenhuma observação registrada.';
  const photoNames = getPhotoNames();
  const severity = data.severity || 'Baixa';

  const issues = [];

  Object.entries(itemLabels).forEach(([key, label]) => {
    const value = data[key] || 'OK';
    if (value === 'Não OK') {
      issues.push(`- ${label}`);
    }
  });

  const hasIssue = issues.length > 0;
  const totalItems = Object.keys(itemLabels).length;
  const issueCount = issues.length;

  const report = `Veículo: ${vehicle}
Data: ${date}
Hora: ${time}
Local da inspeção: ${location}
Operador: ${operator}
Responsável pela manutenção: ${responsible}
Severidade: ${severity}

Resumo geral:
- Total de itens avaliados: ${totalItems}
- Itens com não conformidade: ${issueCount}
- Status geral: ${hasIssue ? 'Pendência identificada' : 'Sem pendências'}

Itens com não conformidade:
${hasIssue ? issues.join('\n') : '- Nenhum item em não conformidade.'}

Observações:
${observations}

Fotos anexadas:
${photoNames}
`;

  reportOutput.textContent = report;
  reportOutput.classList.remove('alert', 'ok');

  if (hasIssue) {
    reportOutput.classList.add('alert');
  } else {
    reportOutput.classList.add('ok');
  }
}

if (loginForm) {
  loginForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const username = usernameInput ? usernameInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value.trim() : '';

    if (!username || !password) {
      alert('Informe usuário e senha para continuar.');
      return;
    }

    const user = loginUser(username, password);
    if (!user) {
      alert('Usuário ou senha inválidos.');
      return;
    }

    setActiveUser(user);
    alert(`Login realizado com sucesso. Bem-vindo, ${user.username}!`);
  });
}

if (logoutButton) {
  logoutButton.addEventListener('click', () => {
    clearActiveUser();
    if (form) {
      clearForm();
    }
    alert('Logout realizado com sucesso.');
  });
}

if (form) {
  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const vehicle = form.elements.vehicle.value.trim();
    if (!vehicle) {
      alert('Preencha a identificação do veículo antes de salvar.');
      return;
    }

    checklistSaved = true;
    if (generateReportButton) {
      generateReportButton.disabled = false;
    }

    const data = getFormData();
    const summary = {
      vehicle: data.vehicle || 'Não informado',
      date: data.date || 'Não informado',
      time: data.time || 'Não informado',
      location: data.location || 'Não informado',
      severity: data.severity || 'Baixa',
      hasIssue: Object.keys(itemLabels).some((key) => (data[key] || 'OK') === 'Não OK')
    };

    saveInspectionToHistory(summary);
    renderHistory();
    buildReport();
    alert('Inspeção salva com sucesso!');
  });
}

if (generateReportButton) {
  generateReportButton.addEventListener('click', () => {
    if (!checklistSaved) {
      alert('Salve a inspeção antes de gerar o relatório.');
      return;
    }

    buildReport();
    alert('Relatório gerado com sucesso!');
  });
}

if (clearFormButton) {
  clearFormButton.addEventListener('click', () => {
    clearForm();
    alert('Formulário limpo com sucesso!');
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initializeAuth();
  setCurrentDateTime();
  renderHistory();
});
