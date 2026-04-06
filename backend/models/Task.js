import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['upcoming', 'unassigned', 'in-progress', 'under-review', 'completed', 'released'],
        default: 'unassigned'
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    teamSpaceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team',
        default: null
    },
    teamId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team',
        default: null
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },
    dueDate: {
        type: Date,
        default: null
    },
    platform: {
        type: String,
        enum: ['youtube', 'instagram', 'facebook', 'linkedin', 'other'],
        default: 'other'
    },
    type: {
        type: String,
        enum: ['task', 'event'],
        default: 'task'
    },
    checked: {
        type: Boolean,
        default: false
    },
    order: {
        type: Number,
        default: 0
    },
    startDate: {
        type: Date
    },
    endDate: {
        type: Date
    },
    videoUrl: {
        type: String,
        default: ''
    },
    subtasks: [{
        title: { type: String, required: true },
        checked: { type: Boolean, default: false }
    }],
    comments: [{
        text: { type: String, required: true },
        userName: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        reactions: [String]
    }]
}, { timestamps: true });

const Task = mongoose.model('Task', taskSchema);
export default Task;
