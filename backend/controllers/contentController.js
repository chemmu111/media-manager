import { Content } from '../models/Content.js';
import Notification from '../models/Notification.js';
import Task from '../models/Task.js';
import Submission from '../models/Submission.js';
import { uploadToCloudinary } from '../lib/cloudinary.js';

// Upload a brand-new video (no existing task required).
// Creates a Task + Content entry in one shot and notifies admins.
export const quickUpload = async (req, res) => {
    try {
        console.log('BODY:', req.body);
        console.log('FILE:', req.file
            ? { name: req.file.originalname, size: req.file.size, mime: req.file.mimetype }
            : undefined
        );

        const { title } = req.body;
        if (!title?.trim()) return res.status(400).json({ error: 'Title is required' });
        if (!req.file)       return res.status(400).json({ error: 'Video file is required — send FormData with field name "file"' });

        console.log(`[QuickUpload] Uploading "${title}" (${req.file.size} bytes) by ${req.userName}`);

        // 1. Upload to Cloudinary
        const result = await uploadToCloudinary(req.file.buffer, {
            folder: 'media-manager/uploads',
            use_filename: false,
            unique_filename: true,
        });

        console.log(`[QuickUpload] Cloudinary OK: ${result.secure_url}`);

        // 2. Create a Task with status 'under-review'
        const task = await Task.create({
            title:       title.trim(),
            status:      'under-review',
            priority:    'medium',
            videoUrl:    result.secure_url,
            description: `Submitted by ${req.userName || 'Editor'}`,
        });

        // 3. Create a Content entry linked to that task
        const content = await Content.create({
            title:       title.trim(),
            type:        'video',
            videoUrl:    result.secure_url,
            taskId:      task._id,
            submittedBy: req.userName || 'Editor',
            status:      'pending',
        });

        // 4. Save to Submission collection so admin review panel sees it immediately
        const submission = await Submission.create({
            title:       title.trim(),
            type:        'video',
            videoUrl:    result.secure_url,
            file_url:    result.secure_url,
            user_email:  req.userEmail || '',
            createdBy:   req.userId,
            submittedBy: req.userName || 'Editor',
            status:      'pending',
        });

        // 5. Notify admins
        await Notification.create({
            message: `New video uploaded for review: "${title.trim()}" by ${req.userName || 'Editor'}`,
            type:    'assignment',
        });

        res.status(201).json({ task, content, submission, videoUrl: result.secure_url });
    } catch (err) {
        console.error('[QuickUpload] Failed:', err.message);
        res.status(500).json({ error: 'Upload failed', message: err.message });
    }
};

// Upload video to Cloudinary and save URL to content item
export const uploadVideoContent = async (req, res) => {
    try {
        const { id } = req.params;
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

        console.log(`[Upload] Cloudinary upload for content ${id}, size: ${req.file.size} bytes`);

        const result = await uploadToCloudinary(req.file.buffer, {
            resource_type: 'video',
            folder:        'media-manager/content',
            use_filename:  false,
            unique_filename: true,
        });

        console.log(`[Upload] Cloudinary success: ${result.secure_url}`);

        const content = await Content.findByIdAndUpdate(
            id,
            { videoUrl: result.secure_url, status: 'pending' },
            { new: true }
        );

        if (!content) return res.status(404).json({ message: 'Content not found' });

        res.json({ videoUrl: result.secure_url, content });
    } catch (err) {
        console.error('[Upload] Failed:', err.message);
        res.status(500).json({ message: 'Upload failed', error: err.message });
    }
};

export const getContent = async (req, res) => {
    try {
        const filter = {};
        if (req.query.status) filter.status = req.query.status;
        if (req.query.teamId) filter.teamId = req.query.teamId;
        const items = await Content.find(filter).sort({ submittedAt: -1 });
        res.json(items);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch content' });
    }
};

export const createContent = async (req, res) => {
    const { title, type, videoUrl, videoLink, thumbnailUrl, taskId, teamId } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    try {
        const item = new Content({
            title,
            type: type || 'video',
            videoUrl: videoUrl || undefined,
            videoLink: videoLink || undefined,
            thumbnailUrl: thumbnailUrl || undefined,
            taskId: taskId || undefined,
            teamId: teamId || undefined,
            submittedBy: req.userName || 'Editor',
            status: 'pending'
        });
        await item.save();

        // Update linked task status to in_review
        if (taskId) {
            await Task.findByIdAndUpdate(taskId, { status: 'in_review', updatedAt: new Date() });
        }

        // Notify admins of the new submission
        await new Notification({
            message: `New submission for review: "${title}" by ${req.userName || 'Editor'}`,
            type: 'assignment'
        }).save();

        res.status(201).json(item);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create content' });
    }
};

export const updateContentStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'approved', 'rejected', 'revision'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    try {
        const item = await Content.findByIdAndUpdate(id, { status }, { new: true });
        if (!item) return res.status(404).json({ error: 'Content not found' });

        if (status === 'revision') {
            await new Notification({
                message: `Action Required: "${item.title}" needs revision. Check admin comments.`,
                type: 'update'
            }).save();
        }

        res.json(item);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update status' });
    }
};

export const seedContent = async (req, res) => {
    const initialContent = [
        {
            title: "How much should I offer on a new home in Seattle?",
            type: "video",
            submittedBy: "Editor 1",
            videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
            status: "pending"
        },
        {
            title: "Seattle Real Estate Market Update - April",
            type: "video",
            submittedBy: "Editor 2",
            videoUrl: "https://www.w3schools.com/html/movie.mp4",
            status: "pending"
        },
        {
            title: "Instagram Carousel - Home Tips",
            type: "design",
            submittedBy: "Designer 1",
            status: "approved"
        }
    ];

    try {
        await Content.deleteMany({});
        const items = await Content.insertMany(initialContent);
        res.status(201).json(items);
    } catch (error) {
        res.status(500).json({ error: 'Failed to seed content' });
    }
};
