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
const connectionStatus = document.getElementById('connectionStatus');
const STORAGE_KEY = 'fleetChecklists';
const USERS_KEY = 'fleetUsers';
const ACTIVE_USER_KEY = 'fleetActiveUser';
let checklistSaved = false;
let signatureDrawn = false;
let signatureContext = null;
let signaturePadInitialized = false;

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

  const defaultUsers = [];
  localStorage.setItem(USERS_KEY, JSON.stringify(defaultUsers));
}

function loginUser(username, password) {
  const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  const normalizedUsername = username.trim();
  const normalizedPassword = String(password).trim();

  if (!normalizedUsername) {
    return null;
  }

  const match = users.find((user) => {
    const storedUsername = String(user.username || '').trim();
    const storedName = String(user.name || '').trim();
    return (storedUsername === normalizedUsername || storedName === normalizedUsername) && String(user.password) === normalizedPassword;
  });

  if (match) {
    return match;
  }

  const existingUser = users.find((user) => {
    const storedUsername = String(user.username || '').trim();
    const storedName = String(user.name || '').trim();
    return storedUsername === normalizedUsername || storedName === normalizedUsername;
  });

  if (existingUser) {
    return null;
  }

  const defaultPassword = normalizedPassword || '123456';
  const customUser = {
    username: normalizedUsername,
    password: defaultPassword,
    role: 'Operador',
    name: normalizedUsername
  };

  users.push(customUser);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  return customUser;
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
  initializeSignaturePad();
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
          <div class="history-meta">Horímetro / hodômetro: ${item.meterReading} • Assinatura: ${item.signature ? 'Registrada' : 'Não registrada'}</div>
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
  updatePhotoRequirement();
  clearSignature();
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

function hasChecklistIssue() {
  return Object.keys(itemLabels).some((key) => {
    const selectedStatus = form.querySelector(`input[name="${key}"]:checked`);
    return selectedStatus && selectedStatus.value === 'Não OK';
  });
}

function updatePhotoRequirement() {
  const photoInput = document.getElementById('photos');
  const photoRequirement = document.getElementById('photoRequirement');
  if (!photoInput) {
    return;
  }

  const isRequired = hasChecklistIssue();
  photoInput.required = isRequired;
  photoInput.setCustomValidity(isRequired && photoInput.files.length === 0
    ? 'Anexe ao menos uma foto para registrar itens marcados como Não OK.'
    : '');

  if (photoRequirement) {
    photoRequirement.classList.toggle('required-hint', isRequired);
    photoRequirement.textContent = isRequired
      ? 'Obrigatório: anexe ao menos uma foto para registrar a irregularidade.'
      : 'Obrigatório anexar ao menos uma foto quando algum item estiver marcado como Não OK.';
  }
}

function initializeSignaturePad() {
  const canvas = document.getElementById('signaturePad');
  if (!canvas) return;

  const bounds = canvas.getBoundingClientRect();
  const pixelRatio = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor((bounds.width || 600) * pixelRatio));
  canvas.height = Math.floor(180 * pixelRatio);
  signatureContext = canvas.getContext('2d');
  signatureContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  signatureContext.strokeStyle = '#1f2937';
  signatureContext.lineWidth = 2.5;
  signatureContext.lineCap = 'round';
  signatureContext.lineJoin = 'round';

  if (signaturePadInitialized) return;
  signaturePadInitialized = true;
  let drawing = false;
  let lastPoint = null;
  canvas.addEventListener('pointerdown', (event) => {
    drawing = true;
    canvas.setPointerCapture(event.pointerId);
    const rect = canvas.getBoundingClientRect();
    lastPoint = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    signatureContext.beginPath();
    signatureContext.moveTo(lastPoint.x, lastPoint.y);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!drawing) return;
    const rect = canvas.getBoundingClientRect();
    const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    if (Math.hypot(point.x - lastPoint.x, point.y - lastPoint.y) < 1) return;
    signatureContext.lineTo(point.x, point.y);
    signatureContext.stroke();
    signatureDrawn = true;
    lastPoint = point;
    updateSignatureStatus();
  });
  const stopDrawing = () => { drawing = false; lastPoint = null; };
  canvas.addEventListener('pointerup', stopDrawing);
  canvas.addEventListener('pointercancel', stopDrawing);
}

function updateSignatureStatus() {
  const status = document.getElementById('signatureStatus');
  if (status) {
    status.textContent = signatureDrawn ? 'Assinatura registrada.' : 'Nenhuma assinatura registrada.';
  }
}

function clearSignature() {
  const canvas = document.getElementById('signaturePad');
  if (!canvas || !signatureContext) return;
  signatureContext.clearRect(0, 0, canvas.width, canvas.height);
  signatureDrawn = false;
  updateSignatureStatus();
}

function updateConnectionStatus() {
  if (!connectionStatus) return;
  const offline = !navigator.onLine;
  connectionStatus.classList.toggle('offline', offline);
  connectionStatus.textContent = offline
    ? 'Sem conexão. O checklist e as inspeções salvas neste dispositivo continuam disponíveis.'
    : 'Conectado. As inspeções são salvas neste dispositivo.';
}

function registerOfflineSupport() {
  updateConnectionStatus();
  window.addEventListener('online', updateConnectionStatus);
  window.addEventListener('offline', updateConnectionStatus);

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js').catch((error) => {
      console.error('Não foi possível habilitar o modo offline:', error);
    });
  }
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
  const meterReading = data.meterReading || 'Não informado';

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
Horímetro / hodômetro: ${meterReading}
Data: ${date}
Hora: ${time}
Local da inspeção: ${location}
Operador: ${operator}
Responsável pela manutenção: ${responsible}
Assinatura do motorista ou operador: Registrada
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

    if (!username) {
      alert('Informe o nome do usuário para continuar.');
      return;
    }

    const user = loginUser(username, password);
    if (!user) {
      alert('Usuário ou senha inválidos.');
      return;
    }

    setActiveUser(user);

    if (user.password === (password || '123456')) {
      alert(`Usuário criado com sucesso. Bem-vindo, ${user.name}! Sua senha de primeiro acesso foi definida automaticamente.`);
      return;
    }

    alert(`Login realizado com sucesso. Bem-vindo, ${user.name}!`);
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
  form.addEventListener('change', (event) => {
    if (event.target.matches('input[type="radio"], #photos')) {
      updatePhotoRequirement();
    }
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const vehicle = form.elements.vehicle.value.trim();
    if (!vehicle) {
      alert('Preencha a identificação do veículo antes de salvar.');
      return;
    }

    if (!form.elements.meterReading.value.trim()) {
      alert('Informe o horímetro ou hodômetro antes de salvar.');
      form.elements.meterReading.focus();
      return;
    }

    if (!signatureDrawn) {
      alert('Registre a assinatura do motorista ou operador antes de salvar.');
      document.getElementById('signaturePad').scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    updatePhotoRequirement();
    const photoInput = document.getElementById('photos');
    if (hasChecklistIssue() && (!photoInput || photoInput.files.length === 0)) {
      if (photoInput) {
        photoInput.reportValidity();
      }
      return;
    }

    checklistSaved = true;
    if (generateReportButton) {
      generateReportButton.disabled = false;
    }

    const data = getFormData();
    const summary = {
      vehicle: data.vehicle || 'Não informado',
      meterReading: data.meterReading || 'Não informado',
      signature: document.getElementById('signaturePad').toDataURL('image/png'),
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

const clearSignatureButton = document.getElementById('clearSignature');
if (clearSignatureButton) {
  clearSignatureButton.addEventListener('click', clearSignature);
}

document.addEventListener('DOMContentLoaded', () => {
  initializeAuth();
  setCurrentDateTime();
  updatePhotoRequirement();
  initializeSignaturePad();
  renderHistory();
  registerOfflineSupport();
});
