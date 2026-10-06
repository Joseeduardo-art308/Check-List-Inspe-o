const form = document.getElementById('inspectionForm');
const reportOutput = document.getElementById('reportOutput');
const generateReportButton = document.getElementById('generateReport');

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

function buildReport() {
  const data = getFormData();
  const vehicle = data.vehicle || 'Não informado';
  const date = data.date || 'Não informado';
  const time = data.time || 'Não informado';
  const operator = data.operator || 'Não informado';
  const responsible = data.maintenanceResponsible || 'Não informado';
  const location = data.location || 'Não informado';
  const observations = data.observations || 'Nenhuma observação registrada.';
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
`;

  reportOutput.textContent = report;
  reportOutput.classList.remove('alert', 'ok');

  if (hasIssue) {
    reportOutput.classList.add('alert');
  } else {
    reportOutput.classList.add('ok');
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  buildReport();
  alert('Inspeção salva com sucesso!');
});

generateReportButton.addEventListener('click', buildReport);

document.addEventListener('DOMContentLoaded', () => {
  const today = new Date().toISOString().split('T')[0];
  const dateInput = document.getElementById('date');
  if (dateInput) {
    dateInput.value = today;
  }

  buildReport();
});
