import express from 'express';
import Message from '../models/Message.js';
import { auth } from '../middleware/auth.js';
import { requireDB } from '../middleware/dbCheck.js';

const router = express.Router();

// GET /api/messages/:taskId — fetch message history for a task
router.get('/:taskId', requireDB, auth, async (req, res) => {
    try {
        const { taskId } = req.params;
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);

        const messages = await Message.find({ taskId })
            .sort({ timestamp: 1 })
            .limit(limit)
            .lean();

        res.json(messages);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

export { router as messageRouter };
