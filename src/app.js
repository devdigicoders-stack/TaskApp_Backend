require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Connect Database
connectDB();

const app = express();

// Middleware
app.use(cors({
  origin: '*', // allow all for Flutter app + admin panel
  credentials: true,
}));
app.use(express.json({ limit: '10mb' })); // larger limit for base64 QR images
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Static files (uploaded QR images)
app.use('/uploads', express.static('uploads'));

// Routes
app.get('/', (req, res) => {
  res.send('TaskApp Backend is running! Access the API at /api');
});

app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/campaigns', require('./routes/campaign.routes'));
app.use('/api/withdrawals', require('./routes/withdrawal.routes'));
app.use('/api/submissions', require('./routes/submission.routes'));
app.use('/api/settings', require('./routes/settings.routes'));
app.use('/api/notifications', require('./routes/notification.routes'));
app.use('/api/gifts', require('./routes/gift.routes'));
app.use('/api/redemptions', require('./routes/redemption.routes'));
app.use('/api/merchants', require('./routes/merchant.routes'));
app.use('/api/payments', require('./routes/payment.routes'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Task Management API is running 🚀', timestamp: new Date() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  console.log(`📡 API: http://localhost:${PORT}/api`);
});
