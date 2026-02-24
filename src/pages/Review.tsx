import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Video, Image, FileText, CheckCircle, XCircle, Clock, MessageSquare } from "lucide-react";

interface ReviewItem {
  id: string;
  title: string;
  type: "video" | "design" | "content";
  submittedBy: string;
  submittedAt: string;
  status: "pending" | "approved" | "rejected" | "revision";
  comments: number;
}

const reviewItems: ReviewItem[] = [
  { id: "1", title: "How much should I offer on a new home in Seattle?", type: "video", submittedBy: "Editor 1", submittedAt: "Apr 14", status: "pending", comments: 3 },
  { id: "2", title: "Seattle Real Estate Market Update - April", type: "video", submittedBy: "Editor 2", submittedAt: "Apr 16", status: "pending", comments: 1 },
  { id: "3", title: "YouTube Thumbnail Pack", type: "design", submittedBy: "Designer 1", submittedAt: "Apr 11", status: "revision", comments: 5 },
  { id: "4", title: "Instagram Carousel - Home Tips", type: "design", submittedBy: "Designer 1", submittedAt: "Apr 9", status: "approved", comments: 2 },
  { id: "5", title: "Blog Post - First Time Buyers Guide", type: "content", submittedBy: "Content Writer", submittedAt: "Apr 7", status: "approved", comments: 0 },
  { id: "6", title: "Office Tour Video", type: "video", submittedBy: "Editor 5", submittedAt: "Apr 2", status: "rejected", comments: 4 },
];

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: "Pending", color: "bg-status-warning/15 text-status-warning", icon: <Clock className="w-3.5 h-3.5" /> },
  approved: { label: "Approved", color: "bg-status-success/15 text-status-success", icon: <CheckCircle className="w-3.5 h-3.5" /> },
  rejected: { label: "Rejected", color: "bg-status-danger/15 text-status-danger", icon: <XCircle className="w-3.5 h-3.5" /> },
  revision: { label: "Needs Revision", color: "bg-status-info/15 text-status-info", icon: <MessageSquare className="w-3.5 h-3.5" /> },
};

const typeIcons: Record<string, React.ReactNode> = {
  video: <Video className="w-4 h-4" />,
  design: <Image className="w-4 h-4" />,
  content: <FileText className="w-4 h-4" />,
};

const Review = () => {
  const [activeTab, setActiveTab] = useState("all");

  const filteredItems = activeTab === "all" ? reviewItems : reviewItems.filter((r) => r.status === activeTab);

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Review</h1>
        <p className="text-muted-foreground text-sm mt-1">Review and approve submitted content</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Pending", count: reviewItems.filter((r) => r.status === "pending").length, color: "text-status-warning" },
          { label: "Approved", count: reviewItems.filter((r) => r.status === "approved").length, color: "text-status-success" },
          { label: "Rejected", count: reviewItems.filter((r) => r.status === "rejected").length, color: "text-status-danger" },
          { label: "Revision", count: reviewItems.filter((r) => r.status === "revision").length, color: "text-status-info" },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="revision">Revision</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4 space-y-3">
          {filteredItems.map((item) => {
            const sc = statusConfig[item.status];
            return (
              <Card key={item.id} className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center shrink-0">
                      {typeIcons[item.type]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground">by {item.submittedBy} · {item.submittedAt}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {item.comments > 0 && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        {item.comments}
                      </span>
                    )}
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md font-medium ${sc.color}`}>
                      {sc.icon}
                      {sc.label}
                    </span>
                    {item.status === "pending" && (
                      <div className="flex gap-1.5">
                        <Button size="sm" variant="outline" className="h-7 text-xs text-status-success border-status-success/30 hover:bg-status-success/10">Approve</Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs text-status-danger border-status-danger/30 hover:bg-status-danger/10">Reject</Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Review;
