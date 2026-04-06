import express from 'express';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { connectDB } from './db.js';
import Message from './models/Message.js';
import User from './models/User.js';

import { requireDB } from './middleware/dbCheck.js';

// 1. Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 8080;

// ── Socket.io setup ───────────────────────────────────────────────────────────
const io = new SocketServer(httpServer, {
    cors: {
        origin: function (origin, callback) {
            if (!origin) return callback(null, true);
            if (origin.match(/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/)) return callback(null, true);
            callback(new Error(`CORS blocked: ${origin}`));
        },
        credentials: true,
    },
});

// Make io accessible in Express route handlers via req.app.get('io')
app.set('io', io);

// Authenticate socket connections via JWT cookie or auth header
io.use(async (socket, next) => {
    try {
        // Parse cookies manually — safer than regex for base64 JWT values
        const rawCookie = socket.handshake.headers.cookie || '';
        const cookies = Object.fromEntries(
            rawCookie.split(';').map(c => {
                const idx = c.indexOf('=');
                return [c.slice(0, idx).trim(), c.slice(idx + 1).trim()];
            })
        );
        const token = cookies['token'] || socket.handshake.auth?.token;

        console.log('[Socket Auth] token present:', !!token);

        if (!token) return next(new Error('No token — make sure you are logged in'));

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId).select('name role').lean();
        if (!user) return next(new Error('User not found'));

        socket.userId   = String(decoded.userId);
        socket.userName = user.name || decoded.email;
        socket.userRole = user.role || 'editor';

        console.log(`[Socket Auth] ✅ Authenticated: ${socket.userName} (${socket.userRole})`);
        next();
    } catch (err) {
        console.error('[Socket Auth] ❌ Auth failed:', err.message);
        next(new Error('Invalid token'));
    }
});

io.on('connection', (socket) => {
    console.log('NEW_CLIENT_CONNECTED:', socket.id);
    console.log(`[Socket] User connected: ${socket.userName} (${socket.userRole})`);

    // 1. Join a task-specific room using plain taskId
    socket.on('join_task', (taskId) => {
        socket.join(taskId);
        console.log(`[Socket] ${socket.userName} joined room: ${taskId}`);
    });

    // Leave a task room
    socket.on('leave_task', (taskId) => {
        socket.leave(taskId);
        console.log(`[Socket] ${socket.userName} left room: ${taskId}`);
    });

    // Typing indicators
    socket.on('typing', (taskId) => {
        socket.to(taskId).emit('user_typing', {
            userId:   socket.userId,
            userName: socket.userName,
            role:     socket.userRole,
        });
    });

    socket.on('stop_typing', (taskId) => {
        socket.to(taskId).emit('user_stop_typing', { userId: socket.userId });
    });

    // 2. Send a message — persist to MongoDB, then broadcast to the room
    socket.on('send_message', async ({ taskId, message }) => {
        if (!taskId || !message?.trim()) return;

        try {
            const saved = await Message.create({
                taskId,
                senderId:   socket.userId,
                senderName: socket.userName,
                senderRole: socket.userRole,
                message:    message.trim(),
            });

            // Emit to everyone in this taskId room (including sender)
            io.to(taskId).emit('receive_message', {
                _id:        saved._id,
                taskId:     saved.taskId,
                senderId:   saved.senderId,
                senderName: saved.senderName,
                senderRole: saved.senderRole,
                message:    saved.message,
                timestamp:  saved.timestamp,
            });

            console.log(`[Socket] Message in room ${taskId} from ${socket.userName}`);
        } catch (err) {
            socket.emit('message_error', { error: 'Failed to save message' });
        }
    });

    socket.on('disconnect', () => {
        console.log(`[Socket] User disconnected: ${socket.userName}`);
    });
});

// 2. Middleware
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:5176',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'http://127.0.0.1:5175',
    'http://127.0.0.1:5176',
    process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, curl, Postman)
        if (!origin) return callback(null, true);
        // Allow any localhost port during development
        if (origin.match(/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/)) {
            return callback(null, true);
        }
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        callback(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// --- ROUTES ---
import { authRouter } from './routes/auth.js';
import { taskRouter } from './routes/tasks.js';
import { notificationRouter } from './routes/notifications.js';
import contentRouter from './routes/content.js';
import { feedbackRouter } from './routes/feedbacks.js';
import { messageRouter } from './routes/messages.js';
import { teamRouter } from './routes/team.js';
import { teamsRouter } from './routes/teams.js';
import { userRouter } from './routes/users.js';
import { submissionRouter } from './routes/submissions.js';
import { uploadRouter } from './routes/upload.js';
import { checkCloudinaryConnection } from './lib/cloudinary.js';

app.use('/api/auth', authRouter);
app.use('/api/tasks', taskRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/content', contentRouter);
app.use('/api/feedbacks', feedbackRouter);
app.use('/api/messages', messageRouter);
app.use('/api/team', teamRouter);
app.use('/api/teams', teamsRouter);
app.use('/api/users', userRouter);
app.use('/api/submissions', submissionRouter);
app.use('/api/upload', uploadRouter);

// 3. Home Route
app.get('/', (req, res) => {
    res.send('✅ Backend Server is running perfectly!');
});

// 4. Facebook OAuth - Redirect to Facebook
app.get('/auth/facebook', (req, res) => {
    const appId = process.env.FACEBOOK_APP_ID || '';
    const redirectUri = process.env.REDIRECT_URI || '';
    const scope = ['pages_show_list', 'pages_read_engagement', 'instagram_basic'].join(',');

    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&response_type=code`;

    res.json({ authUrl });
});

// 5. Facebook OAuth Callback
app.get('/auth/facebook/callback', async (req, res) => {
    const { code } = req.query;
    const appId = process.env.FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET;
    const redirectUri = process.env.REDIRECT_URI;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    if (!code) {
        return res.redirect(`${frontendUrl}/social-accounts?status=error&message=no_code`);
    }

    try {
        const response = await axios.get(`https://graph.facebook.com/v18.0/oauth/access_token`, {
            params: {
                client_id: appId,
                client_secret: appSecret,
                redirect_uri: redirectUri,
                code
            }
        });
        console.log('Access Token acquired!');
        res.redirect(`${frontendUrl}/social-accounts?status=success`);
    } catch (error) {
        console.error('FB Callback Error:', error.response?.data || error.message);
        res.redirect(`${frontendUrl}/social-accounts?status=error`);
    }
});

// Health / status check
app.get('/api/status', (req, res) => {
    const dbState = mongoose.connection.readyState;
    // 1 = connected, everything else = not ready
    if (dbState === 1) {
        res.json({ database: 'Connected', server: 'Running' });
    } else {
        res.status(503).json({ database: 'Disconnected', server: 'Running' });
    }
});

// Global error handler — catches multer errors, unhandled throws, etc.
// Must be after all routes. Returns JSON instead of Express's default HTML page.
app.use((err, req, res, next) => {
    console.error('[Global Error]', err.message);
    const status = err.status || err.statusCode || 500;
    res.status(status).json({ error: err.message || 'Internal server error' });
});

// 6. Start Server (connect to DB first, then verify Cloudinary)
connectDB().then(() => {
    checkCloudinaryConnection();
    httpServer.listen(PORT, () => {
        console.log(`🚀 Server is live at http://localhost:${PORT}`);
        console.log(`⚡ Socket.io ready`);
    });
});