import mongoose from "mongoose";

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  date: { type: Date, required: true },
  location: { type: String, required: true },
  imageUrl: { type: String },
  price: { type: Number, required: true, min: 0 },
  seats: { type: Number, required: true, min: 1 },
  category: {
    type: String,
    required: true,
    enum: [
      "Web3 Hacks",
      "Live shows",
      "Tourism",
      "Fever Origin",
      "Conference",
      "Workshop",
      "Other",
    ],
    default: "Web3 Hacks",
  },
  organizerAddress: { type: String, required: true }, // Wallet address of event organizer
  contractEventId: { type: Number }, // ID from the smart contract
  transactionHash: { type: String }, // Hash of the creation transaction
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now },
});

const Event = mongoose.model("Event", eventSchema);
export default Event;
