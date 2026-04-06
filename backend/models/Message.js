import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
    taskId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task',
        required: true,
        index: true,
    },
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    senderName: {
        type: String,
        required: true,
    },
    senderRole: {
        type: String,
        enum: ['admin', 'editor', 'member'],
        required: true,
    },
    message: {
        type: String,
        required: true,
        trim: true,
        maxlength: 2000,
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
});

messageSchema.index({ taskId: 1, timestamp: 1 });

const Message = mongoose.model('Message', messageSchema);
export default Message;
