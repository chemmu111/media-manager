import express from 'express';
import { getFeedbacksByContentId, createFeedback } from '../controllers/feedbackController.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

router.get('/:contentId', getFeedbacksByContentId);
router.post('/', auth, createFeedback);

export { router as feedbackRouter };
