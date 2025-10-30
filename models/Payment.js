import mongoose from 'mongoose';

const PaymentSchema = new mongoose.Schema({
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  amount: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['pending','completed','failed'], default: 'pending' },
  method: { type: String, default: 'manual' },
  transactionId: { type: String, default: '' },
  notes: { type: String, default: '' },
  subscriptionExpiry: { type: Date, default: null },
}, { timestamps: true });

export default mongoose.model('Payment', PaymentSchema);
