import mongoose from 'mongoose';

const ClientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  tier: { type: String, enum: ['Free','Premium'], default: 'Free' },
  subscriptionStatus: { type: String, enum: ['None','Pending','Active'], default: 'None' },
  joined: { type: Date, default: Date.now },
  revenueGenerated: { type: Number, default: 0 },

  // God Mode enhancements
  mpesaPhone: { type: String, default: '' }, // client payment number
  lastPayment: { type: Date, default: null }, // timestamp of last successful payment
  subscriptionExpiry: { type: Date, default: null }, // automatic downgrade tracking
  planId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', default: null },
  planName: { type: String, default: '' },
  notifications: [
    {
      type: { type: String, enum: ['info','success','warning','error'], default: 'info' },
      message: { type: String },
      timestamp: { type: Date, default: Date.now }
    }
  ]
});

// Optional: auto-update subscriptionStatus based on expiry
ClientSchema.pre('save', function(next) {
  if(this.subscriptionExpiry && new Date() > this.subscriptionExpiry) {
    this.tier = 'Free';
    this.subscriptionStatus = 'None';
  }
  next();
});

export default mongoose.model('Client', ClientSchema);
