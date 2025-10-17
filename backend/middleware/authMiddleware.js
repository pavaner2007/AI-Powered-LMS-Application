// backend/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

// Load environment variables (if not already loaded)
dotenv.config();

/**
 * Middleware to verify JWT Access Token
 * - Looks for Authorization: "Bearer <token>"
 * - Verifies using JWT_ACCESS_SECRET
 * - Attaches decoded payload to req.user
 */
function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
    }

    const token = authHeader.split(' ')[1];

    if (!process.env.JWT_ACCESS_SECRET) {
      console.error('JWT_ACCESS_SECRET is not set in environment');
      return res.status(500).json({
        success: false,
        message: 'Server not configured for JWT verification.',
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    // Attach user payload to request (for routes to use)
    req.user = decoded;
    return next();
  } catch (err) {
    console.error('❌ JWT verification failed:', err);

    // Token expired
    if (err?.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired. Please log in again.',
      });
    }

    // Any other JWT error
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired token.',
    });
  }
}

// Provide named export + alias for backward compatibility
// Some files may import { verifyToken }, others may require().authenticate
module.exports = {
  verifyToken,
  authenticate: verifyToken,
};
