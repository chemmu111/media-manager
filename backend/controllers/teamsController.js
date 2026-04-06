import Team from '../models/Team.js';
import Task from '../models/Task.js';
import { Content } from '../models/Content.js';
import { Feedback } from '../models/Feedback.js';

export const getTeams = async (req, res) => {
    try {
        const teams = await Team.find({}).sort({ createdAt: 1 }).lean();
        res.json(teams);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const createTeam = async (req, res) => {
    const { name, description, color, emoji } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: 'Name is required' });
    try {
        const team = await Team.create({ name: name.trim(), description, color, emoji });
        res.status(201).json(team);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const getTeamById = async (req, res) => {
    try {
        const team = await Team.findById(req.params.id).lean();
        if (!team) return res.status(404).json({ message: 'Team not found' });
        res.json(team);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Cascade delete: remove all team data before deleting the team itself
export const deleteTeam = async (req, res) => {
    const { id } = req.params;
    try {
        const team = await Team.findById(id);
        if (!team) return res.status(404).json({ message: 'Team not found' });

        // Cascade remove all associated data
        await Promise.all([
            Task.deleteMany({ teamId: id }),
            Content.deleteMany({ teamId: id }),
            Feedback.deleteMany({ teamId: id }),
        ]);

        await Team.findByIdAndDelete(id);

        res.json({ message: 'Team and all associated data deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const seedTeams = async (req, res) => {
    try {
        const count = await Team.countDocuments();
        if (count > 0) return res.json({ message: 'Teams already seeded', count });
        const teams = await Team.insertMany([
            { name: 'Team Space 1', description: 'Main content production team', color: 'bg-blue-500',   emoji: '🎬' },
            { name: 'Team Space 2', description: 'Social media & reels team',    color: 'bg-violet-500', emoji: '📱' },
        ]);
        res.status(201).json(teams);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
