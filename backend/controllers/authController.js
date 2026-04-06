import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const signToken = (user) =>
    jwt.sign(
        { userId: user._id, email: user.email, username: user.username, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );

const setCookie = (res, token) => {
    res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
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

export const logout = (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logged out successfully' });
};
