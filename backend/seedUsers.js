import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';

dotenv.config();

const users = [
    {
        name: 'Admin',
        email: 'admin@gmail.com',
        password: 'admin123',
        role: 'admin',
    },
    {
        name: 'Editor',
        email: 'editor@gmail.com',
        password: 'editor123',
        role: 'editor',
    },
];

async function seed() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB connected');

        for (const u of users) {
            const existing = await User.findOne({ email: u.email });
            if (existing) {
                console.log(`⚠️  User already exists: ${u.email} (skipped)`);
                continue;
            }
            const hashed = await bcrypt.hash(u.password, 10);
            await User.create({ ...u, password: hashed });
            console.log(`✅ Created ${u.role}: ${u.email}`);
        }

        console.log('\n🎉 Done! Login credentials:');
        console.log('   Admin  → admin@gmail.com  / admin123');
        console.log('   Editor → editor@gmail.com / editor123');
    } catch (err) {
        console.error('❌ Seed failed:', err.message);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

seed();
