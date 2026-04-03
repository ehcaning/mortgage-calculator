// --- Formatters ---

const CURRENCY_FORMAT = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatCurrency(value) {
  return CURRENCY_FORMAT.format(value);
}

function formatYearMonth(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatDuration(totalMonths) {
  return `${Math.floor(totalMonths / 12)}y ${totalMonths % 12}m`;
}

// --- Form I/O ---

function readFormInputs() {
  return {
    loanAmount: parseFloat(document.getElementById('loanAmount').value),
    interestRate: parseFloat(document.getElementById('interestRate').value),
    monthlyPayment: parseFloat(document.getElementById('monthlyPayment').value),
    annualExtra: parseFloat(document.getElementById('annualExtra').value),
    extraMonth: parseInt(document.getElementById('extraMonth').value, 10),
    extraPaymentCount: parseInt(document.getElementById('extraPaymentCount').value, 10),
    startDate: new Date(
      parseInt(document.getElementById('startYear').value, 10),
      parseInt(document.getElementById('startMonth').value, 10) - 1,
      1,
    ),
  };
}

function saveFormData() {
  const data = {
    loanAmount: document.getElementById('loanAmount').value,
    interestRate: document.getElementById('interestRate').value,
    monthlyPayment: document.getElementById('monthlyPayment').value,
    annualExtra: document.getElementById('annualExtra').value,
    extraMonth: document.getElementById('extraMonth').value,
    extraPaymentCount: document.getElementById('extraPaymentCount').value,
    startMonth: document.getElementById('startMonth').value,
    startYear: document.getElementById('startYear').value,
  };
  localStorage.setItem('mortgageFormData', JSON.stringify(data));
}

function loadFormData() {
  const raw = localStorage.getItem('mortgageFormData');
  if (!raw) return;

  const data = JSON.parse(raw);
  const setField = (id, key, fallback) => {
    document.getElementById(id).value = data[key] ?? fallback;
  };

  setField('loanAmount', 'loanAmount', '400000');
  setField('interestRate', 'interestRate', '3.45');
  setField('monthlyPayment', 'monthlyPayment', '2000');
  setField('annualExtra', 'annualExtra', '3000');
  setField('extraMonth', 'extraMonth', '6');
  setField('extraPaymentCount', 'extraPaymentCount', '-1');
  if (data.startMonth) setField('startMonth', 'startMonth', null);
  if (data.startYear) setField('startYear', 'startYear', null);
}

// --- Paid tracking ---

function savePaidIndex(index) {
  localStorage.setItem('paidIndex', index);
}

function getPaidIndex() {
  return parseInt(localStorage.getItem('paidIndex') ?? '-1', 10);
}

function updatePaid(index) {
  savePaidIndex(index);
  document.querySelectorAll('.paid-check-boxes').forEach((el, i) => (el.checked = i <= index));
}

// --- Calculation ---

function performCalculation({ loanAmount, interestRate, monthlyPayment, annualExtra, extraMonth, extraPaymentCount, startDate }) {
  const monthlyRate = interestRate / 100 / 12;
  let remainingBalance = loanAmount;
  let totalInterestPaid = 0;
  let totalPrincipalPaid = 0;
  let extraPaymentsMade = 0;
  let monthCount = 0;

  const calculations = [];
  const currentDate = new Date(startDate);

  while (remainingBalance > 0.01 && monthCount < 600) {
    monthCount++;

    const interestPayment = remainingBalance * monthlyRate;
    let principalPayment = monthlyPayment - interestPayment;
    let paidAmount;

    if (principalPayment >= remainingBalance) {
      principalPayment = remainingBalance;
      paidAmount = interestPayment + principalPayment;
    } else {
      paidAmount = monthlyPayment;
    }

    remainingBalance -= principalPayment;
    totalPrincipalPaid += principalPayment;
    totalInterestPaid += interestPayment;

    const dateStr = formatYearMonth(currentDate);

    calculations.push({
      date: dateStr,
      type: 'Monthly',
      payment: paidAmount,
      interest: interestPayment,
      principal: principalPayment,
      balance: remainingBalance,
      cumulativeInterest: totalInterestPaid,
      cumulativePrincipal: totalPrincipalPaid,
      percentPaid: (totalPrincipalPaid / loanAmount) * 100,
    });

    const canMakeExtra = extraPaymentCount === -1 || extraPaymentsMade < extraPaymentCount;
    if (annualExtra > 0 && canMakeExtra && currentDate.getMonth() + 1 === extraMonth && remainingBalance > 0.01) {
      const extraPrincipal = Math.min(annualExtra, remainingBalance);
      remainingBalance -= extraPrincipal;
      totalPrincipalPaid += extraPrincipal;
      extraPaymentsMade++;

      calculations.push({
        date: dateStr,
        type: 'Additional',
        payment: extraPrincipal,
        interest: 0,
        principal: extraPrincipal,
        balance: remainingBalance,
        cumulativeInterest: totalInterestPaid,
        cumulativePrincipal: totalPrincipalPaid,
        percentPaid: (totalPrincipalPaid / loanAmount) * 100,
      });
    }

    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  return { calculations, totalInterestPaid, totalPrincipalPaid, totalMonths: monthCount, payoffDate: currentDate };
}

// --- Display ---

function displayResults(withExtra, withoutExtra, loanAmount, hasExtra) {
  const withExtraTotalPaid = loanAmount + withExtra.totalInterestPaid;
  const withoutExtraTotalPaid = loanAmount + withoutExtra.totalInterestPaid;
  const durationDiff = withoutExtra.totalMonths - withExtra.totalMonths;
  const totalPaidDiff = withoutExtraTotalPaid - withExtraTotalPaid;
  const interestDiff = withoutExtra.totalInterestPaid - withExtra.totalInterestPaid;

  document.getElementById('withExtraDuration').textContent = formatDuration(withExtra.totalMonths);
  document.getElementById('withExtraPayoffDate').textContent = formatYearMonth(withExtra.payoffDate);
  document.getElementById('withExtraTotalPaid').textContent = formatCurrency(withExtraTotalPaid);
  document.getElementById('withExtraInterest').textContent = formatCurrency(withExtra.totalInterestPaid);
  document.getElementById('withExtraDurationDiff').textContent = `(${formatDuration(durationDiff)} faster)`;
  document.getElementById('withExtraPayoffDateDiff').textContent = `(${formatDuration(durationDiff)} faster)`;
  document.getElementById('withExtraTotalPaidDiff').textContent = `(${formatCurrency(totalPaidDiff)} less)`;
  document.getElementById('withExtraInterestDiff').textContent = `(${formatCurrency(interestDiff)} less)`;

  document.getElementById('withoutExtraDuration').textContent = formatDuration(withoutExtra.totalMonths);
  document.getElementById('withoutExtraPayoffDate').textContent = formatYearMonth(withoutExtra.payoffDate);
  document.getElementById('withoutExtraTotalPaid').textContent = formatCurrency(withoutExtraTotalPaid);
  document.getElementById('withoutExtraInterest').textContent = formatCurrency(withoutExtra.totalInterestPaid);

  document.getElementById('withExtraSection').style.display = hasExtra ? 'block' : 'none';

  const tableBody = document.getElementById('paymentTable');
  tableBody.innerHTML = '';
  const paidIndex = getPaidIndex();
  let checkboxIndex = 0;

  for (const row of withExtra.calculations) {
    const tr = document.createElement('tr');
    tr.className = row.type === 'Additional' ? 'type-additional' : 'type-monthly';

    let checkboxCell = '';
    if (row.type === 'Monthly') {
      const checked = paidIndex >= checkboxIndex ? 'checked' : '';
      checkboxCell = `<input class="form-check-input paid-check-boxes" type="checkbox" data-index="${checkboxIndex}" ${checked}>`;
      checkboxIndex++;
    }

    tr.innerHTML = `
      <td>${checkboxCell}</td>
      <td>${row.date}</td>
      <td><span class="badge-type ${row.type === 'Monthly' ? 'badge-monthly' : 'badge-additional'}">${row.type === 'Monthly' ? 'Monthly' : '⭐ Extra'}</span></td>
      <td>${formatCurrency(row.payment)}</td>
      <td>${formatCurrency(row.interest)}</td>
      <td>${formatCurrency(row.principal)}</td>
      <td>${formatCurrency(Math.max(0, row.balance))}</td>
      <td>${formatCurrency(row.cumulativeInterest)}</td>
      <td>${formatCurrency(row.cumulativePrincipal)}</td>
      <td>${row.percentPaid.toFixed(2)}%</td>
    `;
    tableBody.appendChild(tr);
  }

  document.getElementById('resultsSection').classList.add('show');
}

// --- Main entry point ---

function calculateMortgage() {
  const inputs = readFormInputs();

  if (!inputs.loanAmount || !inputs.interestRate || !inputs.monthlyPayment) {
    alert('Please fill in all required fields');
    return;
  }

  document.getElementById('loading').style.display = 'block';
  document.getElementById('resultsSection').classList.remove('show');

  setTimeout(() => {
    try {
      const withExtra = performCalculation(inputs);
      const withoutExtra = performCalculation({ ...inputs, annualExtra: 0 });
      displayResults(withExtra, withoutExtra, inputs.loanAmount, inputs.annualExtra > 0);
    } catch (error) {
      alert('Error during calculation: ' + error.message);
    } finally {
      document.getElementById('loading').style.display = 'none';
    }
  }, 100);
}

// --- Import / Export ---

function exportData() {
  const formData = localStorage.getItem('mortgageFormData');
  const json = JSON.stringify({
    inputs: JSON.parse(formData),
    paidIndex: getPaidIndex(),
  });

  const a = document.createElement('a');
  a.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(json);
  a.download = 'mortgage-calculator-data.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// --- Initialization ---

document.addEventListener('DOMContentLoaded', () => {
  const yearSelect = document.getElementById('startYear');
  const currentYear = new Date().getFullYear();
  for (let y = currentYear - 5; y <= currentYear + 40; y++) {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    if (y === 2026) opt.selected = true;
    yearSelect.appendChild(opt);
  }

  loadFormData();

  document.querySelectorAll('.form-control, .form-select').forEach(input => {
    input.addEventListener('change', saveFormData);
    input.addEventListener('input', saveFormData);
    input.addEventListener('keypress', e => {
      if (e.key === 'Enter') calculateMortgage();
    });
  });

  // Event delegation for paid checkboxes — avoids inline onclick in innerHTML
  document.getElementById('paymentTable').addEventListener('change', e => {
    if (e.target.classList.contains('paid-check-boxes')) {
      updatePaid(parseInt(e.target.dataset.index, 10));
    }
  });

  document.getElementById('importFileInput').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = event => {
      try {
        const { inputs, paidIndex } = JSON.parse(event.target.result);
        localStorage.setItem('mortgageFormData', JSON.stringify(inputs));
        savePaidIndex(paidIndex);
        loadFormData();
        calculateMortgage();
      } catch (error) {
        alert('Error importing data: ' + error.message);
      }
    };
    reader.readAsText(file);
  });

  calculateMortgage();
});
