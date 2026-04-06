import Task from '../models/Task.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { uploadToCloudinary } from '../lib/cloudinary.js';

// Upload video to Cloudinary and save URL to task
export const uploadVideo = async (req, res) => {
    try {
        const { id } = req.params;
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

        console.log(`[Upload] Starting Cloudinary upload for task ${id}, size: ${req.file.size} bytes`);

        const result = await uploadToCloudinary(req.file.buffer, {
            resource_type: 'video',
            folder:        'media-manager/tasks',
            use_filename:  false,
            unique_filename: true,
        });

        console.log(`[Upload] Cloudinary success: ${result.secure_url}`);

        const task = await Task.findByIdAndUpdate(
            id,
            { videoUrl: result.secure_url },
            { new: true }
        );

        if (!task) return res.status(404).json({ message: 'Task not found' });

        res.json({ videoUrl: result.secure_url, task });
    } catch (err) {
        console.error('[Upload] Failed:', err.message);
        res.status(500).json({ message: 'Upload failed', error: err.message });
    }
};

// GET /api/tasks — role-aware fetch, scoped to a team space
// Required query param: teamId  — if omitted, returns [] (no cross-team leakage)
// Admin:         all tasks in that team space (+ optional priority/status filters)
// Editor/member: only tasks in that team space where assignedTo === their userId
export const getTasksByRole = async (req, res) => {
    const { teamId, priority, status } = req.query;

    try {
        let filter = {};
        
        // If teamId is provided, scope tasks to that team
        if (teamId) {
            filter.$or = [{ teamId }, { teamSpaceId: teamId }];
        }

        if (req.userRole === 'admin') {
            if (priority) filter.priority = priority;
            if (status)   filter.status   = status;
        } else {
            // Editors only see tasks assigned to them
            filter.assignedTo = req.userId;
            if (priority) filter.priority = priority;
            if (status)   filter.status   = status;
        }

        const tasks = await Task.find(filter)
            .populate('assignedTo', 'name username email role')
            .populate('createdBy', 'name username email role')
            .populate('teamSpaceId', 'name color emoji')
            .populate('teamId', 'name color emoji')
            .sort({ order: 1 });

        res.json(tasks);
    } catch (error) {
        console.error('getTasksByRole error:', error);
        res.status(500).json({ error: 'Failed to fetch tasks', details: error.message });
    }
};

// Get all tasks with filtering
export const getTasks = async (req, res) => {
    const { priority, assignee, status, teamId } = req.query;
    const filter = {};

    if (priority) filter.priority = priority;
    if (assignee) filter.assignee = assignee;
    if (status)   filter.status   = status;
    if (teamId)   filter.teamId   = teamId;

    try {
        const tasks = await Task.find(filter).sort({ order: 1 });
        res.json(tasks);
    } catch (error) {
        console.error('Get tasks error:', error);
        res.status(500).json({ error: 'Failed to fetch tasks', details: error.message });
    }
};

// Get tasks assigned to the currently logged-in user (editor view)
export const getMyTasks = async (req, res) => {
    const { priority, status } = req.query;
    // user_id is the preferred best practice instead of email
    const filter = { assignedTo: req.userId };

    if (priority) filter.priority = priority;
    if (status) filter.status = status;

    try {
        const tasks = await Task.find(filter)
            .populate('assignedTo', 'name username email role')
            .populate('createdBy', 'name username email role')
            .populate('teamSpaceId', 'name color emoji')
            .populate('teamId', 'name color emoji')
            .sort({ order: 1 });
        res.json(tasks);
    } catch (error) {
        console.error('Get my tasks error:', error);
        res.status(500).json({ error: 'Failed to fetch tasks', details: error.message });
    }
};

// Create a new task
export const createTask = async (req, res) => {
    console.log('[createTask] req.body:', req.body);

    const {
        title,
        status      = 'unassigned',
        priority    = 'medium',
        assignee    = '',
        assignedTo,
        teamSpaceId,
        teamId,
        startDate,
        endDate,
        description = '',
        platform    = 'other',
        type        = 'task',
        subtasks    = [],
        comments    = [],
    } = req.body;

    if (!title || title.trim().length === 0) {
        return res.status(400).json({ error: 'Task title is required' });
    }

    try {
        const count = await Task.countDocuments({ status });
        const resolvedTeamId = teamSpaceId || teamId || null;

        const task = new Task({
            title:       title.trim(),
            status,
            priority,
            assignedTo:  assignedTo  || null,
            createdBy:   req.userId  || null,
            teamSpaceId: resolvedTeamId,
            teamId:      resolvedTeamId,
            platform,
            type,
            checked:     false,
            order:       count,
            startDate:   startDate ? new Date(startDate) : undefined,
            endDate:     endDate   ? new Date(endDate)   : undefined,
            description,
            subtasks,
            comments,
        });

        await task.save();

        if (assignedTo || assignee) {
            const notification = new Notification({
                message: `New task assigned: ${task.title}`,
                type: 'assignment'
            });
            await notification.save();
            req.app.get('io')?.emit('newNotification', notification);
        }

        const populatedTask = await Task.findById(task._id)
            .populate('assignedTo', 'name username email role')
            .populate('createdBy', 'name username email role')
            .populate('teamSpaceId', 'name color emoji')
            .populate('teamId', 'name color emoji');

        req.app.get('io')?.emit('taskUpdated', populatedTask);

        res.status(201).json(populatedTask);
    } catch (error) {
        console.error('[createTask] error:', error.message, error.errors || '');
        res.status(500).json({ error: 'Failed to create task', details: error.message });
    }
};

// Update a task (general purpose)
export const updateTask = async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;

    try {
        const task = await Task.findByIdAndUpdate(
            id,
            { ...updateData, updatedAt: new Date() },
            { new: true }
        );
        if (!task) return res.status(404).json({ error: 'Task not found' });

        // Broadcast real-time update to all connected clients
        req.app.get('io')?.emit('taskUpdated', task);

        res.json(task);
    } catch (error) {
        console.error('Update task error:', error.message);
        res.status(500).json({ error: 'Failed to update task' });
    }
};

// Update task status (drag-and-drop)
export const updateTaskStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    try {
        const task = await Task.findByIdAndUpdate(
            id,
            { status, updatedAt: new Date() },
            { new: true }
        );
        if (!task) return res.status(404).json({ error: 'Task not found' });

        // Broadcast real-time status change to all connected clients
        req.app.get('io')?.emit('taskUpdated', task);

        res.json(task);
    } catch (error) {
        console.error('Update status error:', error.message);
        res.status(500).json({ error: 'Failed to update task status' });
    }
};

// Toggle task checkbox
export const toggleTask = async (req, res) => {
    const { id } = req.params;
    try {
        const task = await Task.findById(id);
        if (!task) return res.status(404).json({ error: 'Task not found' });

        task.checked = !task.checked;
        task.updatedAt = new Date();
        await task.save();

        res.json({ checked: task.checked });
    } catch (error) {
        console.error('Toggle task error:', error.message);
        res.status(500).json({ error: 'Failed to toggle task' });
    }
};

// Delete a task
export const deleteTask = async (req, res) => {
    const { id } = req.params;
    try {
        await Task.findByIdAndDelete(id);
        res.json({ message: 'Task deleted' });
    } catch (error) {
        console.error('Delete task error:', error.message);
        res.status(500).json({ error: 'Failed to delete task' });
    }
};

// Seed initial tasks
export const seedTasks = async (req, res) => {
    try {
        const count = await Task.countDocuments({});
        if (count > 0) {
            return res.json({ message: 'Tasks already seeded', count });
        }

        const seedData = [
            { title: 'Onam Festival Special Reel', status: 'to_do', priority: 'high', assignee: 'Editor 1', checked: false, order: 0, startDate: new Date('2026-03-01'), endDate: new Date('2026-03-10') },
            { title: 'Client Meet - Q2 Review', status: 'to_do', priority: 'medium', assignee: '', checked: false, order: 1, startDate: new Date('2026-03-05'), endDate: new Date('2026-03-06') },
            { title: 'How much should I offer on a new home in Seattle?', status: 'to_do', priority: 'high', assignee: '', checked: false, order: 2, startDate: new Date('2026-03-15'), endDate: new Date('2026-04-05') },
            { title: 'Weekly Newsletter Draft', status: 'to_do', priority: 'medium', assignee: '', checked: false, order: 3, startDate: new Date('2026-04-10'), endDate: new Date('2026-04-15') },
            { title: 'Seattle Real Estate Market Update - April', status: 'in_progress', priority: 'high', assignee: 'Editor 2', checked: false, order: 0, startDate: new Date('2026-04-01'), endDate: new Date('2026-04-30') },
            { title: 'Instagram Carousel - Home Tips', status: 'in_progress', priority: 'low', assignee: 'Designer 1', checked: false, order: 1, startDate: new Date('2026-05-01'), endDate: new Date('2026-05-10') },
            { title: 'YouTube Thumbnail Pack', status: 'done', priority: 'medium', assignee: 'Editor 1', checked: true, order: 0, startDate: new Date('2026-05-15'), endDate: new Date('2026-05-20') },
            { title: 'Blog Post - First Time Buyers Guide', status: 'in_review', priority: 'low', assignee: 'Content Writer', checked: false, order: 0, startDate: new Date('2026-03-20'), endDate: new Date('2026-04-10') },
            { title: 'Client Testimonial Short', status: 'done', priority: 'medium', assignee: 'Editor 2', checked: true, order: 1, startDate: new Date('2026-04-20'), endDate: new Date('2026-05-05') },
            { title: 'Office Tour Video', status: 'done', priority: 'high', assignee: 'Editor 5', checked: false, order: 2, startDate: new Date('2026-05-01'), endDate: new Date('2026-05-31') },
        ];

        await Task.insertMany(seedData);

        // Also seed a target notification
        const targetNotification = new Notification({
            message: 'Team Analytics: Onam is coming up!',
            type: 'system'
        });
        await targetNotification.save();

        res.status(201).json({ message: 'Tasks and notifications seeded', count: seedData.length });
    } catch (error) {
        console.error('Seed tasks error:', error);
        res.status(500).json({ error: 'Failed to seed tasks', details: error.message });
    }
};
