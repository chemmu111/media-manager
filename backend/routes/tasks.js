import express from 'express';
import multer from 'multer';
import { getTasksByRole, getMyTasks, createTask, updateTask, updateTaskStatus, toggleTask, deleteTask, seedTasks, uploadVideo } from '../controllers/taskController.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 500 * 1024 * 1024 } }); // 500 MB

router.get('/', auth, getTasksByRole);
router.get('/mine', auth, getMyTasks);
router.post('/', auth, createTask);
router.patch('/:id', auth, updateTask);
router.patch('/:id/status', auth, updateTaskStatus);
router.patch('/:id/toggle', auth, toggleTask);
router.delete('/:id', auth, deleteTask);
router.post('/seed', auth, seedTasks);
router.post('/:id/upload-video', auth, upload.single('video'), uploadVideo);

export { router as taskRouter };
