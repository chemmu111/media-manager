import express from 'express';
import Submission from '../models/Submission.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/submissions
// admin → all submissions
// editor / member → only their own submissions
router.get('/', auth, async (req, res) => {
    try {
        const filter = req.userRole === 'admin' ? {} : { createdBy: req.userId };
        const submissions = await Submission.find(filter).sort({ submittedAt: -1 });
        res.json(submissions);
    } catch (error) {
        console.error('GET submissions error:', error.message);
        res.status(500).json({ error: 'Failed to fetch submissions' });
    }
});

// POST /api/submissions — save a new submission to the DB
router.post('/', auth, async (req, res) => {
    try {
        const { title, file_url, user_email, type, videoUrl } = req.body;
        console.log('BODY:', req.body);

        if (!title) {
            return res.status(400).json({ message: 'Missing required field: title' });
        }
        if (!file_url && !videoUrl) {
            return res.status(400).json({ message: 'Missing required field: file_url or videoUrl' });
        }

        const submission = await Submission.create({
            title,
            type:        type || 'video',
            videoUrl:    videoUrl || file_url,
            file_url:    file_url || videoUrl,
            user_email:  user_email || req.userEmail || '',
            createdBy:   req.userId,
            submittedBy: req.userName || req.userEmail || 'Editor',
            status:      'pending',
        });

        console.log('Submission saved:', submission._id);
        res.status(201).json(submission);
    } catch (error) {
        console.error('UPLOAD ERROR:', error.message);
        res.status(500).json({ message: error.message });
    }
});

// PATCH /api/submissions/:id/status — admin approves / rejects / requests revision
router.patch('/:id/status', auth, async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['pending', 'approved', 'rejected', 'revision'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
        }

        const submission = await Submission.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );
        if (!submission) return res.status(404).json({ error: 'Submission not found' });

        res.json(submission);
    } catch (error) {
        console.error('Status update error:', error.message);
        res.status(500).json({ error: 'Failed to update status' });
    }
});

export { router as submissionRouter };
