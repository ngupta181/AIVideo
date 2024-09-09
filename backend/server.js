require('dotenv').config();
//console.log('JWT_SECRET:', process.env.JWT_SECRET);
const jwt = require('jsonwebtoken');
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

app.post('/verify-token', (req, res) => {
    console.log('Verify token endpoint hit');
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      console.log('No token provided');
      return res.status(401).json({ message: 'No token provided' });
    }
  
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Token verified successfully', decoded);
      res.json({ valid: true, user: decoded });
    } catch (error) {
      console.error('Token verification failed', error);
      res.status(401).json({ message: 'Invalid token' });
    }
});


// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));