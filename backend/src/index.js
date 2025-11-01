import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Pool } from "pg";
import mongoose from "mongoose";
import User from "./models/User.js";
import Event from "./models/Event.js";
import { register, login, authMiddleware } from "./auth.js";
import upload from "./upload.js";
import path from "path";
import { fileURLToPath } from "url";
import zkRoutes from "./routes/zk.js";
import spotifyRoutes from "./routes/spotify.js";

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure dotenv with explicit path and debug
dotenv.config({
  path: path.join(__dirname, "..", ".env"),
  debug: process.env.NODE_ENV !== "production",
});

const app = express();
const port = process.env.PORT || 4000;

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://192.168.1.10:3000",
      "https://kaizen-web3-app.vercel.app",
      "https://kaizen-web3-app-git-main-somewherelostt.vercel.app",
      "https://kaizen-x-delta.vercel.app",
      /^https:\/\/kaizen-web3-app-.*\.vercel\.app$/,
      /^https:\/\/kaizen-x-.*\.vercel\.app$/,
    ],
    credentials: true,
  })
);

app.use(express.json());
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

const pool = new Pool();

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// ZK Proof routes for GitHub verification
app.use("/api/zk", zkRoutes);

// Spotify OAuth and ZK verification routes
app.use("/api/spotify", spotifyRoutes);

// Simple wallet address validation middleware
const validateWalletAddress = (req, res, next) => {
  const walletAddress = req.headers["x-wallet-address"];
  if (!walletAddress) {
    return res.status(401).json({ error: "Wallet address required" });
  }

  // Basic Ethereum address validation
  if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    return res.status(400).json({ error: "Invalid wallet address format" });
  }

  req.walletAddress = walletAddress;
  next();
};

// Get user profile by wallet address
app.get("/api/users/me", validateWalletAddress, async (req, res) => {
  try {
    // Create a user profile based on wallet address if not exists
    let user = await User.findOne({ walletAddress: req.walletAddress });
    if (!user) {
      user = new User({
        walletAddress: req.walletAddress,
        username: `user_${req.walletAddress.slice(2, 8)}`, // Default username
        email: null, // No email required
      });
      await user.save();
    }
    res.json(user);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

// Event image upload (wallet protected)
app.post(
  "/api/events/:id/image",
  validateWalletAddress,
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file)
        return res.status(400).json({ error: "No image uploaded" });

      // Check if user is the event organizer
      const event = await Event.findById(req.params.id);
      if (!event) return res.status(404).json({ error: "Event not found" });
      if (event.organizerAddress !== req.walletAddress) {
        return res
          .status(403)
          .json({ error: "Only event organizer can upload images" });
      }

      const updatedEvent = await Event.findByIdAndUpdate(
        req.params.id,
        { imageUrl: `/uploads/${req.file.filename}` },
        { new: true }
      );
      res.json(updatedEvent);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(400).json({ error: message });
    }
  }
);

// --- USER CRUD (wallet protected) ---
app.post("/api/users", validateWalletAddress, async (req, res) => {
  try {
    const userData = {
      ...req.body,
      walletAddress: req.walletAddress,
    };
    const user = new User(userData);
    await user.save();
    res.status(201).json(user);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(400).json({ error: message });
  }
});

// User profile image upload (wallet protected)
app.post(
  "/api/users/:id/image",
  authMiddleware,
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file)
        return res.status(400).json({ error: "No image uploaded" });
      const user = await User.findByIdAndUpdate(
        req.params.id,
        { imageUrl: `/uploads/${req.file.filename}` },
        { new: true }
      );
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json(user);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(400).json({ error: message });
    }
  }
);

// Get all Users
app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

// Get User by ID
app.get("/api/users/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

// Update User
app.put("/api/users/:id", async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(400).json({ error: message });
  }
});

// Delete User
app.delete("/api/users/:id", async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ message: "User deleted" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

// --- EVENT CRUD ---
// Create Event (with image upload, wallet protected)
app.post(
  "/api/events",
  validateWalletAddress,
  upload.single("image"),
  async (req, res) => {
    try {
      const eventData = {
        title: req.body.title,
        description: req.body.description,
        date: new Date(req.body.date),
        location: req.body.location,
        price: parseFloat(req.body.price),
        seats: parseInt(req.body.seats),
        category: req.body.category || "Live shows",
        organizerAddress: req.walletAddress,
        contractEventId: req.body.contractEventId, // From smart contract
        transactionHash: req.body.transactionHash, // From blockchain transaction
      };

      // Validate date is in the future
      if (eventData.date <= new Date()) {
        return res
          .status(400)
          .json({ error: "Event date must be in the future" });
      }

      if (req.file) {
        eventData.imageUrl = `/uploads/${req.file.filename}`;
      }

      // Find or create user based on wallet address
      let user = await User.findOne({ walletAddress: req.walletAddress });
      if (!user) {
        user = new User({
          walletAddress: req.walletAddress,
          username: `user_${req.walletAddress.slice(2, 8)}`,
        });
        await user.save();
      }
      eventData.createdBy = user._id;

      const event = new Event(eventData);
      await event.save();
      res.status(201).json(event);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.log("Event creation error:", message);
      res.status(400).json({ error: message });
    }
  }
);

// Get all Events
app.get("/api/events", async (req, res) => {
  try {
    const events = await Event.find().populate("createdBy");
    res.json(events);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

// Search Events by name
app.get("/api/events/search/:query", async (req, res) => {
  try {
    const { query } = req.params;
    const events = await Event.find({
      title: { $regex: query, $options: "i" }, // Case-insensitive search
    }).populate("createdBy");
    res.json(events);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

// Get Event by ID
app.get("/api/events/:id", async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate("createdBy");
    if (!event) return res.status(404).json({ error: "Event not found" });
    res.json(event);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

// Update Event
app.put("/api/events/:id", async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!event) return res.status(404).json({ error: "Event not found" });
    res.json(event);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(400).json({ error: message });
  }
});

// Delete Event
app.delete("/api/events/:id", async (req, res) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) return res.status(404).json({ error: "Event not found" });
    res.json({ message: "Event deleted" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

// Join Event (with conditional ID requirements based on category)
app.post("/api/events/:id/join", validateWalletAddress, async (req, res) => {
  try {
    const { spotifyId, githubUsername, ticketTokenId } = req.body;
    const event = await Event.findById(req.params.id);

    if (!event) return res.status(404).json({ error: "Event not found" });

    // Check if user already joined
    const alreadyJoined = event.participants?.some(
      (p) => p.walletAddress === req.walletAddress
    );
    if (alreadyJoined) {
      return res.status(400).json({ error: "Already joined this event" });
    }

    // Validate required fields based on event category
    if (event.category === "Live shows" && !spotifyId) {
      return res.status(400).json({
        error: "Spotify ID is required for Live shows events",
      });
    }

    if (event.category === "Web3 Hackathon" && !githubUsername) {
      return res.status(400).json({
        error: "GitHub username is required for Web3 Hackathon events",
      });
    }

    // Add participant
    const participant = {
      walletAddress: req.walletAddress,
      spotifyId: event.category === "Live shows" ? spotifyId : undefined,
      githubUsername:
        event.category === "Web3 Hackathon" ? githubUsername : undefined,
      ticketTokenId,
      joinedAt: new Date(),
    };

    event.participants = event.participants || [];
    event.participants.push(participant);
    await event.save();

    res.json({
      success: true,
      message: "Successfully joined event",
      participant,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

// Check if user has joined an event
app.get(
  "/api/events/:id/check-joined",
  validateWalletAddress,
  async (req, res) => {
    try {
      const event = await Event.findById(req.params.id);
      if (!event) return res.status(404).json({ error: "Event not found" });

      const participant = event.participants?.find(
        (p) => p.walletAddress === req.walletAddress
      );

      res.json({
        joined: !!participant,
        participant: participant || null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(500).json({ error: message });
    }
  }
);

// Get event participants
app.get("/api/events/:id/participants", async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: "Event not found" });

    res.json({
      count: event.participants?.length || 0,
      participants: event.participants || [],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

// MongoDB connection
const dbUrl = process.env.DB_URL || process.env.DATABASE_URL;
console.log("🔍 Environment check:");
console.log("NODE_ENV:", process.env.NODE_ENV || "not set");
console.log(
  "DB_URL environment variable:",
  process.env.DB_URL ? "Set" : "NOT SET"
);
console.log(
  "DATABASE_URL environment variable:",
  process.env.DATABASE_URL ? "Set" : "NOT SET"
);
console.log(
  "Available environment variables:",
  Object.keys(process.env).filter(
    (key) => key.includes("DB") || key.includes("DATABASE")
  )
);

if (!dbUrl) {
  console.error(
    "❌ Neither DB_URL nor DATABASE_URL environment variable is set!"
  );
  console.error(
    "🔧 For Railway deployment: Set DB_URL in Railway Variables tab"
  );
  console.error(
    "🔧 For local development: Ensure .env file exists with DB_URL"
  );
  console.error("📁 Current working directory:", process.cwd());
  console.error("📁 __dirname:", __dirname);
  process.exit(1);
}

console.log("✅ Database URL found, attempting connection...");
console.log("🔒 Connection string preview:", dbUrl.substring(0, 20) + "...");

if (!dbUrl.startsWith("mongodb://") && !dbUrl.startsWith("mongodb+srv://")) {
  console.error("❌ Invalid MongoDB connection string format!");
  console.error("Expected format: mongodb:// or mongodb+srv://");
  console.error("Received:", dbUrl);
  process.exit(1);
}

mongoose.connect(dbUrl, {
  ssl: true,
});
const db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDB connection error:"));
db.once("open", function () {
  console.log("Connected to MongoDB");
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
