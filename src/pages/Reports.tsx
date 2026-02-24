import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { FileText, Download, Users, TrendingUp, Video } from "lucide-react";

const weeklyOutput = [
  { week: "W1", videos: 3, designs: 2, content: 2 },
  { week: "W2", videos: 2, designs: 4, content: 1 },
  { week: "W3", videos: 4, designs: 1, content: 3 },
  { week: "W4", videos: 1, designs: 3, content: 2 },
];

const teamPerformance = [
  { name: "Editor 1", completed: 8, avgTime: "2.1 days", rating: "A" },
  { name: "Editor 2", completed: 6, avgTime: "2.8 days", rating: "B+" },
  { name: "Designer 1", completed: 7, avgTime: "1.5 days", rating: "A" },
  { name: "Content Writer", completed: 5, avgTime: "3.0 days", rating: "B" },
  { name: "Editor 5", completed: 3, avgTime: "4.2 days", rating: "C+" },
];

const contentBreakdown = [
  { name: "Long Form", value: 5, color: "hsl(var(--status-info))" },
  { name: "Short Form", value: 8, color: "hsl(var(--status-success))" },
  { name: "Designs", value: 7, color: "hsl(var(--status-purple))" },
  { name: "Written", value: 6, color: "hsl(var(--status-warning))" },
];

const Reports = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground text-sm mt-1">Performance analytics and team reports</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Download className="w-4 h-4" />
          Export
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Output", value: "26", sub: "pieces this month", icon: <Video className="w-4 h-4" /> },
          { label: "Team Members", value: "6", sub: "active", icon: <Users className="w-4 h-4" /> },
          { label: "Avg Turnaround", value: "2.7d", sub: "per task", icon: <TrendingUp className="w-4 h-4" /> },
          { label: "Approval Rate", value: "85%", sub: "first submission", icon: <FileText className="w-4 h-4" /> },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              {s.icon}
              <span className="text-xs">{s.label}</span>
            </div>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.sub}</p>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="output">
        <TabsList>
          <TabsTrigger value="output">Weekly Output</TabsTrigger>
          <TabsTrigger value="team">Team Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="output" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Weekly Output</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={weeklyOutput}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="week" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="videos" fill="hsl(var(--status-info))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="designs" fill="hsl(var(--status-purple))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="content" fill="hsl(var(--status-success))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Content Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={contentBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                      {contentBreakdown.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1 mt-2">
                  {contentBreakdown.map((c) => (
                    <div key={c.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                        {c.name}
                      </div>
                      <span className="font-mono">{c.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="team" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 text-muted-foreground font-medium">Member</th>
                    <th className="text-left p-3 text-muted-foreground font-medium">Completed</th>
                    <th className="text-left p-3 text-muted-foreground font-medium">Avg Time</th>
                    <th className="text-left p-3 text-muted-foreground font-medium">Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {teamPerformance.map((m) => (
                    <tr key={m.name} className="border-b last:border-0 hover:bg-accent/50 transition-colors">
                      <td className="p-3 font-medium">{m.name}</td>
                      <td className="p-3">{m.completed} tasks</td>
                      <td className="p-3">{m.avgTime}</td>
                      <td className="p-3">
                        <Badge variant={m.rating.startsWith("A") ? "default" : "secondary"}>{m.rating}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;
