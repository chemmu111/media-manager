import Notification from '../models/Notification.js';

const MOCK_NOTIFICATIONS = [
    { id: 1, message: "New task assigned", read: false, createdAt: new Date() }
];

// Get all notifications — never returns 500, falls back to mock data on any DB error
export const getNotifications = async (_req, res) => {
    try {
        const notifications = await Notification.find({}).sort({ createdAt: -1 });
        return res.json(notifications);
    } catch (error) {
        console.error('NOTIFICATION ERROR:', error.message);
        return res.json(MOCK_NOTIFICATIONS);
    }
};

// Mark notification as read
export const markAsRead = async (req, res) => {
    const { id } = req.params;
    try {
        await Notification.findByIdAndUpdate(id, { read: true });
        res.json({ message: 'Notification marked as read' });
    } catch (error) {
        console.error('Mark as read error:', error.message);
        res.status(500).json({ error: 'Failed to update notification' });
    }
};
