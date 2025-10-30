import mongoose from 'mongoose';

const PlanSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  priceMonthly: { type: Number, required: true, min: 0 },
  features: { type: [String], default: [] },
  limits: {
    sites: { type: Number, default: 1 },
    bandwidthGb: { type: Number, default: 50 },
    storageGb: { type: Number, default: 10 },
  },
}, { timestamps: true });

export default mongoose.model('Plan', PlanSchema);
