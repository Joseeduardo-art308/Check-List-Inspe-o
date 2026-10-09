const authScreen = document.getElementById('authScreen');
const passwordChangeScreen = document.getElementById('passwordChangeScreen');
const appScreen = document.getElementById('appScreen');
const loginForm = document.getElementById('loginForm');
const firstAccessForm = document.getElementById('firstAccessForm');
const loginTab = document.getElementById('loginTab');
const firstAccessTab = document.getElementById('firstAccessTab');
const loginPanel = document.getElementById('loginPanel');
const firstAccessPanel = document.getElementById('firstAccessPanel');
const passwordChangeForm = document.getElementById('passwordChangeForm');
const logoutButton = document.getElementById('logoutButton');
const userBadge = document.getElementById('userBadge');
const userManagementButton = document.getElementById('userManagementButton');
const userManagementPanel = document.getElementById('userManagementPanel');
const userForm = document.getElementById('userForm');
const managedUsersList = document.getElementById('managedUsersList');
const form = document.getElementById('inspectionForm');
const reportOutput = document.getElementById('reportOutput');
const generateReportButton = document.getElementById('generateReport');
const clearFormButton = document.getElementById('clearForm');
const historyList = document.getElementById('historyList');
const connectionStatus = document.getElementById('connectionStatus');
const STORAGE_KEY = 'fleetChecklists';
const VEHICLES_KEY = 'fleetVehicles';
const USERS_KEY = 'fleetUsers';
const ACTIVE_USER_KEY = 'fleetActiveUser';
const SYNC_QUEUE_KEY = 'fleetChecklistSyncQueue';
let checklistSaved = false;
let checklistValidationAttempted = false;
let signatureDrawn = false;
let signatureContext = null;
let signaturePadInitialized = false;
let pendingPasswordChangeUser = null;
let editingUserId = null;

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
  let currentUsers;
  try {
    currentUsers = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  } catch (error) {
    currentUsers = [];
  }

  if (!Array.isArray(currentUsers) || currentUsers.length === 0) {
    currentUsers = [{
      id: 'default-admin',
      name: 'Administrador',
      username: 'admin',
      password: 'admin123',
      role: 'Administrador',
      active: true,
      mustChangePassword: true
    }];
  } else {
    currentUsers = currentUsers.map((user) => ({
      ...user,
      id: user.id || createUserId(),
      active: user.active !== false,
      mustChangePassword: Boolean(user.mustChangePassword)
    }));
  }

  const testUserExists = currentUsers.some((user) =>
    String(user.username || '').trim().toLocaleLowerCase('pt-BR') === 'teste'
  );
  if (!testUserExists) {
    currentUsers.push({
      id: 'default-test-user',
      name: 'Usuário de teste',
      username: 'teste',
      password: 'Teste123!',
      role: 'Operador',
      active: true,
      mustChangePassword: true
    });
  }

  localStorage.setItem(USERS_KEY, JSON.stringify(currentUsers));
}

function createUserId() {
  return `user-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getUsers() {
  try {
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    return Array.isArray(users) ? users : [];
  } catch (error) {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function isAdministrator(user) {
  return String(user?.role || '').trim().toLocaleLowerCase('pt-BR') === 'administrador';
}

function updateActiveUserDisplay(user) {
  const sessionUser = {
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role
  };
  localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(sessionUser));
  if (userBadge) {
    userBadge.textContent = `${user.name || user.username} • ${user.role}`;
  }
  if (userManagementButton) {
    userManagementButton.classList.toggle('hidden', !isAdministrator(user));
  }
  const operatorInput = document.getElementById('operator');
  if (operatorInput) {
    operatorInput.value = user.name || user.username || '';
  }
}

function loginUser(username, password) {
  const users = getUsers();
  const normalizedUsername = username.trim();
  const comparableUsername = normalizedUsername.toLocaleLowerCase('pt-BR');
  const normalizedPassword = String(password);
  const allowedRoles = ['administrador', 'operador', 'motorista'];

  if (!normalizedUsername) {
    return null;
  }

  const match = users.find((user) => {
    const storedUsername = String(user.username || '').trim().toLocaleLowerCase('pt-BR');
    const storedName = String(user.name || '').trim().toLocaleLowerCase('pt-BR');
    const role = String(user.role || '').trim().toLocaleLowerCase('pt-BR');
    return (storedUsername === comparableUsername || storedName === comparableUsername)
      && String(user.password) === normalizedPassword
      && user.active !== false
      && allowedRoles.includes(role);
  });

  return match || null;
}

function showAuthPanel(panelName) {
  const showFirstAccess = panelName === 'firstAccess';
  loginPanel.classList.toggle('hidden', showFirstAccess);
  firstAccessPanel.classList.toggle('hidden', !showFirstAccess);
  loginTab.classList.toggle('active', !showFirstAccess);
  firstAccessTab.classList.toggle('active', showFirstAccess);
  loginTab.setAttribute('aria-selected', String(!showFirstAccess));
  firstAccessTab.setAttribute('aria-selected', String(showFirstAccess));
}

function setActiveUser(user) {
  updateActiveUserDisplay(user);
  if (authScreen) {
    authScreen.classList.add('hidden');
  }
  if (passwordChangeScreen) {
    passwordChangeScreen.classList.add('hidden');
  }
  if (appScreen) {
    appScreen.classList.remove('hidden');
  }
  closeUserManagement();
  initializeSignaturePad();
}

function clearActiveUser() {
  localStorage.removeItem(ACTIVE_USER_KEY);
  if (authScreen) {
    authScreen.classList.remove('hidden');
  }
  if (passwordChangeScreen) {
    passwordChangeScreen.classList.add('hidden');
  }
  if (appScreen) {
    appScreen.classList.add('hidden');
  }
  if (userBadge) {
    userBadge.textContent = 'Usuário';
  }
  if (userManagementButton) {
    userManagementButton.classList.add('hidden');
  }
  closeUserManagement();
}

function initializeAuth() {
  ensureDefaultUsers();
  const activeUser = JSON.parse(localStorage.getItem(ACTIVE_USER_KEY) || 'null');

  if (activeUser) {
    const currentUser = getUsers().find((user) => user.id === activeUser.id || user.username === activeUser.username);
    if (currentUser && currentUser.active !== false && !currentUser.mustChangePassword) {
      setActiveUser(currentUser);
    } else {
      clearActiveUser();
    }
  } else {
    clearActiveUser();
  }
}

function openUserManagement() {
  const activeUser = JSON.parse(localStorage.getItem(ACTIVE_USER_KEY) || 'null');
  if (!isAdministrator(activeUser)) {
    return;
  }

  form.classList.add('hidden');
  document.getElementById('reportPanel')?.classList.add('hidden');
  document.getElementById('historyPanel')?.classList.add('hidden');
  userManagementPanel.classList.remove('hidden');
  renderManagedUsers();
}

function closeUserManagement() {
  if (userManagementPanel) userManagementPanel.classList.add('hidden');
  if (form) form.classList.remove('hidden');
  document.getElementById('reportPanel')?.classList.remove('hidden');
  document.getElementById('historyPanel')?.classList.remove('hidden');
  resetUserForm();
}

function resetUserForm() {
  if (!userForm) return;
  userForm.reset();
  editingUserId = null;
  const passwordInput = document.getElementById('managedUserPassword');
  const saveButton = document.getElementById('saveUserButton');
  const passwordHint = document.getElementById('managedPasswordHint');
  const cancelButton = document.getElementById('cancelUserEdit');
  passwordInput.required = true;
  passwordInput.placeholder = '';
  passwordHint.textContent = '(mínimo de 8 caracteres)';
  saveButton.textContent = 'Cadastrar usuário';
  cancelButton.classList.add('hidden');
}

function renderManagedUsers() {
  if (!managedUsersList) return;
  managedUsersList.replaceChildren();

  getUsers().forEach((user) => {
    const card = document.createElement('article');
    card.className = `managed-user-card${user.active === false ? ' inactive' : ''}`;

    const details = document.createElement('div');
    const name = document.createElement('strong');
    name.textContent = user.name || user.username;
    const meta = document.createElement('div');
    meta.className = 'history-meta';
    meta.textContent = `Usuário: ${user.username} • Perfil: ${user.role} • ${user.active === false ? 'Inativo' : 'Ativo'}`;
    details.append(name, meta);

    const actions = document.createElement('div');
    actions.className = 'managed-user-actions';
    actions.append(
      createUserActionButton('Editar', 'secondary', () => editManagedUser(user.id)),
      createUserActionButton(user.active === false ? 'Ativar' : 'Inativar', 'ghost', () => toggleManagedUser(user.id)),
      createUserActionButton('Redefinir senha', 'ghost', () => resetManagedUserPassword(user.id))
    );
    card.append(details, actions);
    managedUsersList.append(card);
  });
}

function createUserActionButton(label, style, action) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = style;
  button.textContent = label;
  button.addEventListener('click', action);
  return button;
}

function editManagedUser(userId) {
  const user = getUsers().find((item) => item.id === userId);
  if (!user) return;

  editingUserId = userId;
  document.getElementById('managedUserName').value = user.name || '';
  document.getElementById('managedUsername').value = user.username || '';
  document.getElementById('managedUserPassword').value = '';
  document.getElementById('managedUserPassword').required = false;
  document.getElementById('managedUserPassword').placeholder = 'Deixe em branco para manter';
  document.getElementById('managedPasswordHint').textContent = '(opcional ao editar)';
  document.getElementById('managedUserRole').value = user.role;
  document.getElementById('saveUserButton').textContent = 'Salvar alterações';
  document.getElementById('cancelUserEdit').classList.remove('hidden');
  document.getElementById('managedUserName').focus();
}

function toggleManagedUser(userId) {
  const users = getUsers();
  const user = users.find((item) => item.id === userId);
  const activeUser = JSON.parse(localStorage.getItem(ACTIVE_USER_KEY) || 'null');
  if (!user) return;

  if (user.id === activeUser?.id) {
    alert('Não é possível inativar o usuário administrador da sessão atual.');
    return;
  }

  if (user.active !== false && isAdministrator(user)) {
    const otherActiveAdmins = users.filter((item) => item.id !== userId && item.active !== false && isAdministrator(item));
    if (!otherActiveAdmins.length) {
      alert('Mantenha pelo menos um administrador ativo.');
      return;
    }
  }

  user.active = user.active === false;
  saveUsers(users);
  renderManagedUsers();
}

function resetManagedUserPassword(userId) {
  const users = getUsers();
  const user = users.find((item) => item.id === userId);
  if (!user) return;

  const newPassword = prompt(`Digite a nova senha para ${user.username} (mínimo de 8 caracteres):`);
  if (newPassword === null) return;
  if (newPassword.length < 8) {
    alert('A senha precisa ter pelo menos 8 caracteres.');
    return;
  }

  user.password = newPassword;
  user.mustChangePassword = true;
  saveUsers(users);
  renderManagedUsers();

  const activeUser = JSON.parse(localStorage.getItem(ACTIVE_USER_KEY) || 'null');
  if (activeUser?.id === user.id) {
    clearActiveUser();
  }
}

function saveManagedUser(event) {
  event.preventDefault();
  const name = document.getElementById('managedUserName').value.trim();
  const username = document.getElementById('managedUsername').value.trim();
  const password = document.getElementById('managedUserPassword').value;
  const role = document.getElementById('managedUserRole').value;
  const users = getUsers();
  const existing = editingUserId ? users.find((user) => user.id === editingUserId) : null;
  const normalizedUsername = username.toLocaleLowerCase('pt-BR');

  if (users.some((user) => user.id !== editingUserId && String(user.username).trim().toLocaleLowerCase('pt-BR') === normalizedUsername)) {
    alert('Já existe um usuário com esse nome de usuário.');
    document.getElementById('managedUsername').focus();
    return;
  }

  if (password && password.length < 8) {
    alert('A senha precisa ter pelo menos 8 caracteres.');
    document.getElementById('managedUserPassword').focus();
    return;
  }

  const activeUser = JSON.parse(localStorage.getItem(ACTIVE_USER_KEY) || 'null');
  if (existing) {
    if (existing.id === activeUser?.id && !isAdministrator({ role })) {
      alert('O administrador da sessão não pode remover o próprio perfil de administrador.');
      return;
    }

    if (isAdministrator(existing) && !isAdministrator({ role })) {
      const otherActiveAdmins = users.filter((user) => user.id !== existing.id && user.active !== false && isAdministrator(user));
      if (existing.active !== false && !otherActiveAdmins.length) {
        alert('Mantenha pelo menos um administrador ativo.');
        return;
      }
    }

    existing.name = name;
    existing.username = username;
    existing.role = role;
    if (password) {
      existing.password = password;
      existing.mustChangePassword = true;
    }
  } else {
    if (!password) {
      alert('Informe uma senha para o novo usuário.');
      return;
    }
    users.push({
      id: createUserId(),
      name,
      username,
      password,
      role,
      active: true,
      mustChangePassword: false
    });
  }

  saveUsers(users);
  const updatedCurrentUser = users.find((user) => user.id === activeUser?.id);
  if (updatedCurrentUser && existing?.id === activeUser?.id && password) {
    resetUserForm();
    clearActiveUser();
    alert('Sua senha foi redefinida. Entre novamente para continuar.');
    return;
  }
  if (updatedCurrentUser) updateActiveUserDisplay(updatedCurrentUser);
  resetUserForm();
  renderManagedUsers();
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

function getSyncQueue() {
  try {
    const stored = localStorage.getItem(SYNC_QUEUE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    return [];
  }
}

function setSyncQueue(queue) {
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
}

function hydrateSyncQueueFromHistory() {
  const history = getStoredHistory();
  const queue = getSyncQueue();
  const queueIds = new Set(queue.map((item) => item.id));

  history.forEach((item) => {
    const normalizedId = item.id || `inspection-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    if ((!item.id || !queueIds.has(item.id)) && item.syncStatus !== 'synced') {
      queue.push({
        ...item,
        id: normalizedId,
        syncStatus: 'pending',
        queuedAt: item.queuedAt || new Date().toISOString()
      });
      queueIds.add(normalizedId);
    }
  });

  if (queue.length) {
    setSyncQueue(queue);
  }
}

function getConfiguredSyncUrl() {
  const configured = window.FLEET_SYNC_URL || '';
  return typeof configured === 'string' ? configured.trim() : '';
}

function saveInspectionToHistory(summary) {
  const history = getStoredHistory();
  const inspection = {
    ...summary,
    id: summary.id || `inspection-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    syncStatus: 'pending',
    queuedAt: summary.queuedAt || new Date().toISOString()
  };

  history.unshift(inspection);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, 10)));

  const queue = getSyncQueue();
  const existingIndex = queue.findIndex((item) => item.id === inspection.id);
  const pendingQueueItem = { ...inspection, syncStatus: 'pending' };

  if (existingIndex >= 0) {
    queue[existingIndex] = pendingQueueItem;
  } else {
    queue.push(pendingQueueItem);
  }

  setSyncQueue(queue);
  registerVehicle(inspection.vehicle);
  syncPendingInspections();
  return inspection;
}

function getStoredVehicles() {
  try {
    const vehicles = JSON.parse(localStorage.getItem(VEHICLES_KEY) || '[]');
    const historicalVehicles = getStoredHistory().map((inspection) => inspection.vehicle).filter(Boolean);
    return [...new Set([...vehicles, ...historicalVehicles].map((vehicle) => String(vehicle).trim()).filter(Boolean))];
  } catch (error) {
    return getStoredHistory().map((inspection) => inspection.vehicle).filter(Boolean);
  }
}

function renderVehicleOptions(selectedVehicle = '') {
  const vehicleSelect = document.getElementById('vehicle');
  if (!vehicleSelect) return;

  const vehicles = getStoredVehicles();
  vehicleSelect.innerHTML = '<option value="">Selecione um veículo cadastrado</option>';
  vehicles.forEach((vehicle) => {
    const option = document.createElement('option');
    option.value = vehicle;
    option.textContent = vehicle;
    vehicleSelect.append(option);
  });

  if (vehicles.includes(selectedVehicle)) {
    vehicleSelect.value = selectedVehicle;
  }
}

function registerVehicle(vehicle, selectAfterAdding = true) {
  const normalizedVehicle = String(vehicle || '').trim();
  if (!normalizedVehicle) return false;

  const vehicles = getStoredVehicles();
  const existingVehicle = vehicles.find((item) => item.toLocaleLowerCase('pt-BR') === normalizedVehicle.toLocaleLowerCase('pt-BR'));
  if (!existingVehicle) {
    vehicles.push(normalizedVehicle);
    localStorage.setItem(VEHICLES_KEY, JSON.stringify(vehicles));
  }

  renderVehicleOptions(selectAfterAdding ? (existingVehicle || normalizedVehicle) : '');
  return !existingVehicle;
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
      const syncState = item.syncStatus === 'synced' ? 'Sincronizado' : 'Pendente de sincronização';
      return `
        <div class="history-item">
          <strong>${item.vehicle}</strong>
          <div class="history-meta">${item.date} • ${item.time} • ${item.location}</div>
          <div class="history-meta">Status: ${status} • Severidade: ${item.severity}</div>
          <div class="history-meta">Sincronização: ${syncState}</div>
          <div class="history-meta">Horímetro / hodômetro: ${item.meterReading} • Assinatura: ${item.signature ? 'Registrada' : 'Não registrada'}</div>
        </div>
      `;
    })
    .join('');
}

async function syncPendingInspections() {
  const syncUrl = getConfiguredSyncUrl();
  const queue = getSyncQueue().filter((item) => item.syncStatus !== 'synced');

  if (!navigator.onLine || !syncUrl || !queue.length) {
    updateConnectionStatus();
    return false;
  }

  for (const item of [...queue]) {
    try {
      const response = await fetch(syncUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inspection: item,
          syncedAt: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`Falha ao sincronizar: ${response.status}`);
      }

      const remainingQueue = getSyncQueue().filter((queuedItem) => queuedItem.id !== item.id);
      setSyncQueue(remainingQueue);

      const history = getStoredHistory();
      const updatedHistory = history.map((historyItem) => {
        if (historyItem.id === item.id) {
          return {
            ...historyItem,
            syncStatus: 'synced',
            syncedAt: new Date().toISOString()
          };
        }
        return historyItem;
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
    } catch (error) {
      console.warn('Não foi possível sincronizar a inspeção pendente.', error);
      return false;
    }
  }

  renderHistory();
  updateConnectionStatus();
  return true;
}

function clearForm() {
  if (!form) {
    return;
  }

  form.reset();
  updatePhotoRequirement();
  clearSignature();
  checklistValidationAttempted = false;
  updateChecklistCompletion();
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

function getUnansweredChecklistItems() {
  return Object.entries(itemLabels).filter(([key]) => !form.querySelector(`input[name="${key}"]:checked`));
}

function updateChecklistCompletion() {
  const unansweredItems = getUnansweredChecklistItems();
  Object.keys(itemLabels).forEach((key) => {
    const selected = Boolean(form.querySelector(`input[name="${key}"]:checked`));
    const firstOption = form.querySelector(`input[name="${key}"]`);
    if (firstOption) {
      firstOption.closest('.inspection-item').classList.toggle('incomplete', checklistValidationAttempted && !selected);
    }
  });

  const validationMessage = document.getElementById('checklistValidationMessage');
  if (validationMessage) {
    const hasPendingItems = checklistValidationAttempted && unansweredItems.length > 0;
    validationMessage.classList.toggle('hidden', !hasPendingItems);
    validationMessage.textContent = hasPendingItems
      ? `Itens que ainda faltam responder: ${unansweredItems.map(([, label]) => label).join(', ')}.`
      : '';
  }
}

function clearChecklistStatuses() {
  Object.keys(itemLabels).forEach((key) => {
    form.querySelectorAll(`input[name="${key}"]`).forEach((radio) => {
      radio.checked = false;
    });
  });
  updatePhotoRequirement();
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
  const pendingCount = getSyncQueue().filter((item) => item.syncStatus !== 'synced').length;
  const pendingText = pendingCount > 0 ? ` ${pendingCount} inspeção(ões) pendente(s) de sincronização.` : '';

  connectionStatus.classList.toggle('offline', offline);
  const syncUrl = getConfiguredSyncUrl();
  if (offline) {
    connectionStatus.textContent = `Sem conexão. O checklist e as inspeções salvas neste dispositivo continuam disponíveis.${pendingText}`;
  } else if (!syncUrl) {
    connectionStatus.textContent = pendingCount
      ? `Conectado. ${pendingCount} inspeção(ões) salva(s) localmente; destino de sincronização automática ainda não configurado.`
      : 'Conectado. As inspeções são salvas neste dispositivo; destino de sincronização automática ainda não configurado.';
  } else {
    connectionStatus.textContent = `Conectado. A sincronização automática está ativa.${pendingText}`;
  }
}

function registerOfflineSupport() {
  updateConnectionStatus();
  window.addEventListener('online', () => {
    updateConnectionStatus();
    syncPendingInspections();
  });
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
    const value = data[key] || 'Não respondido';
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
    const password = passwordInput ? passwordInput.value : '';

    if (!username) {
      alert('Informe o nome do usuário para continuar.');
      return;
    }

    const user = loginUser(username, password);
    if (!user) {
      alert('Acesso não autorizado. Confira os dados e use uma conta ativa de administrador, operador ou motorista.');
      return;
    }

    if (user.mustChangePassword) {
      pendingPasswordChangeUser = user;
      authScreen.classList.add('hidden');
      passwordChangeScreen.classList.remove('hidden');
      document.getElementById('newPassword').focus();
      return;
    }

    setActiveUser(user);
  });
}

if (loginTab && firstAccessTab) {
  loginTab.addEventListener('click', () => showAuthPanel('login'));
  firstAccessTab.addEventListener('click', () => showAuthPanel('firstAccess'));
}

if (firstAccessForm) {
  firstAccessForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = document.getElementById('firstAccessName').value.trim();
    const username = document.getElementById('firstAccessUsername').value.trim();
    const password = document.getElementById('firstAccessPassword').value;
    const confirmPassword = document.getElementById('firstAccessConfirmPassword').value;
    const role = document.getElementById('firstAccessRole').value;
    const allowedRoles = ['Operador', 'Motorista'];

    if (!allowedRoles.includes(role)) {
      alert('Selecione um perfil válido para continuar.');
      return;
    }
    if (password.length < 8) {
      alert('A senha precisa ter pelo menos 8 caracteres.');
      document.getElementById('firstAccessPassword').focus();
      return;
    }
    if (password !== confirmPassword) {
      alert('As senhas não conferem.');
      document.getElementById('firstAccessConfirmPassword').focus();
      return;
    }

    const users = getUsers();
    const normalizedUsername = username.toLocaleLowerCase('pt-BR');
    const usernameExists = users.some((user) =>
      String(user.username || '').trim().toLocaleLowerCase('pt-BR') === normalizedUsername
    );
    if (usernameExists) {
      alert('Já existe uma conta com esse nome de usuário. Escolha outro.');
      document.getElementById('firstAccessUsername').focus();
      return;
    }

    const user = {
      id: createUserId(),
      name,
      username,
      password,
      role,
      active: true,
      mustChangePassword: false
    };
    users.push(user);
    saveUsers(users);
    firstAccessForm.reset();
    setActiveUser(user);
  });
}

if (passwordChangeForm) {
  passwordChangeForm.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!pendingPasswordChangeUser) return;

    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    if (newPassword.length < 8) {
      alert('A nova senha precisa ter pelo menos 8 caracteres.');
      return;
    }
    if (newPassword === pendingPasswordChangeUser.password) {
      alert('Escolha uma senha diferente da senha provisória.');
      document.getElementById('newPassword').focus();
      return;
    }
    if (newPassword !== confirmPassword) {
      alert('As senhas não conferem.');
      document.getElementById('confirmPassword').focus();
      return;
    }

    const users = getUsers();
    const user = users.find((item) => item.id === pendingPasswordChangeUser.id);
    if (!user || user.active === false) {
      pendingPasswordChangeUser = null;
      clearActiveUser();
      alert('Essa conta não está mais ativa. Fale com um administrador.');
      return;
    }

    user.password = newPassword;
    user.mustChangePassword = false;
    saveUsers(users);
    pendingPasswordChangeUser = null;
    passwordChangeForm.reset();
    setActiveUser(user);
  });
}

if (userManagementButton) {
  userManagementButton.addEventListener('click', openUserManagement);
}

const backToChecklistButton = document.getElementById('backToChecklist');
if (backToChecklistButton) {
  backToChecklistButton.addEventListener('click', closeUserManagement);
}

const cancelUserEditButton = document.getElementById('cancelUserEdit');
if (cancelUserEditButton) {
  cancelUserEditButton.addEventListener('click', resetUserForm);
}

if (userForm) {
  userForm.addEventListener('submit', saveManagedUser);
}

if (logoutButton) {
  logoutButton.addEventListener('click', () => {
    clearActiveUser();
    if (form) {
      clearForm();
    }
  });
}

if (form) {
  form.addEventListener('change', (event) => {
    if (event.target.matches('input[type="radio"], #photos')) {
      updatePhotoRequirement();
    }
    if (event.target.matches('input[type="radio"]')) {
      updateChecklistCompletion();
    }
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    checklistValidationAttempted = true;

    const vehicle = form.elements.vehicle.value.trim();
    if (!vehicle) {
      alert('Preencha a identificação do veículo antes de salvar.');
      return;
    }

    const unansweredItems = getUnansweredChecklistItems();
    if (unansweredItems.length) {
      updateChecklistCompletion();
      const [firstUnansweredKey] = unansweredItems[0];
      const firstUnanswered = form.querySelector(`input[name="${firstUnansweredKey}"]`);
      firstUnanswered.closest('.inspection-item').scrollIntoView({ behavior: 'smooth', block: 'center' });
      firstUnanswered.focus();
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

const addVehicleButton = document.getElementById('addVehicle');
if (addVehicleButton) {
  addVehicleButton.addEventListener('click', () => {
    const newVehicleInput = document.getElementById('newVehicle');
    const newVehicle = newVehicleInput.value.trim();
    if (!newVehicle) {
      alert('Informe a placa ou identificação do veículo.');
      newVehicleInput.focus();
      return;
    }

    const wasAdded = registerVehicle(newVehicle);
    newVehicleInput.value = '';
    alert(wasAdded ? 'Veículo cadastrado e selecionado.' : 'Esse veículo já estava cadastrado e foi selecionado.');
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initializeAuth();
  clearChecklistStatuses();
  updateChecklistCompletion();
  setCurrentDateTime();
  renderVehicleOptions();
  updatePhotoRequirement();
  initializeSignaturePad();
  hydrateSyncQueueFromHistory();
  renderHistory();
  registerOfflineSupport();
  syncPendingInspections();
});
