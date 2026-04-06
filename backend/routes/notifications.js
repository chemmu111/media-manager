import express from 'express';
import { getNotifications, markAsRead } from '../controllers/notificationController.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// No auth on GET so notifications load even before session is verified
router.get('/', getNotifications);
router.patch('/:id/read', auth, markAsRead);

export { router as notificationRouter };
