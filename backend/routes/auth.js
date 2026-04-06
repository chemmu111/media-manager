import express from 'express';
import { register, login, getProfile, updatePreferredView, logout, updateAttendance, getAttendance } from '../controllers/authController.js';
import { auth } from '../middleware/auth.js';
import { requireDB } from '../middleware/dbCheck.js';

const router = express.Router();

router.post('/register', requireDB, register);
router.post('/login', requireDB, login);
router.get('/me', auth, getProfile);
router.patch('/preferred-view', auth, updatePreferredView);
router.patch('/attendance', auth, updateAttendance);
router.get('/attendance', auth, getAttendance);
router.post('/logout', logout);

export { router as authRouter };
