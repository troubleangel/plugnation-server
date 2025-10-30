import express from 'express';
import { body, param } from 'express-validator';
import Ticket from '../models/Ticket.js';
import Client from '../models/Client.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

router.get('/', auth(), async (_req, res) => {
  const tickets = await Ticket.find().sort({ createdAt: -1 }).limit(100);
  res.json(tickets);
});

router.post('/', auth(),
  body('clientId').isMongoId(),
  body('subject').isString().notEmpty(),
  body('message').isString().notEmpty(),
  async (req, res) => {
    const { clientId, subject, message, priority } = req.body;
    const client = await Client.findById(clientId);
    if (!client) return res.status(404).json({ error: 'Client not found' });
    const ticket = await Ticket.create({ clientId, subject, message, priority });
    res.status(201).json(ticket);
  }
);

router.put('/:id/status', auth(), param('id').isMongoId(), async (req, res) => {
  const { status } = req.body;
  const ticket = await Ticket.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  res.json(ticket);
});

router.delete('/:id', auth('admin'), async (req, res) => {
  const del = await Ticket.findByIdAndDelete(req.params.id);
  if (!del) return res.status(404).json({ error: 'Ticket not found' });
  res.json({ ok: true });
});

export default router;
