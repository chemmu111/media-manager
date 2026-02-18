import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, MoreHorizontal, Calendar, Video, Image, FileText } from "lucide-react";

type TaskStatus = "unassigned" | "in_progress" | "completed" | "under_review" | "released" | "rejected";

interface Task {
  id: string;
  title: string;
  type: "video" | "design" | "content";
  assignee?: string;
  dueDate?: string;
  status: TaskStatus;
}

const columns: { id: TaskStatus; label: string; color: string }[] = [
  { id: "unassigned", label: "Unassigned", color: "text-muted-foreground" },
  { id: "in_progress", label: "In Progress", color: "text-status-info" },
  { id: "completed", label: "Completed", color: "text-status-success" },
  { id: "under_review", label: "Under Review", color: "text-status-warning" },
  { id: "released", label: "Released", color: "text-status-success" },
  { id: "rejected", label: "Rejected", color: "text-status-danger" },
];

const initialTasks: Task[] = [
  { id: "1", title: "How much should I offer on a new home in Seattle?", type: "video", status: "in_progress", assignee: "Editor 1", dueDate: "Apr 15" },
  { id: "2", title: "Seattle Real Estate Market Update - April", type: "video", status: "in_progress", assignee: "Editor 2", dueDate: "Apr 18" },
  { id: "3", title: "Onam Festival Special Reel", type: "video", status: "unassigned", dueDate: "Apr 25" },
  { id: "4", title: "Instagram Carousel - Home Tips", type: "design", status: "completed", assignee: "Designer 1", dueDate: "Apr 10" },
  { id: "5", title: "YouTube Thumbnail Pack", type: "design", status: "under_review", assignee: "Designer 1", dueDate: "Apr 12" },
  { id: "6", title: "Blog Post - First Time Buyers Guide", type: "content", status: "completed", assignee: "Content Writer", dueDate: "Apr 8" },
  { id: "7", title: "Weekly Newsletter Draft", type: "content", status: "unassigned", dueDate: "Apr 20" },
  { id: "8", title: "Client Testimonial Short", type: "video", status: "released", assignee: "Editor 1", dueDate: "Apr 5" },
  { id: "9", title: "Office Tour Video", type: "video", status: "rejected", assignee: "Editor 5", dueDate: "Apr 3" },
];

const typeIcons: Record<string, React.ReactNode> = {
  video: <Video className="w-3.5 h-3.5" />,
  design: <Image className="w-3.5 h-3.5" />,
  content: <FileText className="w-3.5 h-3.5" />,
};

const typeColors: Record<string, string> = {
  video: "status-info",
  design: "status-purple",
  content: "status-success",
};

const TeamSpace = () => {
  const [tasks] = useState<Task[]>(initialTasks);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team Space</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage tasks across your media team</p>
        </div>
        <Button size="sm" className="gap-1.5">
          <Plus className="w-4 h-4" />
          New Task
        </Button>
      </div>

      <Tabs defaultValue="tasks">
        <TabsList>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="review">Review</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="mt-4">
          <div className="flex gap-3 overflow-x-auto pb-4">
            {columns.map((col) => {
              const colTasks = tasks.filter((t) => t.status === col.id);
              return (
                <div
                  key={col.id}
                  className="min-w-[240px] w-[240px] flex flex-col shrink-0"
                >
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <span className={`text-sm font-semibold ${col.color}`}>
                      {col.label}
                    </span>
                    <Badge variant="secondary" className="text-xs font-mono h-5 px-1.5">
                      {colTasks.length}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {colTasks.map((task) => (
                      <Card
                        key={task.id}
                        className="p-3 cursor-pointer hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-2 min-w-0">
                            <p className="text-sm font-medium leading-snug line-clamp-2">
                              {task.title}
                            </p>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`${typeColors[task.type]} inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded`}>
                                {typeIcons[task.type]}
                                {task.type}
                              </span>
                              {task.dueDate && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {task.dueDate}
                                </span>
                              )}
                            </div>
                            {task.assignee && (
                              <p className="text-xs text-muted-foreground">
                                {task.assignee}
                              </p>
                            )}
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
        </TabsContent>

        <TabsContent value="review" className="mt-4">
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            Review section coming soon
          </div>
        </TabsContent>

        <TabsContent value="calendar" className="mt-4">
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            Calendar view coming soon
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TeamSpace;
