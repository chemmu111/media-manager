import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const auth = async (req, res, next) => {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'No token, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId;
        req.userEmail = decoded.email;
        req.userRole = decoded.role || 'editor';

        // Attach user's display name for assignee-based filtering
        try {
            const user = await User.findById(decoded.userId).select('name').lean();
            req.userName = user?.name || decoded.email;
        } catch {
            req.userName = decoded.email;
        }

        next();
    } catch {
        res.status(401).json({ error: 'Token is not valid' });
    }
};

// Admin-only routes
export const requireAdmin = (req, res, next) => {
    if (req.userRole !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

// Editor or admin routes
export const requireEditor = (req, res, next) => {
    if (!['admin', 'editor', 'member'].includes(req.userRole)) {
        return res.status(403).json({ error: 'Editor access required' });
    }
    next();
};
