import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ChevronLeft, ChevronRight, Clock as ClockIcon, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CalendarEvent {
  id: string;
  date: number;
  title: string;
  type: "content" | "event" | "holiday";
  time?: string;
  description?: string;
}

const initialEvents: CalendarEvent[] = [
  { id: "1", date: 5, title: "YouTube: Home Buying Tips", type: "content", time: "10:00 AM" },
  { id: "2", date: 8, title: "Blog: First Time Buyers", type: "content", time: "02:00 PM" },
  { id: "3", date: 12, title: "Students Vacation", type: "holiday" },
  { id: "4", date: 14, title: "Onam Coming Up", type: "event" },
  { id: "5", date: 15, title: "YouTube: Seattle Market", type: "content", time: "11:30 AM" },
  { id: "6", date: 18, title: "Instagram Carousel", type: "content", time: "09:00 AM" },
  { id: "7", date: 20, title: "Newsletter", type: "content", time: "05:00 PM" },
  { id: "8", date: 22, title: "New Office Opening", type: "event", time: "06:00 PM" },
  { id: "9", date: 25, title: "Onam Festival Reel", type: "content", time: "12:00 PM" },
];

const typeStyles: Record<string, string> = {
  content: "bg-blue-100 text-blue-700 border-blue-200",
  event: "bg-orange-100 text-orange-700 border-orange-200",
  holiday: "bg-purple-100 text-purple-700 border-purple-200",
};

const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const ContentCalendar = () => {
  const [month] = useState(3); // April (0-indexed)
  const [year] = useState(2025);
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Partial<CalendarEvent> | null>(null);

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const handleDayClick = (day: number) => {
    setEditingEvent({ date: day, type: "content" });
    setIsModalOpen(true);
  };

  const handleEditClick = (e: React.MouseEvent, event: CalendarEvent) => {
    e.stopPropagation();
    setEditingEvent(event);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!editingEvent?.title) return;

    if (editingEvent.id) {
      setEvents(events.map(e => e.id === editingEvent.id ? (editingEvent as CalendarEvent) : e));
    } else {
      const newEvent = {
        ...editingEvent,
        id: Math.random().toString(36).substr(2, 9),
      } as CalendarEvent;
      setEvents([...events, newEvent]);
    }
    setIsModalOpen(false);
    setEditingEvent(null);
  };

  const handleDelete = () => {
    if (editingEvent?.id) {
      setEvents(events.filter(e => e.id !== editingEvent.id));
      setIsModalOpen(false);
      setEditingEvent(null);
    }
  };

  return (
    <div className="p-6 space-y-5 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Content Calendar</h1>
          <p className="text-muted-foreground text-sm mt-1 text-gray-500">Plan and schedule your content</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white rounded-full px-4"
            onClick={() => {
              setEditingEvent({ date: new Date().getDate(), type: "content" });
              setIsModalOpen(true);
            }}
          >
            <Plus className="w-4 h-4" />
            Add Content
          </Button>
          <div className="flex items-center gap-2 border rounded-full px-3 py-1 bg-white">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Present</span>
          </div>
        </div>
      </div>

      {/* Month header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-gray-100 text-gray-600 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h2 className="text-lg font-bold text-gray-900 min-w-[120px] text-center">April 2025</h2>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-gray-100 text-gray-600 transition-colors">
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Calendar Grid */}
      <Card className="overflow-hidden border-none shadow-xl rounded-2xl bg-white ring-1 ring-gray-200">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b bg-gray-50/50">
          {daysOfWeek.map((d) => (
            <div key={d} className="px-3 py-3 text-xs font-bold text-gray-400 uppercase tracking-widest text-center border-r last:border-r-0">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            const dayEvents = day ? events.filter((e) => e.date === day) : [];
            const isToday = day === 12; // Just for mockup feel
            return (
              <div
                key={i}
                onClick={() => day && handleDayClick(day)}
                className={`min-h-[120px] p-2 border-b border-r last:border-r-0 relative transition-all duration-200 ${
                  !day 
                    ? "bg-gray-50/30" 
                    : isToday 
                      ? "bg-blue-50/30 cursor-pointer" 
                      : "hover:bg-gray-50 cursor-pointer"
                }`}
              >
                {day && (
                  <>
                    <div className="flex justify-between items-center mb-1 px-1">
                      <span className={`text-sm font-bold ${isToday ? "text-blue-600" : "text-gray-900"}`}>{day}</span>
                      {isToday && <span className="text-[10px] font-bold text-blue-500 uppercase tracking-tighter">Today</span>}
                    </div>
                    <div className="space-y-1 mt-1">
                      {dayEvents.map((ev) => (
                        <div
                          key={ev.id}
                          onClick={(e) => handleEditClick(e, ev)}
                          className={`${typeStyles[ev.type]} text-[10px] font-semibold px-2 py-1 rounded-lg border shadow-sm truncate transition-transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center gap-1`}
                          title={`${ev.time ? ev.time + " - " : ""}${ev.title}`}
                        >
                          <div className={`w-1.5 h-1.5 rounded-full ${
                             ev.type === 'content' ? 'bg-blue-500' : ev.type === 'event' ? 'bg-orange-500' : 'bg-purple-500'
                          }`} />
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
      <div className="flex justify-center items-center gap-8 pt-2">
        <LegendItem color="bg-blue-500" label="Content" />
        <LegendItem color="bg-orange-500" label="Event" />
        <LegendItem color="bg-purple-500" label="Holiday" />
      </div>

      {/* Event Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl border-none shadow-2xl p-0 overflow-hidden">
          <div className="bg-gray-50/80 px-6 py-4 border-b flex justify-between items-center">
            <DialogHeader className="p-0 space-y-0">
              <DialogTitle className="text-xl font-bold text-gray-900 leading-none">
                {editingEvent?.id ? "Edit Content" : "Schedule Content"}
              </DialogTitle>
              <p className="text-xs text-gray-500 mt-1 uppercase font-bold tracking-wider">
                {editingEvent?.id ? "Update existing plan" : `New plan for April ${editingEvent?.date}, 2025`}
              </p>
            </DialogHeader>
          </div>
          <div className="grid gap-6 p-6 py-8">
            <div className="grid gap-2">
              <Label htmlFor="title" className="text-xs font-bold uppercase tracking-wider text-gray-400">Content Title</Label>
              <Input
                id="title"
                placeholder="e.g., YouTube Video: Home Tour"
                value={editingEvent?.title || ""}
                onChange={(e) => setEditingEvent({ ...editingEvent, title: e.target.value })}
                className="rounded-xl border-gray-200 focus:ring-2 focus:ring-primary/20 transition-all h-11 text-gray-900"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="type" className="text-xs font-bold uppercase tracking-wider text-gray-400">Type</Label>
                <Select
                  value={editingEvent?.type}
                  onValueChange={(val: any) => setEditingEvent({ ...editingEvent, type: val })}
                >
                  <SelectTrigger className="rounded-xl border-gray-200 h-11">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-none shadow-xl ring-1 ring-black/5">
                    <SelectItem value="content" className="rounded-lg">Content (Blue)</SelectItem>
                    <SelectItem value="event" className="rounded-lg">Event (Orange)</SelectItem>
                    <SelectItem value="holiday" className="rounded-lg">Holiday (Purple)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="time" className="text-xs font-bold uppercase tracking-wider text-gray-400">Time</Label>
                <div className="relative">
                  <Input
                    id="time"
                    type="time"
                    value={editingEvent?.time || ""}
                    onChange={(e) => setEditingEvent({ ...editingEvent, time: e.target.value })}
                    className="rounded-xl border-gray-200 h-11 pl-9 focus:ring-2 focus:ring-primary/20 appearance-none bg-white"
                  />
                  <ClockIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description" className="text-xs font-bold uppercase tracking-wider text-gray-400">Description / Notes</Label>
              <Textarea
                id="description"
                placeholder="Add some notes about this schedule..."
                value={editingEvent?.description || ""}
                onChange={(e) => setEditingEvent({ ...editingEvent, description: e.target.value })}
                className="rounded-xl border-gray-200 min-h-[100px] py-3 focus:ring-2 focus:ring-primary/20 transition-all resize-none"
              />
            </div>
          </div>
          <DialogFooter className="p-6 pt-2 bg-gray-50/50 flex flex-row items-center justify-between gap-3 border-t">
            {editingEvent?.id ? (
              <Button
                type="button"
                variant="ghost"
                className="text-red-500 hover:text-red-600 hover:bg-red-50 font-bold text-xs uppercase tracking-widest gap-2"
                onClick={handleDelete}
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
            ) : (
              <div />
            )}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="rounded-full px-6 text-xs font-bold uppercase tracking-widest border-gray-200 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                className="rounded-full px-6 bg-primary hover:bg-primary/90 text-white text-xs font-bold uppercase tracking-widest shadow-lg shadow-primary/20 transition-all"
              >
                Save Schedule
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const LegendItem = ({ color, label }: { color: string; label: string }) => (
  <div className="flex items-center gap-2 group cursor-default">
    <div className={`w-3 h-3 rounded-full ${color} shadow-sm group-hover:scale-125 transition-transform`} />
    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</span>
  </div>
);

export default ContentCalendar;
