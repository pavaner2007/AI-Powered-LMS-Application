// backend/server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from backend/.env
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Import Sequelize instance and models
const { sequelize } = require('./models');

// Import route files
const authRoutes = require('./routes/auth');
const courseRoutes = require('./routes/courses');
const enrollmentRoutes = require('./routes/enrollments');
const assignmentRoutes = require('./routes/assignments');
const submissionRoutes = require('./routes/submissions');
const gradeRoutes = require('./routes/grades');
const dashboardRoutes = require('./routes/dashboard');

// Optional chatbot route
let chatbotRoutes;
try {
  chatbotRoutes = require('./routes/chatbot');
} catch (err) {
  chatbotRoutes = null; // Skip if not present
}

// Initialize express app
const app = express();

// ===============================
// 🔒 Security & Middleware
// ===============================
app.use(helmet());

// Rate limiter — prevents brute-force and DDoS
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
});
app.use(limiter);

// Enable CORS (frontend <-> backend communication)
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  })
);

// Parse JSON and URL-encoded requests
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ===============================
// 🚀 API Routes
// ===============================
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/grades', gradeRoutes);
app.use('/api/dashboard', dashboardRoutes); // ✅ Added missing dashboard route

if (chatbotRoutes) {
  app.use('/api/chatbot', chatbotRoutes);
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'LMS Backend is running' });
});

// ===============================
// 🌐 Serve React frontend in production
// ===============================
if (process.env.NODE_ENV === 'production') {
  const buildPath = path.join(__dirname, '../frontend/build');
  app.use(express.static(buildPath));

  // Serve index.html for all remaining routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
}

// ===============================
// ❌ 404 Handler
// ===============================
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
  });
});

// ===============================
// ⚠️ Global Error Handler
// ===============================
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// ===============================
// ⚙️ Start Server
// ===============================
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    console.log('🔌 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connection successful');

    // Sync models safely (no data loss)
    await sequelize.sync({ alter: true });
    console.log('✅ Database synced successfully');

    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌐 API available at: http://localhost:${PORT}/api`);
    });

    // Graceful shutdown
    const shutdown = () => {
      console.log('⚠️ Shutting down server...');
      server.close(async () => {
        await sequelize.close();
        console.log('✅ Database connection closed');
        process.exit(0);
      });
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (err) {
    console.error('❌ Unable to start server:', err.message);
    if (process.env.NODE_ENV === 'development') console.error(err);
    process.exit(1);
  }
}

startServer();

module.exports = app;
