import express from 'express';
import { body, param } from 'express-validator';
import Plan from '../models/Plan.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

router.get('/', async (_req, res) => {
  const plans = await Plan.find().sort({ priceMonthly: 1 });
  res.json(plans);
});

router.post('/', auth('admin'),
  body('name').isString().notEmpty(),
  body('priceMonthly').isFloat({ min: 0 }),
  async (req, res) => {
    const plan = await Plan.create(req.body);
    res.status(201).json(plan);
  }
);

router.put('/:id', auth('admin'),
  param('id').isMongoId(),
  async (req, res) => {
    const updated = await Plan.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ error: 'Plan not found' });
    res.json(updated);
  }
);

router.delete('/:id', auth('admin'), async (req, res) => {
  const deleted = await Plan.findByIdAndDelete(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Plan not found' });
  res.json({ ok: true });
});

export default router;
