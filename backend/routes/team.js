import express from 'express';
import { getWorkflow } from '../controllers/teamController.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

router.get('/workflow', auth, getWorkflow);

export { router as teamRouter };
