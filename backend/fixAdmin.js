/**
 * One-time script: sets admin@gmail.com role to 'admin' in MongoDB.
 * Usage: node fixAdmin.js
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!MONGO_URI) {
    console.error('❌  MONGO_URI not found in .env');
    process.exit(1);
}

await mongoose.connect(MONGO_URI);

const result = await mongoose.connection.db
    .collection('users')
    .findOneAndUpdate(
        { email: 'admin@gmail.com' },
        { $set: { role: 'admin' } },
        { returnDocument: 'after' }
    );

if (!result) {
    console.error('❌  No user found with email admin@gmail.com');
} else {
    console.log(`✅  Updated: ${result.email} → role = "${result.role}"`);
}

await mongoose.disconnect();
