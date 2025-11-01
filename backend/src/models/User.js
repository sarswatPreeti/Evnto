import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  walletAddress: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  email: { type: String }, // Optional since we use wallet auth
  imageUrl: { type: String },
  subtitle: { type: String },
  bio: { type: String },
  social: {
    twitter: { type: String },
    instagram: { type: String },
    website: { type: String },
  },
  // Remove password field since we use wallet authentication
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model("User", userSchema);
export default User;
