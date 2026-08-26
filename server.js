const express = require('express');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper: Delay execution for rate limiting (30 requests/min = 2000ms delay)
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

app.post('/api/stk-push', async (req, res) => {
  const { phone, amount, reference, currency = 'KES' } = req.body;

  if (!phone || !amount || !reference) {
    return res.status(400).json({ status: false, message: 'Missing required parameters.' });
  }

  try {
    // Paystack Charge API for Mobile Money Prompt
    const response = await axios.post(
      'https://api.paystack.co/charge',
      {
        email: `user_${phone}@mobile.paystack`, // System email placeholder
        amount: Math.round(parseFloat(amount) * 100), // Convert to subunit (e.g., Kobo/Pesewas/Cents)
        currency: currency,
        reference: reference,
        mobile_money: {
          phone: phone,
          provider: 'mpesa' // Adjust provider as required (e.g., mpesa, MTN, Airtel)
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
