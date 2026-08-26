const express = require('express');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/**
 * Formats phone numbers to match Paystack's exact API requirements per country.
 * - KES (Kenya): Paystack expects local format ('07XXXXXXXX' or '01XXXXXXXX')
 * - GHS (Ghana): Paystack expects international format ('233XXXXXXXXX')
 * - UGX (Uganda): Paystack expects international format ('256XXXXXXXXX')
 */
function formatPhoneNumber(phone, currency) {
  let cleaned = phone.toString().trim().replace(/\D/g, ''); // Strip non-digits

  if (currency === 'KES') {
    // Convert 2547XXXXXXXX or 2541XXXXXXXX -> 07XXXXXXXX or 01XXXXXXXX
    if (cleaned.startsWith('254') && cleaned.length === 12) {
      cleaned = '0' + cleaned.substring(3);
    }
    // Convert 7XXXXXXXX or 1XXXXXXXX (9 digits) -> 07XXXXXXXX or 01XXXXXXXX
    else if (!cleaned.startsWith('0') && cleaned.length === 9) {
      cleaned = '0' + cleaned;
    }
  } else if (currency === 'GHS') {
    // Convert 02XXXXXXXX -> 2332XXXXXXXX
    if (cleaned.startsWith('0') && cleaned.length === 10) {
      cleaned = '233' + cleaned.substring(1);
    }
  } else if (currency === 'UGX') {
    // Convert 07XXXXXXXX -> 2567XXXXXXXX
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

  // Format number based on selected currency rules
  const formattedPhone = formatPhoneNumber(phone, currency);

  try {
    const response = await axios.post(
      'https://api.paystack.co/charge',
      {
        email: `user_${formattedPhone}@mobile.paystack`,
        amount: Math.round(parseFloat(amount) * 100), // Convert amount to subunits
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
