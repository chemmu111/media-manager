import mongoose from 'mongoose';

const teamSchema = new mongoose.Schema({
    name:        { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    color:       { type: String, default: 'bg-blue-500' },
    emoji:       { type: String, default: '🎬' },
}, { timestamps: true });

const Team = mongoose.model('Team', teamSchema);
export default Team;
