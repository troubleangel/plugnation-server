import express from 'express';
import { body, param } from 'express-validator';
import { validate } from '../middleware/validate.js';
import Client from '../models/Client.js';
import Payment from '../models/Payment.js';
import Notification from '../models/Notification.js';
import Stat from '../models/Stat.js';

const router = express.Router();

// Helper to get or create stats
async function getStats() {
  let stats = await Stat.findOne();
  if (!stats) stats = await Stat.create({});
  return stats;
}

// GET Dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const clients = await Client.find();
    const notifications = await Notification.find().sort({ time: -1 }).limit(10);
    const stats = await getStats();
    res.json({ clients, analytics: stats, notifications });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Dashboard load failed' });
  }
});

// POST add client
router.post('/clients',
  body('name').isString().notEmpty(),
  body('tier').optional().isIn(['Free','Premium']),
  validate,
  async (req, res) => {
  try {
    const { name, tier, mpesaPhone } = req.body;
    const client = await Client.create({
      name,
      tier,
      mpesaPhone,
      subscriptionStatus: tier === 'Premium' ? 'Active' : 'None',
    });

    if (tier === 'Premium') {
      await Notification.create({
        type: 'premium',
        title: `${name} upgraded to Premium`,
        message: 'New premium client joined',
      });
      // Emit via Socket.IO
      req.app.get('io')?.emit('tierChanged', { client });
    }

    res.status(201).json(client);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to add client' });
  }
});

// PUT update client tier
router.put('/clients/:id/tier',
  param('id').isMongoId(),
  body('tier').isIn(['Free','Premium']),
  validate,
  async (req, res) => {
  try {
    const { tier } = req.body;
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ error: 'Client not found' });

    client.tier = tier;
    client.subscriptionStatus = tier === 'Premium' ? 'Active' : 'None';
    if (tier === 'Premium') client.subscriptionExpiry = new Date(Date.now() + 30*24*60*60*1000); // 30-day default
    await client.save();

    const notif = await Notification.create({
      type: 'premium',
      title: `${client.name} tier changed to ${tier}`,
      message: '',
    });

    req.app.get('io')?.emit('tierChanged', { client });

    res.json(client);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to update tier' });
  }
});

// (payments route removed; handled under /api/payments)

export default router;
