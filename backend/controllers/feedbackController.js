import { Feedback } from '../models/Feedback.js';

export const getFeedbacksByContentId = async (req, res) => {
    const { contentId } = req.params;
    try {
        const feedbacks = await Feedback.find({ contentId }).sort({ timestamp: 1 });
        res.json(feedbacks);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch feedbacks' });
    }
};

export const createFeedback = async (req, res) => {
    const { contentId, userId, userName, message } = req.body;

    if (!contentId || !message) {
        return res.status(400).json({ error: 'ContentId and message are required' });
    }

    try {
        const feedback = new Feedback({
            contentId,
            userId: userId || req.user?.id || 'anonymous',
            userName: userName || req.user?.name || 'Anonymous',
            message
        });
        await feedback.save();
        res.status(201).json(feedback);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create feedback' });
    }
};
