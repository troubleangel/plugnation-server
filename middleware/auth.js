import jwt from 'jsonwebtoken';

export function auth(requiredRole = null) {
  return (req, res, next) => {
    try {
      const header = req.headers.authorization || '';
      const token = header.startsWith('Bearer ') ? header.slice(7) : null;
      if (!token) return res.status(401).json({ error: 'Unauthorized' });
      const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
      if (requiredRole && payload.role !== requiredRole) return res.status(403).json({ error: 'Forbidden' });
      req.user = payload;
      next();
    } catch (e) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };
}

export function signUser(user) {
  const payload = { id: user._id, email: user.email, role: user.role, name: user.name };
  const token = jwt.sign(payload, process.env.JWT_SECRET || 'dev_secret', { expiresIn: '7d' });
  return token;
}
