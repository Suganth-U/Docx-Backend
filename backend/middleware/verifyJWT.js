const jwt = require('jsonwebtoken');

const verifyJWT = (req, res, next) => {
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Please sign in to continue.' });
    }

    const token = authHeader.split(' ')[1];

    jwt.verify(
        token,
        process.env.ACCESS_TOKEN_SECRET || 'access_secret_123',
        (err, decoded) => {
            if (err) return res.status(403).json({ message: 'Your session has expired. Please sign in again.' });
            req.user = decoded.id;
            next();
        }
    );
};

module.exports = verifyJWT;
