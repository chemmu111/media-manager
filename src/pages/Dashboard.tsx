import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Video,
  Image,
  FileText,
  Trophy,
  Clock,
  CalendarDays,
  TrendingUp,
  Users,
} from "lucide-react";

const videosToReview = [
  { type: "Long Form", count: 2 },
  { type: "Short Form", count: 2 },
  { type: "Designs", count: 3 },
];

const teamMembers = [
  { name: "Editor 1", role: "Video Editor", online: true },
  { name: "Editor 2", role: "Video Editor", online: true },
  { name: "Content Writer", role: "Writer", online: true },
  { name: "Designer 1", role: "Graphic Designer", online: false },
  { name: "Videographer", role: "Camera", online: true },
  { name: "Editor 5", role: "Video Editor", online: false },
];

const Dashboard = () => {
  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Overview of your media production pipeline
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Videos to Review */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Video className="w-4 h-4" />
              Videos to Review
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {videosToReview.map((v) => (
              <div
                key={v.type}
                className="flex items-center justify-between text-sm"
              >
                <span>{v.type} Videos</span>
                <Badge variant="secondary" className="font-mono">
                  {v.count}
                </Badge>
              </div>
            ))}
            <div className="flex items-center justify-between text-sm">
              <span>Content Calendar</span>
              <Badge variant="secondary" className="font-mono">1</Badge>
            </div>
            <div className="pt-2 mt-2 border-t">
              <p className="text-xs text-muted-foreground">
                Video with no corrections needed:
              </p>
              <p className="text-sm font-medium mt-1 truncate">
                "How to buy a home in Seattle"
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Congratulations */}
        <Card className="border-status-success/30 bg-[hsl(var(--status-success)/0.04)]">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Trophy className="w-4 h-4 text-status-success" />
              Congratulations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-2xl font-bold">5/5</p>
              <p className="text-sm text-muted-foreground">
                Videos released on YouTube in April
              </p>
            </div>
            <Button variant="outline" size="sm" className="w-full">
              Go to Review Tab
            </Button>
          </CardContent>
        </Card>

        {/* Analytics / Targets */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-status-warning" />
              Targets
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="status-warning inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-medium">
              <span>20 days pending</span>
            </div>
            <p className="text-sm text-muted-foreground">to hit the target</p>
            <div className="pt-2 border-t space-y-1.5">
              <div className="flex items-center gap-2 text-sm">
                <CalendarDays className="w-3.5 h-3.5 text-status-info" />
                <span>Onam is coming up!</span>
              </div>
              <p className="text-xs text-muted-foreground">
                50 days left to release the creatives.
              </p>
            </div>
            <Button variant="outline" size="sm" className="w-full">
              Go to Monthly Targets
            </Button>
          </CardContent>
        </Card>

        {/* Team Attendance */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="w-4 h-4" />
              Team Attendance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium mb-3">Who is working today</p>
            <div className="space-y-2">
              {teamMembers.map((m) => (
                <div
                  key={m.name}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        m.online ? "bg-status-success" : "bg-muted-foreground/30"
                      }`}
                    />
                    <span>{m.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{m.role}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-status-danger">Absent today:</span> Designer 1, Editor 5
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Editor Performance */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-status-success" />
              Performance Highlight
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                E1
              </div>
              <div>
                <p className="font-medium">Editor 1 performed well in April</p>
                <p className="text-sm text-muted-foreground">
                  Fastest turnaround time across all projects
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                Get Team Performance Report
              </Button>
              <Button variant="outline" size="sm">
                Get Work Report
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Image className="w-4 h-4" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" size="sm" className="w-full justify-start gap-2">
              <FileText className="w-4 h-4" />
              Go to the Marketing Calendar
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start gap-2">
              <TrendingUp className="w-4 h-4" />
              Performance Analytics
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start gap-2">
              <Users className="w-4 h-4" />
              Team Analytics
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
