import express from 'express';
import User from '../models/User.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/users?role=editor  — fetch users filtered by role (admin only)
router.get('/', auth, async (req, res) => {
    const { role } = req.query;
    const filter = {};
    if (role) filter.role = role;

    try {
        const users = await User.find(filter).select('_id name username email role').lean();
        res.json(users);
    } catch (err) {
        console.error('Get users error:', err.message);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

export { router as userRouter };
