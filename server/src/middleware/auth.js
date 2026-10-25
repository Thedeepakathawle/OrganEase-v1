const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'organ_ease_jwt_super_secret_key_2026_secure';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Invalid or expired token.' });
    }
    req.user = user;
    next();
  });
}

function requireRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: `Forbidden: Access requires one of [${allowedRoles.join(', ')}]` 
      });
    }
    next();
  };
}

module.exports = {
  authenticateToken,
  requireRoles
};
