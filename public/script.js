const providerMap = {
  KES: [{ name: 'M-Pesa', value: 'mpesa' }],
  GHS: [
    { name: 'MTN Mobile Money', value: 'mtn' },
    { name: 'Vodafone Cash', value: 'vod' },
    { name: 'AirtelTigo', value: 'tgo' }
  ],
  UGX: [
    { name: 'MTN Uganda', value: 'mtn' },
    { name: 'Airtel Uganda', value: 'atl' }
  ]
};

// Dynamically update providers drop-down when currency changes
document.getElementById('currency').addEventListener('change', (e) => {
  const selectedCurrency = e.target.value;
  const providerSelect = document.getElementById('provider');
  providerSelect.innerHTML = '';

  const options = providerMap[selectedCurrency] || [];
  options.forEach((opt) => {
    const el = document.createElement('option');
    el.value = opt.value;
    el.innerText = opt.name;
    providerSelect.appendChild(el);
  });
});

document.getElementById('stkForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const phoneNumbers = document.getElementById('phoneNumbers').value.split('\n').map(p => p.trim()).filter(Boolean);
  const amount = document.getElementById('amount').value;
  const referencePrefix = document.getElementById('referencePrefix').value;
  const currency = document.getElementById('currency').value;
  const provider = document.getElementById('provider').value;
  const submitBtn = document.getElementById('submitBtn');
  const logBox = document.getElementById('logBox');

  if (phoneNumbers.length === 0) return alert('Please enter at least one phone number.');

  submitBtn.disabled = true;
  logBox.innerHTML = '';
  appendLog(`[INFO] Processing ${phoneNumbers.length} requests at 30 req/min limit...`, 'info');

  for (let i = 0; i < phoneNumbers.length; i++) {
    const phone = phoneNumbers[i];
    const uniqueRef = `${referencePrefix}_${Date.now()}_${i + 1}`;
    
    appendLog(`[${i + 1}/${phoneNumbers.length}] Sending STK Push to ${phone}...`, 'info');

    try {
      const response = await fetch('/api/stk-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, amount, reference: uniqueRef, currency, provider })
      });
      const data = await response.json();

      if (data.status) {
        appendLog(`[SUCCESS] ${phone} | Ref: ${uniqueRef} | Status: ${data.data.status || 'Prompt Sent'}`, 'success');
      } else {
        appendLog(`[FAILED] ${phone} | Error: ${JSON.stringify(data.error)}`, 'error');
      }
    } catch (err) {
      appendLog(`[ERROR] Network issue on ${phone}: ${err.message}`, 'error');
    }

    // Rate limit: 2000 ms delay enforces 30 requests/min maximum
    if (i < phoneNumbers.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  appendLog('[INFO] Bulk batch completion execution finished.', 'info');
  submitBtn.disabled = false;
});

function appendLog(message, type) {
  const logBox = document.getElementById('logBox');
  const div = document.createElement('div');
  div.className = `log-entry log-${type}`;
  div.innerText = `${new Date().toLocaleTimeString()} - ${message}`;
  logBox.appendChild(div);
  logBox.scrollTop = logBox.scrollHeight;
}
