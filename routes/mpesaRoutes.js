import express from 'express';
import axios from 'axios';
import Client from '../models/Client.js';
import Payment from '../models/Payment.js';
import Notification from '../models/Notification.js';
import Stat from '../models/Stat.js';

const router = express.Router();

// 1️⃣ Initiate MPesa STK Push
router.post('/initiate', async (req, res) => {
  try {
    const { clientId, amount, phoneNumber } = req.body;
    if (!clientId || !amount || !phoneNumber)
      return res.status(400).json({ error: 'clientId, amount, and phoneNumber are required' });

    const client = await Client.findById(clientId);
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const payment = await Payment.create({ clientId, amount, status: 'pending', method: 'mpesa' });

    const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
    const shortcode = process.env.MPESA_SHORTCODE;
    const passkey = process.env.MPESA_PASSKEY;
    const password = Buffer.from(shortcode + passkey + timestamp).toString('base64');

    const stkRequestBody = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: amount,
      PartyA: phoneNumber,
      PartyB: shortcode,
      PhoneNumber: phoneNumber,
      CallBackURL: `${process.env.BASE_URL || ''}/api/payments/mpesa/callback`,
      AccountReference: client.name,
      TransactionDesc: `Payment for ${client.name}`,
    };

    const tokenRes = await axios.get('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
      auth: { username: process.env.MPESA_CONSUMER_KEY, password: process.env.MPESA_CONSUMER_SECRET },
    });

    const accessToken = tokenRes.data.access_token;

    const stkRes = await axios.post('https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest', stkRequestBody, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const checkoutId = stkRes?.data?.CheckoutRequestID;
    if (checkoutId) {
      payment.transactionId = checkoutId;
      await payment.save();
    }

    return res.json({ payment, stkResponse: stkRes.data });
  } catch (err) {
    console.error('🛑 MPesa initiation error:', err.message || err);
    res.status(500).json({ error: 'Failed to initiate payment' });
  }
});

// 2️⃣ MPesa Callback Webhook
router.post('/callback', async (req, res) => {
  try {
    const { Body } = req.body || {};
    const resultCode = Body?.stkCallback?.ResultCode;
    const amount = Body?.stkCallback?.CallbackMetadata?.Item?.find?.(i => i.Name === 'Amount')?.Value;
    const checkoutRequestID = Body?.stkCallback?.CheckoutRequestID;

    const payment = await Payment.findOne({ transactionId: checkoutRequestID });
    if (!payment) return res.status(404).json({ error: 'Payment not found' });

    if (resultCode === 0) {
      payment.status = 'completed';
      if (amount) payment.amount = amount;
      await payment.save();

      const client = await Client.findById(payment.clientId);
      if (client) {
        client.revenueGenerated += payment.amount;
        client.tier = 'Premium';
        client.subscriptionStatus = 'Active';
        await client.save();
      }

      await Notification.create({
        type: 'payment',
        title: `Payment received: ${client?.name || payment.clientId}`,
        message: `Amount: $${payment.amount} via Mpesa`,
      });

      let stats = await Stat.findOne();
      if (!stats) stats = await Stat.create({});
      stats.payments += 1;
      stats.revenue += payment.amount;
      await stats.save();

      req.app.get('io')?.emit('paymentSuccess', { clientId: payment.clientId, amount: payment.amount });
    } else {
      payment.status = 'failed';
      await payment.save();
      req.app.get('io')?.emit('paymentFailed', { paymentId: payment._id });
    }

    res.json({ status: 'ok' });
  } catch (err) {
    console.error('🛑 MPesa callback error:', err.message || err);
    res.status(500).json({ error: 'Payment callback processing failed' });
  }
});

export default router;
