import express from 'express';
import { body } from 'express-validator';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { auth, signUser } from '../middleware/auth.js';

const router = express.Router();

// Register admin/staff (admin required to create others). If no users exist, allow first admin creation without auth.
router.post('/register',
  body('name').isString().notEmpty(),
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  body('role').optional().isIn(['admin','staff']),
  async (req, res) => {
    const usersCount = await User.countDocuments();
    if (usersCount > 0 && !(req.headers.authorization)) {
      return res.status(401).json({ error: 'Admin auth required' });
    }
    if (usersCount > 0) {
      // ensure caller is admin
      try { auth('admin')(req, res, () => {}); } catch { return; }
    }

    const { name, email, password, role } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ error: 'Email in use' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, passwordHash, role: role || (usersCount === 0 ? 'admin' : 'staff') });
    const token = signUser(user);
    res.status(201).json({ user: { id: user._id, name, email, role: user.role }, token });
  }
);

router.post('/login',
  body('email').isEmail(),
  body('password').isString().notEmpty(),
  async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await user.comparePassword(password);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const token = signUser(user);
    res.json({ token, user: { id: user._id, email: user.email, name: user.name, role: user.role } });
  }
);

router.get('/me', auth(), async (req, res) => {
  res.json({ user: req.user });
});

export default router;
