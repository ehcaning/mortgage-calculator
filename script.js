function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function calculateMortgage() {
  const loanAmount = parseFloat(document.getElementById('loanAmount').value);
  const interestRate = parseFloat(document.getElementById('interestRate').value);
  const monthlyPayment = parseFloat(document.getElementById('monthlyPayment').value);
  const annualExtra = parseFloat(document.getElementById('annualExtra').value);
  const extraMonth = parseInt(document.getElementById('extraMonth').value);
  const extraPaymentCount = parseInt(document.getElementById('extraPaymentCount').value);

  // Validation
  if (!loanAmount || !interestRate || !monthlyPayment) {
    alert('Please fill in all required fields');
    return;
  }

  // Show loading
  document.getElementById('loading').style.display = 'block';
  document.getElementById('resultsSection').classList.remove('show');

  // Calculate in a setTimeout to let the DOM update
  setTimeout(() => {
    try {
      const results = performCalculation(
        loanAmount,
        interestRate,
        monthlyPayment,
        annualExtra,
        extraMonth,
        extraPaymentCount,
      );
      displayResults(results, loanAmount);
    } catch (error) {
      alert('Error during calculation: ' + error.message);
    } finally {
      document.getElementById('loading').style.display = 'none';
    }
  }, 100);
}

function performCalculation(loanAmount, interestRate, monthlyPayment, annualExtra, extraMonth, extraPaymentCount) {
  const monthlyRate = interestRate / 100 / 12;
  let remainingBalance = loanAmount;
  let totalInterestPaid = 0;
  let totalPrincipalPaid = 0;
  let extraPaymentsMade = 0;

  const calculations = [];
  const startDate = new Date(2026, 0, 1); // January 2026
  let currentDate = new Date(startDate);

  let monthCount = 0;

  while (remainingBalance > 0.01 && monthCount < 600) {
    monthCount++;

    // Interest for this month
    const interestPayment = remainingBalance * monthlyRate;

    // Principal for regular payment
    let regularPrincipalPayment = monthlyPayment - interestPayment;

    // Check if loan will be paid off
    let regularPaidAmount;
    if (regularPrincipalPayment >= remainingBalance) {
      regularPrincipalPayment = remainingBalance;
      regularPaidAmount = interestPayment + regularPrincipalPayment;
    } else {
      regularPaidAmount = monthlyPayment;
    }

    // Update balances for monthly payment
    remainingBalance -= regularPrincipalPayment;
    totalPrincipalPaid += regularPrincipalPayment;
    totalInterestPaid += interestPayment;

    // Format date as YYYY-MM
    const dateStr = currentDate.getFullYear() + '-' + String(currentDate.getMonth() + 1).padStart(2, '0');

    // Add monthly payment
    const paidPrincipalPercentage = (totalPrincipalPaid / loanAmount) * 100;
    calculations.push({
      date: dateStr,
      type: 'Monthly',
      payment: regularPaidAmount,
      interest: interestPayment,
      principal: regularPrincipalPayment,
      balance: remainingBalance,
      cumulativeInterest: totalInterestPaid,
      cumulativePrincipal: totalPrincipalPaid,
      percentPaid: paidPrincipalPercentage,
    });

    // Check for extra payment
    const canMakeExtra = extraPaymentCount === -1 || extraPaymentsMade < extraPaymentCount;
    if (currentDate.getMonth() + 1 === extraMonth && remainingBalance > 0.01 && annualExtra > 0 && canMakeExtra) {
      const extraPrincipalPayment = Math.min(annualExtra, remainingBalance);

      remainingBalance -= extraPrincipalPayment;
      totalPrincipalPaid += extraPrincipalPayment;
      extraPaymentsMade++;

      const updatedPaidPrincipalPercentage = (totalPrincipalPaid / loanAmount) * 100;
      calculations.push({
        date: dateStr,
        type: 'Additional',
        payment: extraPrincipalPayment,
        interest: 0,
        principal: extraPrincipalPayment,
        balance: remainingBalance,
        cumulativeInterest: totalInterestPaid,
        cumulativePrincipal: totalPrincipalPaid,
        percentPaid: updatedPaidPrincipalPercentage,
      });
    }

    // Move to next month
    currentDate.setMonth(currentDate.getMonth() + 1);

    if (remainingBalance <= 0.01) {
      break;
    }
  }

  return {
    calculations: calculations,
    totalInterestPaid: totalInterestPaid,
    totalPrincipalPaid: totalPrincipalPaid,
    totalMonths: monthCount,
    payoffDate: currentDate,
  };
}

function displayResults(results, loanAmount) {
  const annualExtra = parseFloat(document.getElementById('annualExtra').value);
  const interestRate = parseFloat(document.getElementById('interestRate').value);
  const monthlyPayment = parseFloat(document.getElementById('monthlyPayment').value);

  // Format results with extra payments
  const withExtraYears = Math.floor(results.totalMonths / 12);
  const withExtraMonths = results.totalMonths % 12;
  const withExtraDateStr =
    results.payoffDate.getFullYear() + '-' + String(results.payoffDate.getMonth() + 1).padStart(2, '0');

  document.getElementById('withExtraDuration').textContent = `${withExtraYears}y ${withExtraMonths}m`;
  document.getElementById('withExtraTotalPaid').textContent = formatCurrency(loanAmount + results.totalInterestPaid);
  document.getElementById('withExtraInterest').textContent = formatCurrency(results.totalInterestPaid);
  document.getElementById('withExtraPayoffDate').textContent = withExtraDateStr;

  // Calculate scenario without extra payments
  const withoutExtraResults = performCalculation(
    loanAmount,
    interestRate,
    monthlyPayment,
    0, // No extra payments
    0, // Extra month doesn't matter
    0, // Extra payment count doesn't matter
  );

  const withoutExtraYears = Math.floor(withoutExtraResults.totalMonths / 12);
  const withoutExtraMonths = withoutExtraResults.totalMonths % 12;
  const withoutExtraDateStr =
    withoutExtraResults.payoffDate.getFullYear() +
    '-' +
    String(withoutExtraResults.payoffDate.getMonth() + 1).padStart(2, '0');

  document.getElementById('withoutExtraDuration').textContent = `${withoutExtraYears}y ${withoutExtraMonths}m`;
  document.getElementById('withoutExtraTotalPaid').textContent = formatCurrency(
    loanAmount + withoutExtraResults.totalInterestPaid,
  );
  document.getElementById('withoutExtraInterest').textContent = formatCurrency(withoutExtraResults.totalInterestPaid);
  document.getElementById('withoutExtraPayoffDate').textContent = withoutExtraDateStr;

  // Show/hide the "with extra payments" section
  const withExtraSection = document.getElementById('withExtraSection');
  if (annualExtra > 0) {
    withExtraSection.style.display = 'block';
  } else {
    withExtraSection.style.display = 'none';
  }

  // Build table using the results with extra payments
  const tableBody = document.getElementById('paymentTable');
  tableBody.innerHTML = '';

  results.calculations.forEach(row => {
    const tr = document.createElement('tr');
    tr.className = row.type === 'Additional' ? 'type-additional' : 'type-monthly';
    tr.innerHTML = `
                    <td>${row.date}</td>
                    <td><strong>${row.type}</strong></td>
                    <td>${formatCurrency(row.payment)}</td>
                    <td>${formatCurrency(row.interest)}</td>
                    <td>${formatCurrency(row.principal)}</td>
                    <td>${formatCurrency(Math.max(0, row.balance))}</td>
                    <td>${formatCurrency(row.cumulativeInterest)}</td>
                    <td>${formatCurrency(row.cumulativePrincipal)}</td>
                    <td>${row.percentPaid.toFixed(2)}%</td>
                `;
    tableBody.appendChild(tr);
  });

  // Show results section
  document.getElementById('resultsSection').classList.add('show');
}

// LocalStorage functions
function saveFormData() {
  const formData = {
    loanAmount: document.getElementById('loanAmount').value,
    interestRate: document.getElementById('interestRate').value,
    monthlyPayment: document.getElementById('monthlyPayment').value,
    annualExtra: document.getElementById('annualExtra').value,
    extraMonth: document.getElementById('extraMonth').value,
    extraPaymentCount: document.getElementById('extraPaymentCount').value,
  };
  localStorage.setItem('mortgageFormData', JSON.stringify(formData));
}

function loadFormData() {
  const savedData = localStorage.getItem('mortgageFormData');
  if (savedData) {
    const formData = JSON.parse(savedData);
    document.getElementById('loanAmount').value = formData.loanAmount || '400000';
    document.getElementById('interestRate').value = formData.interestRate || '3.45';
    document.getElementById('monthlyPayment').value = formData.monthlyPayment || '2000';
    document.getElementById('annualExtra').value = formData.annualExtra || '3000';
    document.getElementById('extraMonth').value = formData.extraMonth || '6';
    document.getElementById('extraPaymentCount').value = formData.extraPaymentCount || '-1';
  }
}

// Allow Enter key to submit
document.addEventListener('DOMContentLoaded', function () {
  // Load saved form data from localStorage
  loadFormData();

  const inputs = document.querySelectorAll('.form-control, .form-select');

  // Add change listeners to save data on every input change
  inputs.forEach(input => {
    input.addEventListener('change', saveFormData);
    input.addEventListener('input', saveFormData);

    // Keep Enter key functionality
    input.addEventListener('keypress', function (e) {
      if (e.key === 'Enter') {
        calculateMortgage();
      }
    });
  });

  // Initial calculation on page load
  calculateMortgage();
});
