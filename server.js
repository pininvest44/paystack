const express = require('express');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper: Format local and international phone formats into Paystack-compliant E.164 strings
function formatPhoneNumber(phone, currency) {
  let cleaned = phone.toString().trim().replace(/\D/g, ''); // Strip all non-digits

  if (currency === 'KES') {
    // Kenya: 07XXXXXXXX or 01XXXXXXXX -> 2547XXXXXXXX / 2541XXXXXXXX
    if (cleaned.startsWith('0') && cleaned.length === 10) {
      cleaned = '254' + cleaned.substring(1);
    }
  } else if (currency === 'GHS') {
    // Ghana: 02X / 05X -> 2332X / 2335X
    if (cleaned.startsWith('0') && cleaned.length === 10) {
      cleaned = '233' + cleaned.substring(1);
    }
  } else if (currency === 'UGX') {
    // Uganda: 07X -> 2567X
    if (cleaned.startsWith('0') && cleaned.length === 10) {
      cleaned = '256' + cleaned.substring(1);
    }
  }

  return cleaned;
}

app.post('/api/stk-push', async (req, res) => {
  const { phone, amount, reference, currency = 'KES', provider = 'mpesa' } = req.body;

  if (!phone || !amount || !reference) {
    return res.status(400).json({ status: false, message: 'Missing required parameters.' });
  }

  const formattedPhone = formatPhoneNumber(phone, currency);

  try {
    const response = await axios.post(
      'https://api.paystack.co/charge',
      {
        email: `user_${formattedPhone}@mobile.paystack`,
        amount: Math.round(parseFloat(amount) * 100), // Convert to subunit
        currency: currency,
        reference: reference,
        mobile_money: {
          phone: formattedPhone,
          provider: provider
        }
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return res.json({ status: true, data: response.data.data });
  } catch (error) {
    const errorData = error.response ? error.response.data : { message: error.message };
    return res.status(error.response?.status || 500).json({ status: false, error: errorData });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
