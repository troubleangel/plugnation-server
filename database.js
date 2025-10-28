const mongoose = require('mongoose');
require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const moment = require('moment');

// 1️⃣ MongoDB Connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB Connected Successfully: ${conn.connection.host}`);
  } catch (err) {
    console.error(`❌ MongoDB Connection Failed: ${err.message}`);
    process.exit(1);
  }
};

// 2️⃣ Local JSON Backup Manager
class AdvancedDataManager {
  constructor(entityName) {
    this.entityName = entityName;
    this.filePath = path.join(__dirname, 'data', `${entityName}.json`);
    this.backupPath = path.join(__dirname, 'data', 'backups', `${entityName}`);
    this.init();
  }

  async init() {
    try {
      await fs.access(path.dirname(this.filePath));
    } catch {
      await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    }

    try {
      await fs.access(path.dirname(this.backupPath));
    } catch {
      await fs.mkdir(path.dirname(this.backupPath), { recursive: true });
    }
  }

  async read() {
    try {
      const data = await fs.readFile(this.filePath, 'utf8');
      return JSON.parse(data);
    } catch {
      return this.getDefaultData();
    }
  }

  getDefaultData() {
    const defaults = {
      clients: [],
      analytics: [{
        visits: 600,
        pending: 400,
        newClients: 100,
        payments: 50,
        revenue: 125000,
        chartData: [80, 60, 40, 70, 90, 50, 75],
        monthlyGrowth: 15,
        conversionRate: 3.2,
        kpi: {
          customerSatisfaction: 95,
          responseTime: 2.1,
          projectCompletion: 88
        }
      }],
      projects: [],
      invoices: [],
      contacts: []
    };
    return defaults[this.entityName] || [];
  }

  async write(data) {
    try {
      await this.createBackup();
      await fs.writeFile(this.filePath, JSON.stringify(data, null, 2));
      await fs.writeFile(
        this.filePath.replace('.json', '.pretty.json'),
        JSON.stringify(data, null, 2)
      );
      return true;
    } catch (error) {
      console.error(`Error writing ${this.entityName}:`, error);
      throw error;
    }
  }

  async createBackup() {
    try {
      const data = await this.read();
      const timestamp = moment().format('YYYYMMDD-HHmmss');
      const backupFile = `${this.backupPath}-${timestamp}.json`;
      await fs.writeFile(backupFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Backup failed:', error);
    }
  }

  async query(conditions = {}) {
    const items = await this.read();
    return items.filter(item => {
      return Object.entries(conditions).every(([key, value]) => item[key] === value);
    });
  }

  async findOne(conditions) {
    const items = await this.read();
    return items.find(item => {
      return Object.entries(conditions).every(([key, value]) => item[key] === value);
    });
  }

  async getStats() {
    const items = await this.read();
    return {
      total: items.length,
      lastUpdated: moment().format('YYYY-MM-DD HH:mm:ss'),
      entity: this.entityName
    };
  }

  async search(searchTerm, fields = []) {
    const items = await this.read();
    const searchLower = searchTerm.toLowerCase();
    return items.filter(item =>
      fields.some(field => {
        const value = item[field];
        return value && value.toString().toLowerCase().includes(searchLower);
      })
    );
  }

  async paginate(page = 1, limit = 10, sortBy = 'id', order = 'asc') {
    const items = await this.read();
    const sorted = items.sort((a, b) =>
      order === 'asc' ? (a[sortBy] > b[sortBy] ? 1 : -1) : (a[sortBy] < b[sortBy] ? 1 : -1)
    );

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    return {
      data: sorted.slice(startIndex, endIndex),
      pagination: {
        current: page,
        pages: Math.ceil(items.length / limit),
        total: items.length,
        hasNext: endIndex < items.length,
        hasPrev: page > 1
      }
    };
  }
}

// 3️⃣ Export everything together
module.exports = {
  connectDB,
  clients: new AdvancedDataManager('clients'),
  projects: new AdvancedDataManager('projects'),
  invoices: new AdvancedDataManager('invoices'),
  analytics: new AdvancedDataManager('analytics'),
  contacts: new AdvancedDataManager('contacts'),
  AdvancedDataManager
};
