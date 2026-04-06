import express from 'express';
import multer from 'multer';
import { uploadToCloudinary } from '../lib/cloudinary.js';

const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB
});

// POST /api/upload  — accepts a single "file" field via FormData
router.post('/', upload.single('file'), async (req, res) => {
    try {
        const file = req.file;

        if (!file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        console.log('FILE:', file.originalname, `(${(file.size / (1024 * 1024)).toFixed(2)} MB)`);

        // Upload buffer to Cloudinary and return the secure URL
        const result = await uploadToCloudinary(file.buffer, {
            folder: 'media-manager/uploads',
            use_filename: false,
            unique_filename: true,
        });

        console.log('Cloudinary URL:', result.secure_url);

        return res.json({ url: result.secure_url });
    } catch (error) {
        console.error('UPLOAD ERROR:', error.message);
        return res.status(500).json({ message: error.message });
    }
});

export { router as uploadRouter };
