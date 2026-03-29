const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const { auth, requireRole, optionalAuth } = require('../middleware/auth');
const { submitGrievance, listGrievances, getGrievance,
  updateStatus, assignOfficer, addNote, deleteGrievance, upvoteGrievance, getMapData,
} = require('../controllers/grievanceController');

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.pdf'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

router.post('/', optionalAuth, upload.single('attachment'), submitGrievance);
router.get('/map-data', optionalAuth, getMapData);
router.get('/', optionalAuth, listGrievances);
router.get('/:id', getGrievance);
router.patch('/:id/status', auth, requireRole('admin', 'officer'), updateStatus);
router.patch('/:id/assign', auth, requireRole('admin'), assignOfficer);
router.post('/:id/notes', auth, requireRole('admin', 'officer'), addNote);
router.post('/:id/upvote', upvoteGrievance);
router.delete('/:id', auth, requireRole('admin'), deleteGrievance);

module.exports = router;
