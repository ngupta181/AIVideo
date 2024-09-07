const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
    let token;
    
    //console.log('Auth middleware called');
    //console.log('Headers:', JSON.stringify(req.headers, null, 2));
    //console.log('Query:', JSON.stringify(req.query, null, 2));

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
        //console.log('Token from Authorization header:', token);
    } else if (req.query && req.query.token) {
        token = req.query.token;
        //console.log('Token from query params:', token);
    }

    if (!token) {
        //console.log("No token provided");
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        //console.log("Decoded token:", JSON.stringify(decoded, null, 2));

        const user = await User.findById(decoded.user.id).select('-password');

        if (!user) {
            //console.log("User not found");
            return res.status(404).json({ error: 'User not found.' });
        }

        req.user = user;
        //console.log('User authenticated:', user._id);
        next();
    } catch (error) {
        //console.log("Invalid token", error.message);
        res.status(401).json({ error: 'Invalid token.' });
    }
};

module.exports = auth;