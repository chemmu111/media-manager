import mongoose from 'mongoose';
import Task from './models/Task.js';
import dotenv from 'dotenv';

dotenv.config();

const migrateStatuses = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Delete all old tasks to apply fresh seed simply
        await Task.deleteMany({});
        console.log('Cleared all tasks');

        console.log('Done mapping.');
        process.exit(0);

    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
};

migrateStatuses();
