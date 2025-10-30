import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import Client from '../models/Client.js';
import Hosting from '../models/Hosting.js';
import Plan from '../models/Plan.js';
import { ensureARecord } from '../utils/cloudflareClient.js';
import { body, param } from 'express-validator';
import { validate } from '../middleware/validate.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLIENTS_DIR = path.join(__dirname, '..', 'hosted_clients');

// Serve client homepage
router.get('/sites/:clientId', async (req, res) => {
  try {
    const client = await Client.findById(req.params.clientId);
    if (!client) return res.status(404).json({ error: 'Client not found' });
    if (client.subscriptionStatus !== 'Active') return res.status(403).json({ error: 'Subscription inactive' });

    const clientPath = path.join(CLIENTS_DIR, client._id.toString(), 'index.html');
    if (!fs.existsSync(clientPath)) return res.status(404).json({ error: 'Client site not found' });

    res.sendFile(clientPath);
  } catch (err) {
    console.error('Hosting error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Serve client static assets (JS/CSS/images)
router.use('/sites/:clientId/assets', async (req, res, next) => {
  try {
    const clientId = req.params.clientId;
    const assetPath = path.join(CLIENTS_DIR, clientId, 'assets');
    if (!fs.existsSync(assetPath)) return res.status(404).json({ error: 'Assets not found' });
    express.static(assetPath)(req, res, next);
  } catch (err) {
    next(err);
  }
});

export default router;

// =============================
// CRUD: Hosting accounts and domain linking
// =============================

// List hosting accounts
router.get('/hosting', async (_req, res) => {
  const records = await Hosting.find().sort({ createdAt: -1 }).limit(100);
  res.json(records);
});

// Create hosting account
router.post('/hosting',
  body('clientId').isMongoId(),
  body('domain').optional().isString(),
  body('plan').optional().isString(),
  validate,
  async (req, res) => {
  try {
    const { clientId, domain, plan } = req.body;
    const client = await Client.findById(clientId);
    if (!client) return res.status(404).json({ error: 'Client not found' });
    // Enforce plan site limits
    let maxSites = 1;
    if (client.planId) {
      const planDoc = await Plan.findById(client.planId);
      if (planDoc) maxSites = planDoc.limits?.sites ?? 1;
    } else if (client.planName === 'Premium') {
      maxSites = 3; // sensible default if using name-only
    }
    const currentSites = await Hosting.countDocuments({ clientId });
    if (currentSites >= maxSites) return res.status(403).json({ error: 'Plan site limit reached' });
    const record = await Hosting.create({ clientId, domain, plan: plan || 'Free', status: 'Active' });
    res.status(201).json(record);
  } catch (e) {
    console.error('Create hosting error:', e);
    res.status(500).json({ error: 'Failed to create hosting' });
  }
});

// Update hosting (domain/plan/status)
router.put('/hosting/:id',
  param('id').isMongoId(),
  validate,
  async (req, res) => {
  const updated = await Hosting.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!updated) return res.status(404).json({ error: 'Hosting not found' });
  res.json(updated);
});

// Delete hosting
router.delete('/hosting/:id',
  param('id').isMongoId(),
  validate,
  async (req, res) => {
  const del = await Hosting.findByIdAndDelete(req.params.id);
  if (!del) return res.status(404).json({ error: 'Hosting not found' });
  res.json({ ok: true });
});

// Link or update domain for a client hosting
router.put('/hosting/:id/domain',
  param('id').isMongoId(),
  body('domain').isString().notEmpty(),
  validate,
  async (req, res) => {
  const { domain } = req.body;
  const updated = await Hosting.findByIdAndUpdate(req.params.id, { domain }, { new: true });
  if (!updated) return res.status(404).json({ error: 'Hosting not found' });
  // Attempt to create DNS record via Cloudflare if configured
  try { await ensureARecord(domain); } catch {}
  res.json(updated);
});
