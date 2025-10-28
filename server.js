require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const bodyParser = require('body-parser');
const rateLimit = require('express-rate-limit');
const moment = require('moment');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 🧠 Security Setup
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// 🛡️ Rate Limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
});
app.use(limiter);

// 🧱 Static files
app.use(express.static('public', {
  maxAge: '1d',
  etag: true
}));

// ⚙️ Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('✅ MongoDB Connected Successfully'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// 📦 Define Schemas
const clientSchema = new mongoose.Schema({
  name: String,
  tier: String,
  joined: String,
  status: String,
  email: String,
  phone: String,
  createdAt: { type: Date, default: Date.now }
});

const projectSchema = new mongoose.Schema({
  title: String,
  clientId: String,
  description: String,
  budget: Number,
  deadline: String,
  status: String,
  progress: Number,
  createdAt: { type: Date, default: Date.now }
});

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: String,
  clientId: String,
  projectId: String,
  amount: Number,
  description: String,
  dueDate: String,
  status: String,
  createdAt: { type: Date, default: Date.now }
});

const analyticsSchema = new mongoose.Schema({
  visits: Number,
  pending: Number,
  newClients: Number,
  payments: Number,
  revenue: Number,
  chartData: [Number],
  monthlyGrowth: Number,
  conversionRate: Number,
});

// 💾 Mongo Models
const Client = mongoose.model('Client', clientSchema);
const Project = mongoose.model('Project', projectSchema);
const Invoice = mongoose.model('Invoice', invoiceSchema);
const Analytics = mongoose.model('Analytics', analyticsSchema);

// 🔹 ROUTES

// DASHBOARD
app.get('/api/dashboard', async (req, res) => {
  try {
    const clients = await Client.find();
    const projects = await Project.find();
    const invoices = await Invoice.find();
    const analytics = await Analytics.findOne();

    res.json({
      clients,
      projects,
      invoices,
      analytics,
      performance: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: moment().format('YYYY-MM-DD HH:mm:ss')
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CLIENTS
app.get('/api/clients', async (req, res) => {
  const clients = await Client.find();
  res.json(clients);
});

app.post('/api/clients', async (req, res) => {
  try {
    const { name, tier, email, phone } = req.body;
    const newClient = await Client.create({
      name,
      tier,
      email,
      phone,
      joined: moment().format('MMM D, YYYY'),
      status: 'Active'
    });
    res.json(newClient);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PROJECTS
app.get('/api/projects', async (req, res) => {
  const projects = await Project.find();
  res.json(projects);
});

app.post('/api/projects', async (req, res) => {
  try {
    const project = await Project.create(req.body);
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// INVOICES
app.get('/api/invoices', async (req, res) => {
  const invoices = await Invoice.find();
  res.json(invoices);
});

app.post('/api/invoices', async (req, res) => {
  try {
    const { clientId, projectId, amount, description } = req.body;
    const invoice = await Invoice.create({
      invoiceNumber: `INV-${moment().format('YYMMDD')}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
      clientId,
      projectId,
      amount,
      description,
      dueDate: moment().add(15, 'days').format('YYYY-MM-DD'),
      status: 'Pending'
    });
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ANALYTICS
app.post('/api/analytics/update', async (req, res) => {
  try {
    const { field, value } = req.body;
    const analytics = await Analytics.findOne() || new Analytics();
    analytics[field] = value;
    await analytics.save();
    res.json(analytics);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CONTACT
app.post('/api/contact', async (req, res) => {
  try {
    console.log('📩 Contact form received:', req.body);
    res.json({ success: true, message: 'Your message has been received!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// HEALTH CHECK
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    uptime: process.uptime(),
    timestamp: moment().format('YYYY-MM-DD HH:mm:ss')
  });
});

// FRONTEND ROUTES
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/services', (req, res) => res.sendFile(path.join(__dirname, 'services.html')));
app.get('/pricing', (req, res) => res.sendFile(path.join(__dirname, 'pricing.html')));

// GLOBAL ERROR HANDLER
app.use((err, req, res, next) => {
  console.error('🔥 Error:', err);
  res.status(500).json({ error: 'Server Error', details: err.message });
});

// START SERVER
app.listen(PORT, () => {
  console.log(`🚀 PlugNation Server running on http://localhost:${PORT}`);
  console.log(`🧠 Mode: ${process.env.NODE_ENV}`);
});
