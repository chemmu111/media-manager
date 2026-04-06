import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false // Optional if it's a general notification
    },
    message: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['assignment', 'deadline', 'update', 'system'],
        default: 'system'
    },
    read: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
