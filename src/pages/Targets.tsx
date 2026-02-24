import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Target, Video, Image, FileText, TrendingUp, CalendarDays } from "lucide-react";

interface TargetItem {
  label: string;
  current: number;
  goal: number;
  type: "video" | "design" | "content";
}

const monthlyTargets: TargetItem[] = [
  { label: "Long Form Videos", current: 3, goal: 5, type: "video" },
  { label: "Short Form / Reels", current: 7, goal: 10, type: "video" },
  { label: "Thumbnails", current: 5, goal: 5, type: "design" },
  { label: "Instagram Carousels", current: 2, goal: 4, type: "design" },
  { label: "Blog Posts", current: 3, goal: 4, type: "content" },
  { label: "Newsletters", current: 2, goal: 4, type: "content" },
];

const typeIcons: Record<string, React.ReactNode> = {
  video: <Video className="w-4 h-4" />,
  design: <Image className="w-4 h-4" />,
  content: <FileText className="w-4 h-4" />,
};

const upcomingEvents = [
  { name: "Onam Festival", daysLeft: 50, type: "Festival" },
  { name: "Q2 Report Deadline", daysLeft: 15, type: "Internal" },
  { name: "Product Launch Video", daysLeft: 8, type: "Client" },
];

const Targets = () => {
  const totalCurrent = monthlyTargets.reduce((a, b) => a + b.current, 0);
  const totalGoal = monthlyTargets.reduce((a, b) => a + b.goal, 0);
  const overallProgress = Math.round((totalCurrent / totalGoal) * 100);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Targets</h1>
        <p className="text-muted-foreground text-sm mt-1">Track monthly production goals and deadlines</p>
      </div>

      {/* Overall Progress */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              <span className="font-semibold">April Overall Progress</span>
            </div>
            <Badge variant={overallProgress >= 80 ? "default" : "secondary"} className="font-mono">
              {totalCurrent}/{totalGoal}
            </Badge>
          </div>
          <Progress value={overallProgress} className="h-2.5" />
          <p className="text-xs text-muted-foreground mt-2">{overallProgress}% complete · 20 days remaining</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Individual Targets */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Monthly Targets
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {monthlyTargets.map((t) => {
              const pct = Math.round((t.current / t.goal) * 100);
              return (
                <div key={t.label} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      {typeIcons[t.type]}
                      <span>{t.label}</span>
                    </div>
                    <span className="text-xs font-mono text-muted-foreground">{t.current}/{t.goal}</span>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Upcoming Deadlines */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CalendarDays className="w-4 h-4" />
              Upcoming Deadlines
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingEvents.map((e) => (
              <div key={e.name} className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
                <div>
                  <p className="text-sm font-medium">{e.name}</p>
                  <p className="text-xs text-muted-foreground">{e.type}</p>
                </div>
                <Badge variant={e.daysLeft <= 10 ? "destructive" : "secondary"} className="font-mono">
                  {e.daysLeft}d left
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Targets;
