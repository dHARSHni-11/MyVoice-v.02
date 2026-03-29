const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const signToken = (user) =>
  jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

const register = async (req, res, next) => {
  try {
    const { name, email, password, role = 'customer' } = req.body;
    const existing = await User.findByEmail(email);
    if (existing) return res.status(409).json({ error: 'Email already registered' });
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, passwordHash, role });
    const token = signToken(user);
    res.status(201).json({ token, user });
  } catch (err) { next(err); }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findByEmail(email);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = signToken(user);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) { next(err); }
};

const govLogin = async (req, res, next) => {
  try {
    const { governmentId, email, password } = req.body;
    if (!governmentId) return res.status(400).json({ error: 'Government ID is required' });

    const userByGovId = await User.findByGovernmentId(governmentId);
    if (!userByGovId) return res.status(401).json({ error: 'Invalid Government ID' });

    if (userByGovId.email !== email) return res.status(401).json({ error: 'Invalid credentials' });
    if (!['admin', 'officer'].includes(userByGovId.role)) {
      return res.status(403).json({ error: 'Access denied. Not a government official.' });
    }

    const valid = await bcrypt.compare(password, userByGovId.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken(userByGovId);
    res.json({
      token,
      user: {
        id: userByGovId.id,
        name: userByGovId.name,
        email: userByGovId.email,
        role: userByGovId.role,
        governmentId: userByGovId.government_id,
        department: userByGovId.department,
      },
    });
  } catch (err) { next(err); }
};

const me = async (req, res) => {
  res.json(req.user);
};

module.exports = { register, login, govLogin, me };
