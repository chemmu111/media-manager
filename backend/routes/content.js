import express from 'express';
import multer from 'multer';
import { getContent, updateContentStatus, seedContent, createContent, uploadVideoContent, quickUpload } from '../controllers/contentController.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 500 * 1024 * 1024 } }); // 500 MB

router.get('/', getContent);
router.post('/', auth, createContent);
// Must be defined before /:id routes to avoid param collision
router.post('/quick-upload', auth, upload.single('file'), quickUpload);
router.patch('/:id/status', auth, updateContentStatus);
router.post('/seed', seedContent);
router.post('/:id/upload-video', auth, upload.single('video'), uploadVideoContent);

export default router;
