import mongoose from 'mongoose';

const submissionSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
    },
    type: {
        type: String,
        enum: ['video', 'design', 'content'],
        default: 'video',
    },
    videoUrl: {
        type: String,
        default: '',
    },
    file_url: {
        type: String,
        default: '',
    },
    user_email: {
        type: String,
        default: '',
    },
    // ObjectId of the user who created this submission — used for role-based filtering
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },
    // Display name for the UI
    submittedBy: {
        type: String,
        required: true,
    },
    submittedAt: {
        type: Date,
        default: Date.now,
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'revision'],
        default: 'pending',
    },
});

const Submission = mongoose.model('Submission', submissionSchema);
export default Submission;
