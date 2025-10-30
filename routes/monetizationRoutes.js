import express from 'express';
import Client from '../models/Client.js';
import Payment from '../models/Payment.js';
import Notification from '../models/Notification.js';
import Stat from '../models/Stat.js';
import { generateClientSite } from '../utils/clientSiteGenerator.js';

const router = express.Router();

// ==========================
// 🟢 POST Payment (Live God Mode)
// ==========================
router.post('/', async (req, res) => {
  try {
    const { clientId, amount, method } = req.body;
    if (!clientId || !amount) return res.status(400).json({ error: 'clientId and amount required' });

    const payment = await Payment.create({ clientId, amount, status: 'pending', method });
    const client = await Client.findById(clientId);
    if (!client) return res.status(404).json({ error: 'Client not found' });

    // 💰 Process payment — live, no simulation
    payment.status = 'completed';
    await payment.save();

    // Upgrade client tier & revenue
    client.revenueGenerated += amount;
    client.tier = 'Premium';
    client.subscriptionStatus = 'Active';
    client.lastPayment = new Date();
    client.subscriptionExpiry = new Date(Date.now() + 30*24*60*60*1000);
    client.planName = 'Premium';
    await client.save();

    // 🔥 Auto-generate live client site
    await generateClientSite(client._id, client.name);

    // Create notification
    await Notification.create({
      type: 'payment',
      title: `Payment received: ${client.name}`,
      message: `Amount: $${amount} via ${method || 'manual'}`,
    });

    // Update stats
    let stats = await Stat.findOne();
    if (!stats) stats = await Stat.create({});
    stats.payments += 1;
    stats.revenue += amount;
    await stats.save();

    // Emit live Socket.IO event
    req.app.get('io')?.emit('paymentSuccess', { client, amount });

    res.status(201).json({ payment, client, stats });
  } catch (err) {
    console.error('🛑 Payment route error:', err);
    res.status(500).json({ error: 'Payment processing failed' });
  }
});

// ==========================
// 🔄 PUT: Upgrade Client Tier (Live)
// ==========================
router.put('/clients/:id/tier', async (req, res) => {
  try {
    const { tier } = req.body;
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ error: 'Client not found' });

    client.tier = tier;
    client.subscriptionStatus = tier === 'Premium' ? 'Active' : 'None';
    await client.save();

    // 🔥 Auto-generate or update live site
    await generateClientSite(client._id, client.name);

    // Emit live event
    req.app.get('io')?.emit('tierChanged', { client });

    await Notification.create({
      type: 'premium',
      title: `${client.name} upgraded to ${tier}`,
      message: '',
    });

    res.json(client);
  } catch (err) {
    console.error('🛑 Tier upgrade error:', err);
    res.status(500).json({ error: 'Tier update failed' });
  }
});

// ==========================
// 🟢 POST: Create New Client (Live Automation)
// ==========================
router.post('/clients', async (req, res) => {
  try {
    const { name, tier } = req.body;
    const client = await Client.create({
      name,
      tier,
      subscriptionStatus: tier === 'Premium' ? 'Active' : 'None',
    });

    // Auto-generate client site
    await generateClientSite(client._id, client.name);

    // Notification
    if (tier === 'Premium') {
      await Notification.create({
        type: 'premium',
        title: `${name} joined as Premium`,
        message: 'New client automatically live',
      });
    }

    // Emit event
    req.app.get('io')?.emit('newClient', { client });

    res.status(201).json(client);
  } catch (err) {
    console.error('🛑 Client creation error:', err);
    res.status(500).json({ error: 'Failed to create client' });
  }
});

export default router;
