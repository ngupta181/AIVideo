require('dotenv').config();
//console.log('JWT_SECRET:', process.env.JWT_SECRET);

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const videoRoutes = require('./routes/video');
const auth = require('./middleware/authMiddleware');
const path = require('path');
 

const app = express();

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL, // Replace with your frontend URL
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());


// Routes
app.use('/api/auth', authRoutes);
//app.use('/api', auth, videoRoutes);

app.use('/api/video', auth, videoRoutes);

// Middleware to serve static files
const videosPath = path.join(__dirname, 'users');
app.use('/videos', express.static(videosPath));

app.use('/users', express.static(path.join(__dirname, 'users')));


// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));