import mongoose from 'mongoose';

const FeedbackSchema = new mongoose.Schema({
    contentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Content',
        required: true
    },
    teamId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team',
        default: null,
    },
    userId: {
        type: String,
        required: true
    },
    userName: {
        type: String
    },
    message: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

export const Feedback = mongoose.model('Feedback', FeedbackSchema);
