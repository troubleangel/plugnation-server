import mongoose from 'mongoose';

const TicketSchema = new mongoose.Schema({
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  status: { type: String, enum: ['open','in_progress','closed'], default: 'open' },
  priority: { type: String, enum: ['low','medium','high'], default: 'medium' },
}, { timestamps: true });

export default mongoose.model('Ticket', TicketSchema);
