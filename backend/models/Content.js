import mongoose from 'mongoose';

const ContentSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        enum: ['video', 'design', 'content'],
        default: 'video'
    },
    videoUrl: {
        type: String
    },
    videoLink: {
        type: String        // YouTube / external URL
    },
    thumbnailUrl: {
        type: String
    },
    teamId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team',
        default: null,
    },
    taskId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task'
    },
    submittedBy: {
        type: String,
        required: true
    },
    submittedAt: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'revision'],
        default: 'pending'
    }
});

export const Content = mongoose.model('Content', ContentSchema);
