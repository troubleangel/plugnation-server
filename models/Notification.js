import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema({
  type: { type: String, enum: ['payment','premium','free','system','new-client'], required: true },
  title: { type: String, required: true },
  message: { type: String },
  time: { type: Date, default: Date.now }
});

export default mongoose.model('Notification', NotificationSchema);
