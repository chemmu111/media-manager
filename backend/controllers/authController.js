import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import User from '../models/User.js';

const signToken = (user) =>
    jwt.sign(
        { userId: user._id, email: user.email, username: user.username, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );

const setCookie = (res, token) => {
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('token', token, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });
};

const userPayload = (user) => ({
    id: user._id,
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role,
    preferredView: user.preferredView,
    attendance: user.attendance,
});

export const register = async (req, res) => {
    const { email, password, name, username, role } = req.body;
    if (!email || !password || !username) return res.status(400).json({ error: 'Email, username, and password are required' });
    if (!email.endsWith('@gmail.com')) return res.status(400).json({ error: 'Only @gmail.com emails are allowed' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters long' });

    try {
        const [existingEmail, existingUsername] = await Promise.all([
            User.findOne({ email: email.toLowerCase() }),
            User.findOne({ username: username.toLowerCase() }),
        ]);
        if (existingEmail) return res.status(409).json({ error: 'User with this email already exists' });
        if (existingUsername) return res.status(409).json({ error: 'Username is already taken' });

        const validRoles = ['admin', 'editor', 'member'];
        const assignedRole = validRoles.includes(role) ? role : 'editor';

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({
            name: name || username,
            username: username.toLowerCase(),
            email: email.toLowerCase(),
            password: hashedPassword,
            role: assignedRole,
        });
        await user.save();

        const token = signToken(user);
        setCookie(res, token);
        res.status(201).json({ message: 'Account created successfully', token, user: userPayload(user) });
    } catch (error) {
        console.error('Register error:', error.message);
        res.status(500).json({ error: 'Server error, please try again' });
    }
};

export const login = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    try {
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) return res.status(401).json({ error: 'Invalid email or password' });

        if (!user.password) return res.status(401).json({ error: 'This account uses Google sign-in. Please continue with Google.' });
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ error: 'Invalid email or password' });

        // Force admin role for the designated admin email
        if (user.email === 'admin@gmail.com' && user.role !== 'admin') {
            await User.findByIdAndUpdate(user._id, { role: 'admin' });
            user.role = 'admin';
        }

        const token = signToken(user);
        setCookie(res, token);
        res.json({ message: 'Login successful', token, user: userPayload(user) });
    } catch (error) {
        console.error('Login error:', error.message);
        res.status(500).json({ error: 'Server error, please try again' });
    }
};

export const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('-password');
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Ensure admin email always has admin role
        if (user.email === 'admin@gmail.com' && user.role !== 'admin') {
            user.role = 'admin';
            await user.save();
        }

        res.json(user);
    } catch (error) {
        console.error('Get profile error:', error.message);
        res.status(500).json({ error: 'Server error' });
    }
};

export const updatePreferredView = async (req, res) => {
    const { preferredView } = req.body;
    if (!['kanban', 'list'].includes(preferredView)) return res.status(400).json({ error: 'Invalid view type' });

    try {
        const user = await User.findByIdAndUpdate(req.userId, { preferredView }, { new: true }).select('-password');
        res.json(user);
    } catch (error) {
        console.error('Update view error:', error.message);
        res.status(500).json({ error: 'Server error' });
    }
};

// Update current user's attendance status
export const updateAttendance = async (req, res) => {
    const { attendance } = req.body;
    if (!['present', 'leave'].includes(attendance)) return res.status(400).json({ error: 'Invalid attendance value' });

    try {
        const user = await User.findByIdAndUpdate(req.userId, { attendance }, { new: true }).select('-password');
        res.json({ attendance: user.attendance, name: user.name });
    } catch (error) {
        console.error('Update attendance error:', error.message);
        res.status(500).json({ error: 'Server error' });
    }
};

// Get all users' attendance (for admin dashboard)
export const getAttendance = async (req, res) => {
    try {
        const users = await User.find({}).select('name role attendance').lean();
        res.json(users);
    } catch (error) {
        console.error('Get attendance error:', error.message);
        res.status(500).json({ error: 'Server error' });
    }
};

export const googleAuth = (req, res) => {
    const params = new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        response_type: 'code',
        scope: 'openid email profile',
        access_type: 'offline',
        prompt: 'select_account',
    });
    res.json({ authUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params}` });
};

export const googleCallback = async (req, res) => {
    const { code } = req.query;
    const frontendUrl = process.env.FRONTEND_URL;

    try {
        // Exchange code for tokens
        const { data: tokens } = await axios.post('https://oauth2.googleapis.com/token', {
            code,
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            redirect_uri: process.env.GOOGLE_REDIRECT_URI,
            grant_type: 'authorization_code',
        });

        // Get user info from Google
        const { data: profile } = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
        });

        const { sub: googleId, email, name } = profile;

        // Find existing user by googleId or email
        let user = await User.findOne({ $or: [{ googleId }, { email: email.toLowerCase() }] });

        if (!user) {
            // Generate a unique username from the email prefix
            const base = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
            const suffix = Date.now().toString().slice(-4);
            user = new User({
                name: name || base,
                username: `${base}_${suffix}`,
                email: email.toLowerCase(),
                googleId,
                role: 'editor',
            });
            await user.save();
        } else if (!user.googleId) {
            user.googleId = googleId;
            await user.save();
        }

        // Force admin role for the designated admin email
        if (user.email === 'admin@gmail.com' && user.role !== 'admin') {
            user.role = 'admin';
            await user.save();
        }

        const token = signToken(user);
        setCookie(res, token);
        res.redirect(`${frontendUrl}/auth/google/callback?status=success&token=${token}`);
    } catch (error) {
        console.error('Google OAuth error:', error.message);
        res.redirect(`${frontendUrl}/auth/google/callback?status=error`);
    }
};

export const logout = (req, res) => {
    const isProd = process.env.NODE_ENV === 'production';
    res.clearCookie('token', {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
    });
    res.json({ message: 'Logged out successfully' });
};
