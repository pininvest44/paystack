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
 * Strict Phone Number Formatter:
 * - KES: Converts '254799801070' -> '0799801070' (Local format required by Paystack M-Pesa)
 * - GHS: Converts '0241234567' -> '233241234567' (International format)
 * - UGX: Converts '0771234567' -> '256771234567' (International format)
 */
function formatPhoneNumber(phone, currency) {
  if (!phone) return '';
  let cleaned = phone.toString().trim().replace(/\D/g, ''); // Strip all non-digits

  if (currency === 'KES') {
    // 12 digits starting with 254 -> Convert 2547... to 07... or 2541... to 01...
    if (cleaned.startsWith('254') && cleaned.length === 12) {
      cleaned = '0' + cleaned.substring(3);
    } 
    // 9 digits missing leading zero (e.g., 799801070) -> Convert to 0799801070
    else if (!cleaned.startsWith('0') && cleaned.length === 9) {
      cleaned = '0' + cleaned;
    }
  } else if (currency === 'GHS') {
    if (cleaned.startsWith('0') && cleaned.length === 10) {
      cleaned = '233' + cleaned.substring(1);
    }
  } else if (currency === 'UGX') {
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

  // Format the phone number string explicitly
  const formattedPhone = formatPhoneNumber(phone, currency);

  try {
    const response = await axios.post(
      'https://api.paystack.co/charge',
      {
        email: `user_${formattedPhone}@mobile.paystack`,
        amount: Math.round(parseFloat(amount) * 100), // Convert to subunit (e.g. Kobo/Pesewas)
        currency: currency,
        reference: reference,
        mobile_money: {
          phone: formattedPhone, // MUST pass '0799801070' for Kenya
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
