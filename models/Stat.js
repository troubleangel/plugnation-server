import mongoose from 'mongoose';

const StatSchema = new mongoose.Schema({
  visits: { type: Number, default: 0 },
  pending: { type: Number, default: 0 },
  newClients: { type: Number, default: 0 },
  payments: { type: Number, default: 0 },
  revenue: { type: Number, default: 0 },
  chartData: { type: [Number], default: [0,0,0,0,0,0,0] } // 7 days
});

export default mongoose.model('Stat', StatSchema);
