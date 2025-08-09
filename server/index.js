import 'dotenv/config';
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import mongoose from 'mongoose';
import aiRouter from "./routes/ai.js";
import templatesRouter from "./routes/templates.js";
import gitRouter from "./routes/git.js";
import fsRouter from "./routes/fs.js";
import runRouter from "./routes/run.js";
import authRouter from "./routes/auth.js";

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Simple request logger
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  next();
});

// Routes
app.get("/favicon.ico", (req, res) => res.status(204).end());

app.get("/", (req, res) => {
  res.send(`
    <h2>AI Code Editor Backend</h2>
    <p>Server is running. API documentation:</p>
    <ul>
      <li><strong>GET /api/health</strong> - Check server status</li>
      <li><strong>POST /api/auth/login</strong> - User login</li>
      <li><strong>GET /api/auth/conversations</strong> - Get user conversations</li>
      <li><strong>GET /api/ai/chat</strong> - AI chat endpoint</li>
    </ul>
  `);
});

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok",
    mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

app.use("/api/ai", aiRouter);
app.use("/api/templates", templatesRouter);
app.use("/api/git", gitRouter);
app.use("/api/fs", fsRouter);
app.use("/api/run", runRouter);
app.use("/api/auth", authRouter);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message || 'An unexpected error occurred'
  });});

// Connect to MongoDB
let MONGODB_URI = process.env.MONGODB_URI;

// If no MongoDB URI is provided, use a local file-based database
if (!MONGODB_URI) {
  console.warn('No MONGODB_URI provided. Using local file-based database (not recommended for production)');
  const { MongoMemoryServer } = await import('mongodb-memory-server');
  const mongod = await MongoMemoryServer.create();
  MONGODB_URI = mongod.getUri();
}

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start server
const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`MongoDB: ${MONGODB_URI}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
});
