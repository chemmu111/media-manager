import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CalendarEvent {
  date: number;
  title: string;
  type: "content" | "event" | "holiday";
}

const events: CalendarEvent[] = [
  { date: 5, title: "YouTube: Home Buying Tips", type: "content" },
  { date: 8, title: "Blog: First Time Buyers", type: "content" },
  { date: 12, title: "Students Vacation", type: "holiday" },
  { date: 14, title: "Onam Coming Up", type: "event" },
  { date: 15, title: "YouTube: Seattle Market", type: "content" },
  { date: 18, title: "Instagram Carousel", type: "content" },
  { date: 20, title: "Newsletter", type: "content" },
  { date: 22, title: "New Office Opening", type: "event" },
  { date: 25, title: "Onam Festival Reel", type: "content" },
];

const typeStyles: Record<string, string> = {
  content: "status-info",
  event: "status-warning",
  holiday: "status-purple",
};

const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const ContentCalendar = () => {
  const [month] = useState(3); // April (0-indexed)
  const [year] = useState(2025);

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  return (
    <div className="p-6 space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Content Calendar</h1>
          <p className="text-muted-foreground text-sm mt-1">Plan and schedule your content</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">Contents</Button>
          <Button variant="outline" size="sm">Events</Button>
        </div>
      </div>

      {/* Month header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <h2 className="text-lg font-semibold">April 2025</h2>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Calendar Grid */}
      <Card className="overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b">
          {daysOfWeek.map((d) => (
            <div key={d} className="px-3 py-2 text-xs font-medium text-muted-foreground text-center">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            const dayEvents = day ? events.filter((e) => e.date === day) : [];
            return (
              <div
                key={i}
                className={`min-h-[100px] p-2 border-b border-r ${
                  !day ? "bg-muted/30" : "hover:bg-accent/30 transition-colors"
                }`}
              >
                {day && (
                  <>
                    <span className="text-sm font-medium">{day}</span>
                    <div className="mt-1 space-y-1">
                      {dayEvents.map((ev, j) => (
                        <div
                          key={j}
                          className={`${typeStyles[ev.type]} text-xs px-1.5 py-0.5 rounded truncate`}
                        >
                          {ev.title}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-status-info" />
          Content
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-status-warning" />
          Event
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-status-purple" />
          Holiday
        </div>
      </div>
    </div>
  );
};

export default ContentCalendar;
