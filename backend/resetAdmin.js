/**
 * resetAdmin.js
 * Force-resets the admin user in MongoDB.
 * Deletes any existing admin@gmail.com record and re-creates it with role='admin'.
 *
 * Usage: node resetAdmin.js
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';

dotenv.config();

const ADMIN_EMAIL    = 'admin@gmail.com';
const ADMIN_PASSWORD = 'admin123';
const ADMIN_NAME     = 'Admin';

async function reset() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB connected');

        // Remove any existing record for this email
        const deleted = await User.deleteOne({ email: ADMIN_EMAIL });
        if (deleted.deletedCount > 0) {
            console.log(`🗑️  Removed existing user: ${ADMIN_EMAIL}`);
        }

        // Re-create with correct role
        const hashed = await bcrypt.hash(ADMIN_PASSWORD, 10);
        const admin  = await User.create({
            name:     ADMIN_NAME,
            email:    ADMIN_EMAIL,
            password: hashed,
            role:     'admin',
        });

        console.log(`\n✅ Admin user created:`);
        console.log(`   ID    : ${admin._id}`);
        console.log(`   Email : ${admin.email}`);
        console.log(`   Role  : ${admin.role}`);
        console.log(`\n🔐 Login credentials:`);
        console.log(`   Email    → ${ADMIN_EMAIL}`);
        console.log(`   Password → ${ADMIN_PASSWORD}`);
    } catch (err) {
        console.error('❌ Reset failed:', err.message);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

reset();
