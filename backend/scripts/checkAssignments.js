/**
 * Diagnostic script: cross-check task assignedTo fields against the users collection.
 *
 * Run from the backend folder:
 *   node scripts/checkAssignments.js
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Task from '../models/Task.js';
import User from '../models/User.js';

dotenv.config();

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const [tasks, users] = await Promise.all([
        Task.find({}).lean(),
        User.find({}).select('_id name username email role').lean(),
    ]);

    const userMap = new Map(users.map((u) => [String(u._id), u]));

    console.log(`📋 Total tasks : ${tasks.length}`);
    console.log(`👥 Total users : ${users.length}\n`);
    console.log('─'.repeat(90));

    let orphaned = 0;
    let unassigned = 0;
    let matched = 0;

    for (const task of tasks) {
        const id = task.assignedTo ? String(task.assignedTo) : null;

        if (!id) {
            unassigned++;
            console.log(`⬜  [UNASSIGNED]  "${task.title}"`);
            continue;
        }

        const user = userMap.get(id);
        if (user) {
            matched++;
            console.log(`✅  [MATCH]       "${task.title}"  →  @${user.username} (${user.role})`);
        } else {
            orphaned++;
            console.log(`❌  [ORPHAN]      "${task.title}"  →  assignedTo: ${id}  (no matching user)`);
        }
    }

    console.log('─'.repeat(90));
    console.log(`\nSummary:`);
    console.log(`  ✅ Matched    : ${matched}`);
    console.log(`  ⬜ Unassigned : ${unassigned}`);
    console.log(`  ❌ Orphaned   : ${orphaned}`);

    if (orphaned > 0) {
        console.log('\n⚠️  Orphaned tasks have an assignedTo that references a non-existent user.');
        console.log('   This is caused by the createTask bug (now fixed in taskController.js).');
        console.log('   You can clear orphaned assignedTo fields by running:');
        console.log('   node scripts/clearOrphanedAssignments.js\n');
    }

    await mongoose.disconnect();
}

run().catch((err) => {
    console.error('Script failed:', err.message);
    process.exit(1);
});
