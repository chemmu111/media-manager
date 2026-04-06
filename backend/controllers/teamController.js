import Task from '../models/Task.js';
import User from '../models/User.js';

const AVATAR_COLORS = [
    'bg-blue-500', 'bg-violet-500', 'bg-emerald-500',
    'bg-amber-500', 'bg-rose-500', 'bg-cyan-500', 'bg-pink-500',
];

function avatarColor(name = '') {
    let hash = 0;
    for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffff;
    return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function initials(name = '') {
    return name
        .split(' ')
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? '')
        .join('');
}

// Map Task model status → display label used in the UI
function displayStatus(status) {
    const map = {
        in_progress:     'In Editing',
        under_review:    'Submitted',
        rejected:        'Feedback',
        completed:       'Completed',
        released:        'Completed',
        upcoming_event:  'Pending',
        unassigned:      'Pending',
    };
    return map[status] ?? 'Pending';
}

export const getWorkflow = async (req, res) => {
    try {
        const [tasks, users] = await Promise.all([
            Task.find({}).sort({ endDate: 1 }).lean(),
            User.find({}).select('name email role').lean(),
        ]);

        // Enrich each task with display-ready fields
        const enriched = tasks.map((t) => ({
            ...t,
            displayStatus:  displayStatus(t.status),
            assigneeColor:  avatarColor(t.assignee || ''),
            assigneeInit:   initials(t.assignee || '?'),
        }));

        // Team member stats (users that appear as assignees or are in DB)
        const memberNames = new Set([
            ...users.map((u) => u.name),
            ...tasks.map((t) => t.assignee).filter(Boolean),
        ]);

        const teamMembers = [...memberNames].map((name) => {
            const userTasks    = tasks.filter((t) => t.assignee === name);
            const completed    = userTasks.filter(
                (t) => t.status === 'completed' || t.status === 'released'
            ).length;
            const total        = userTasks.length;
            const efficiency   = total > 0 ? Math.round((completed / total) * 100) : 0;
            const dbUser       = users.find((u) => u.name === name);

            return {
                name,
                role:       dbUser?.role ?? 'editor',
                taskCount:  total,
                completed,
                efficiency,
                color:      avatarColor(name),
                initials:   initials(name),
            };
        });

        // Sort by efficiency descending
        teamMembers.sort((a, b) => b.efficiency - a.efficiency);

        // Upcoming milestones: next 5 tasks by endDate
        const milestones = enriched
            .filter((t) => t.endDate)
            .slice(0, 5)
            .map((t) => ({
                _id:      t._id,
                title:    t.title,
                endDate:  t.endDate,
                assignee: t.assignee,
                status:   t.displayStatus,
                color:    avatarColor(t.assignee || ''),
            }));

        res.json({ tasks: enriched, teamMembers, milestones });
    } catch (err) {
        console.error('[Team] getWorkflow error:', err.message);
        res.status(500).json({ message: err.message });
    }
};
