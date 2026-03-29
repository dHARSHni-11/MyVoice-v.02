const router = require('express').Router();
const { register, login, govLogin, me } = require('../controllers/authController');
const { auth } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/gov-login', govLogin);
router.get('/me', auth, me);

module.exports = router;
