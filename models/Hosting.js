import mongoose from "mongoose";

const HostingSchema = new mongoose.Schema({
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true },
  domain: { type: String, required: true },
  plan: { type: String, enum: ["Free", "Basic", "Pro"], default: "Free" },
  status: { type: String, enum: ["Active", "Suspended", "Deleted"], default: "Active" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

HostingSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model("Hosting", HostingSchema);
