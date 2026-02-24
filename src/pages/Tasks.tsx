import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, MoreHorizontal, Calendar, Video, Image, FileText, Filter } from "lucide-react";

type TaskStatus = "unassigned" | "todo" | "in_progress" | "completed" | "under_review" | "released" | "rejected";
type TaskType = "video" | "design" | "content";

interface Task {
  id: string;
  title: string;
  type: TaskType;
  assignee?: string;
  dueDate?: string;
  status: TaskStatus;
  priority?: "low" | "medium" | "high";
}

const columns: { id: TaskStatus; label: string; color: string }[] = [
  { id: "unassigned", label: "Unassigned", color: "text-muted-foreground" },
  { id: "todo", label: "To Do", color: "text-status-info" },
  { id: "in_progress", label: "In Progress", color: "text-status-warning" },
  { id: "completed", label: "Completed", color: "text-status-success" },
  { id: "rejected", label: "Rejected", color: "text-status-danger" },
];

const initialTasks: Task[] = [
  { id: "1", title: "How much should I offer on a new home in Seattle?", type: "video", status: "in_progress", assignee: "Editor 1", dueDate: "Apr 15", priority: "high" },
  { id: "2", title: "Seattle Real Estate Market Update - April", type: "video", status: "in_progress", assignee: "Editor 2", dueDate: "Apr 18", priority: "medium" },
  { id: "3", title: "Onam Festival Special Reel", type: "video", status: "unassigned", dueDate: "Apr 25", priority: "high" },
  { id: "4", title: "Instagram Carousel - Home Tips", type: "design", status: "completed", assignee: "Designer 1", dueDate: "Apr 10", priority: "low" },
  { id: "5", title: "YouTube Thumbnail Pack", type: "design", status: "todo", assignee: "Designer 1", dueDate: "Apr 12", priority: "medium" },
  { id: "6", title: "Blog Post - First Time Buyers Guide", type: "content", status: "completed", assignee: "Content Writer", dueDate: "Apr 8", priority: "low" },
  { id: "7", title: "Weekly Newsletter Draft", type: "content", status: "unassigned", dueDate: "Apr 20", priority: "medium" },
  { id: "8", title: "Client Testimonial Short", type: "video", status: "completed", assignee: "Editor 1", dueDate: "Apr 5", priority: "low" },
  { id: "9", title: "Office Tour Video", type: "video", status: "rejected", assignee: "Editor 5", dueDate: "Apr 3", priority: "high" },
  { id: "10", title: "Property Walkthrough - 5th Ave", type: "video", status: "todo", assignee: "Editor 2", dueDate: "Apr 22", priority: "high" },
];

const typeIcons: Record<TaskType, React.ReactNode> = {
  video: <Video className="w-3.5 h-3.5" />,
  design: <Image className="w-3.5 h-3.5" />,
  content: <FileText className="w-3.5 h-3.5" />,
};

const priorityColors: Record<string, string> = {
  high: "bg-status-danger/15 text-status-danger",
  medium: "bg-status-warning/15 text-status-warning",
  low: "bg-muted text-muted-foreground",
};

const Tasks = () => {
  const [tasks] = useState<Task[]>(initialTasks);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground text-sm mt-1">Track and manage all production tasks</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Filter className="w-4 h-4" />
            Filter
          </Button>
          <Button size="sm" className="gap-1.5">
            <Plus className="w-4 h-4" />
            New Task
          </Button>
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4">
        {columns.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.id);
          return (
            <div key={col.id} className="min-w-[250px] w-[250px] flex flex-col shrink-0">
              <div className="flex items-center gap-2 mb-3 px-1">
                <span className={`text-sm font-semibold ${col.color}`}>{col.label}</span>
                <Badge variant="secondary" className="text-xs font-mono h-5 px-1.5">{colTasks.length}</Badge>
              </div>
              <div className="space-y-2">
                {colTasks.map((task) => (
                  <Card key={task.id} className="p-3 cursor-pointer hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-2 min-w-0">
                        <p className="text-sm font-medium leading-snug line-clamp-2">{task.title}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-accent text-accent-foreground">
                            {typeIcons[task.type]}
                            {task.type}
                          </span>
                          {task.priority && (
                            <span className={`text-xs px-1.5 py-0.5 rounded ${priorityColors[task.priority]}`}>
                              {task.priority}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          {task.dueDate && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {task.dueDate}
                            </span>
                          )}
                          {task.assignee && (
                            <span className="text-xs text-muted-foreground">{task.assignee}</span>
                          )}
                        </div>
                      </div>
                      <button className="shrink-0 mt-0.5">
                        <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>
                  </Card>
                ))}
                <button className="w-full py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors flex items-center justify-center gap-1">
                  <Plus className="w-3 h-3" />
                  Add task
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Tasks;
