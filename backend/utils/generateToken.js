const jwt = require('jsonwebtoken');

const generateAccessToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'docx_secret_123', {
        expiresIn: '30d',
    });
};

const generateRefreshToken = (id, rememberMe = false) => {
    return jwt.sign({ id }, process.env.REFRESH_TOKEN_SECRET || 'refresh_secret_123', {
        expiresIn: rememberMe ? '30d' : '1d',
    });
};

module.exports = { generateAccessToken, generateRefreshToken };
