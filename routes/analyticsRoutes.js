import express from 'express';
import Stat from '../models/Stat.js';
import Payment from '../models/Payment.js';
import Client from '../models/Client.js';

const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    const statsDoc = await Stat.findOne();
    const base = statsDoc?.toObject?.() || {};
    const totals = {
      clients: await Client.countDocuments(),
      payments: await Payment.countDocuments({ status: 'completed' }),
      revenue: (await Payment.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]))[0]?.total || 0,
    };
    res.json({ ...base, ...totals });
  } catch (e) {
    res.status(500).json({ error: 'Failed to load analytics' });
  }
});

export default router;
