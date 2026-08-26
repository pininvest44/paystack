document.getElementById('stkForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const phoneNumbers = document.getElementById('phoneNumbers').value.split('\n').map(p => p.trim()).filter(Boolean);
  const amount = document.getElementById('amount').value;
  const referencePrefix = document.getElementById('referencePrefix').value;
  const currency = document.getElementById('currency').value;
  const submitBtn = document.getElementById('submitBtn');
  const logBox = document.getElementById('logBox');

  if (phoneNumbers.length === 0) return alert('Please enter at least one phone number.');

  submitBtn.disabled = true;
  logBox.innerHTML = '';
  appendLog(`[INFO] Processing ${phoneNumbers.length} requests at 30 req/min (2-sec delay between items)...`, 'info');

  for (let i = 0; i < phoneNumbers.length; i++) {
    const phone = phoneNumbers[i];
    const uniqueRef = `${referencePrefix}_${Date.now()}_${i + 1}`;
    
    appendLog(`[${i + 1}/${phoneNumbers.length}] Sending STK Push to ${phone}...`, 'info');

    try {
      const response = await fetch('/api/stk-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, amount, reference: uniqueRef, currency })
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

    // Rate limiter: 2000 ms delay enforces 30 requests/min maximum
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
