import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Video,
  Image,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  MessageSquare,
  AlertTriangle,
  RefreshCw,
  ArrowLeft,
  Send,
  Mic,
  MicOff,
  Play,
  Pause,
  X,
  AlignLeft,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

// ── Types ────────────────────────────────────────────────────────────────────
interface ReviewItem {
  _id: string;
  title: string;
  type: "video" | "design" | "content";
  submittedBy: string;
  submittedAt: string;
  status: "pending" | "approved" | "rejected" | "revision";
  videoUrl?: string;
}

interface ChatMessage {
  _id: string;
  contentId: string;
  userId: string;
  userName: string;
  type: "text" | "voice";
  message?: string;
  audioUrl?: string;
  audioDuration?: number;
  timestamp: string;
  isOwn: boolean;
}

// ── Mock data ─────────────────────────────────────────────────────────────────
const MOCK_ITEMS: ReviewItem[] = [
  {
    _id: "mock-1",
    title: "How much should I offer on a new home in Seattle?",
    type: "video",
    submittedBy: "Editor 1",
    submittedAt: new Date().toISOString(),
    status: "pending",
    videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
  },
  {
    _id: "mock-2",
    title: "Seattle Real Estate Market Update - April",
    type: "video",
    submittedBy: "Editor 2",
    submittedAt: new Date(Date.now() - 86400000).toISOString(),
    status: "pending",
    videoUrl: "https://www.w3schools.com/html/movie.mp4",
  },
  {
    _id: "mock-3",
    title: "Instagram Carousel - Home Tips",
    type: "design",
    submittedBy: "Designer 1",
    submittedAt: new Date(Date.now() - 172800000).toISOString(),
    status: "approved",
  },
  {
    _id: "mock-4",
    title: "Q1 Market Analysis Report",
    type: "content",
    submittedBy: "Writer 1",
    submittedAt: new Date(Date.now() - 259200000).toISOString(),
    status: "rejected",
  },
  {
    _id: "mock-5",
    title: "Spring Listings Campaign Video",
    type: "video",
    submittedBy: "Editor 3",
    submittedAt: new Date(Date.now() - 345600000).toISOString(),
    status: "revision",
    videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
  },
];

// ── Seed dummy chat messages for mock tasks ────────────────────────────────
function buildDummyChat(): Record<string, ChatMessage[]> {
  const now = Date.now();
  const result: Record<string, ChatMessage[]> = {};
  MOCK_ITEMS.forEach((item) => {
    result[item._id] = [
      {
        _id: `d1-${item._id}`,
        contentId: item._id,
        userId: "admin",
        userName: "Admin",
        type: "text",
        message: "The intro transition needs to be smoother. Can you check the timing?",
        timestamp: new Date(now - 7200000).toISOString(),
        isOwn: true,
      },
      {
        _id: `d2-${item._id}`,
        contentId: item._id,
        userId: item.submittedBy,
        userName: item.submittedBy,
        type: "voice",
        audioUrl: "",
        audioDuration: 18,
        timestamp: new Date(now - 3600000).toISOString(),
        isOwn: false,
      },
      {
        _id: `d3-${item._id}`,
        contentId: item._id,
        userId: "admin",
        userName: "Admin",
        type: "text",
        message: "Yes, much better. Just fix the color grading in the last scene.",
        timestamp: new Date(now - 1800000).toISOString(),
        isOwn: true,
      },
    ];
  });
  return result;
}

// ── Config ────────────────────────────────────────────────────────────────────
const statusConfig: Record<
  string,
  { label: string; textColor: string; bgColor: string; icon: React.ReactNode }
> = {
  pending: {
    label: "Pending",
    textColor: "text-orange-500",
    bgColor: "bg-orange-50 text-orange-600",
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  approved: {
    label: "Approved",
    textColor: "text-green-600",
    bgColor: "bg-green-50 text-green-600",
    icon: <CheckCircle className="w-3.5 h-3.5" />,
  },
  rejected: {
    label: "Rejected",
    textColor: "text-red-500",
    bgColor: "bg-red-50 text-red-600",
    icon: <XCircle className="w-3.5 h-3.5" />,
  },
  revision: {
    label: "Revision",
    textColor: "text-blue-500",
    bgColor: "bg-blue-50 text-blue-600",
    icon: <MessageSquare className="w-3.5 h-3.5" />,
  },
};

const typeIcons: Record<string, React.ReactNode> = {
  video: <Video className="w-4 h-4 text-blue-500" />,
  design: <Image className="w-4 h-4 text-purple-500" />,
  content: <FileText className="w-4 h-4 text-gray-500" />,
};

const TABS = ["All", "Pending", "Approved", "Rejected", "Revision"] as const;

// ── Waveform visual bars ──────────────────────────────────────────────────────
const WAVEFORM = [3, 6, 9, 12, 8, 14, 10, 6, 11, 15, 9, 5, 8, 13, 7, 10, 6, 12, 9, 4];

function WaveformBars({ playing }: { playing: boolean }) {
  return (
    <div className="flex items-center gap-[2px] h-6">
      {WAVEFORM.map((h, i) => (
        <div
          key={i}
          className={cn(
            "w-[3px] rounded-full transition-all",
            playing ? "bg-indigo-400" : "bg-gray-300"
          )}
          style={{
            height: `${h}px`,
            animation: playing
              ? `waveform-bounce ${0.4 + (i % 4) * 0.1}s ease-in-out infinite alternate`
              : "none",
          }}
        />
      ))}
      <style>{`
        @keyframes waveform-bounce {
          from { transform: scaleY(0.5); }
          to   { transform: scaleY(1.4); }
        }
      `}</style>
    </div>
  );
}

// ── Voice Player Component ────────────────────────────────────────────────────
function VoicePlayer({ audioUrl, duration }: { audioUrl: string; duration: number }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTimeUpdate = () => setElapsed(Math.floor(audio.currentTime));
    const onEnded = () => {
      setPlaying(false);
      setElapsed(0);
    };
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play();
      setPlaying(true);
    }
  };

  const fmt = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="flex items-center gap-2 py-1">
      {audioUrl && <audio ref={audioRef} src={audioUrl} preload="metadata" />}
      <button
        onClick={toggle}
        disabled={!audioUrl}
        className="w-8 h-8 rounded-full bg-indigo-100 hover:bg-indigo-200 flex items-center justify-center shrink-0 transition-colors disabled:opacity-50"
      >
        {playing ? (
          <Pause className="w-3.5 h-3.5 text-indigo-600" />
        ) : (
          <Play className="w-3.5 h-3.5 text-indigo-600 ml-0.5" />
        )}
      </button>
      <WaveformBars playing={playing} />
      <span className="text-[10px] text-gray-400 shrink-0 font-mono ml-1">
        {playing ? fmt(elapsed) : fmt(duration)}
      </span>
    </div>
  );
}

// ── Chat Bubble ───────────────────────────────────────────────────────────────
function ChatBubble({ msg }: { msg: ChatMessage }) {
  const isOwn = msg.isOwn;
  return (
    <div className={cn("flex flex-col gap-1", isOwn ? "items-end" : "items-start")}>
      <div className={cn("flex items-center gap-1.5", isOwn && "flex-row-reverse")}>
        <div
          className={cn(
            "w-5 h-5 rounded-full text-[9px] font-bold text-white flex items-center justify-center shrink-0",
            isOwn ? "bg-indigo-500" : "bg-emerald-500"
          )}
        >
          {msg.userName.charAt(0).toUpperCase()}
        </div>
        <span className="text-[10px] font-semibold text-gray-500">{msg.userName}</span>
        <span className="text-[9px] text-gray-400">
          {new Date(msg.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
      <div
        className={cn(
          "max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed",
          isOwn
            ? "bg-indigo-600 text-white rounded-tr-sm"
            : "bg-gray-100 text-gray-800 rounded-tl-sm"
        )}
      >
        {msg.type === "voice" ? (
          <VoicePlayer audioUrl={msg.audioUrl ?? ""} duration={msg.audioDuration ?? 0} />
        ) : (
          msg.message
        )}
      </div>
    </div>
  );
}

// ── Review Action Modal ───────────────────────────────────────────────────────
interface ReviewModalProps {
  item: ReviewItem;
  action: "approve" | "reject";
  onConfirm: (feedback: string) => void;
  onClose: () => void;
}

function ReviewModal({ item, action, onConfirm, onClose }: ReviewModalProps) {
  const [feedback, setFeedback] = useState("");
  const isReject = action === "reject";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={cn(
            "flex items-center justify-between px-6 py-4 border-b",
            isReject ? "bg-red-50 border-red-100" : "bg-green-50 border-green-100"
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center",
                isReject ? "bg-red-100" : "bg-green-100"
              )}
            >
              {isReject ? (
                <XCircle className="w-4.5 h-4.5 text-red-600" />
              ) : (
                <CheckCircle className="w-4.5 h-4.5 text-green-600" />
              )}
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">
                {isReject ? "Reject & Request Changes" : "Final Approval"}
              </h2>
              <p className="text-xs text-gray-500 truncate max-w-[380px]">{item.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-5 divide-x divide-gray-100">
          {/* Left: Preview */}
          <div className="col-span-3 p-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">
              Content Preview
            </p>
            <div className="bg-gray-900 rounded-xl overflow-hidden aspect-video flex items-center justify-center">
              {item.videoUrl ? (
                <video
                  key={item._id}
                  src={item.videoUrl}
                  controls
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center gap-3 text-gray-500">
                  {typeIcons[item.type]}
                  <p className="text-xs">No preview available</p>
                </div>
              )}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                  statusConfig[item.status].bgColor
                }`}
              >
                {statusConfig[item.status].icon}
                {statusConfig[item.status].label}
              </span>
              <span className="text-xs text-gray-400">
                by <span className="font-medium text-gray-600">{item.submittedBy}</span>
              </span>
            </div>
          </div>

          {/* Right: Feedback */}
          <div className="col-span-2 p-5 flex flex-col gap-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 flex items-center gap-1.5 mb-2">
                <AlignLeft className="w-3 h-3" />
                {isReject ? "Correction Notes" : "Approval Comments"}
              </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder={
                  isReject
                    ? "Describe what needs to be corrected…"
                    : "Optional — add a note for the team…"
                }
                rows={6}
                autoFocus
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 placeholder:text-gray-400 outline-none focus:border-indigo-300 focus:bg-white transition-all resize-none"
              />
            </div>

            <div className="mt-auto space-y-2">
              {isReject ? (
                <>
                  <button
                    onClick={() => onConfirm(feedback)}
                    className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-red-200"
                  >
                    <XCircle className="w-4 h-4" />
                    Confirm Rejection
                  </button>
                  <button
                    onClick={onClose}
                    className="w-full py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => onConfirm(feedback)}
                    className="w-full py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-green-200"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Final Approval
                  </button>
                  <button
                    onClick={onClose}
                    className="w-full py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
const Review = () => {
  const { teamId } = useParams<{ teamId?: string }>();
  const [activeTab, setActiveTab] = useState("All");
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const [usingMock, setUsingMock] = useState(false);

  // Full detail view (click title/icon)
  const [selectedItem, setSelectedItem] = useState<ReviewItem | null>(null);

  // Chat drawer (click chat icon) — separate from detail view
  const [chatTask, setChatTask] = useState<ReviewItem | null>(null);

  // Per-task chat — pre-seeded with dummy data
  const [chatByTask, setChatByTask] = useState<Record<string, ChatMessage[]>>(
    buildDummyChat
  );

  // Unread per task — seed mock-1 and mock-2 as having unreads
  const [unreadByTask, setUnreadByTask] = useState<Record<string, number>>({
    "mock-1": 2,
    "mock-2": 1,
  });

  const [newMessage, setNewMessage] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Voice recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Review modal
  const [reviewModal, setReviewModal] = useState<{
    item: ReviewItem;
    action: "approve" | "reject";
  } | null>(null);

  useEffect(() => {
    fetchItems();
  }, []);

  // Scroll to latest message in chat drawer
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatByTask, chatTask, selectedItem]);

  // Clear unread when opening chat drawer
  useEffect(() => {
    if (chatTask) {
      setUnreadByTask((prev) => ({ ...prev, [chatTask._id]: 0 }));
    }
  }, [chatTask]);

  // Clear unread when entering detail view
  useEffect(() => {
    if (selectedItem) {
      setUnreadByTask((prev) => ({ ...prev, [selectedItem._id]: 0 }));
    }
  }, [selectedItem]);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchItems = async () => {
    setLoading(true);
    setDbError(null);
    setUsingMock(false);
    try {
      const res = await fetch(`${API_BASE}/submissions`, { credentials: "include" });
      if (!res.ok) throw new Error(`Server responded with ${res.status}`);
      const data: ReviewItem[] = await res.json();
      setItems(data.length ? data : MOCK_ITEMS);
      if (!data.length) setUsingMock(true);
    } catch (err: any) {
      const msg =
        err instanceof TypeError
          ? "Cannot reach the backend (port 8080). Make sure it's running."
          : err.message;
      setDbError(msg);
      setUsingMock(true);
      setItems(MOCK_ITEMS);
    } finally {
      setLoading(false);
    }
  };

  // ── Status update ──────────────────────────────────────────────────────────
  const handleStatusUpdate = async (
    id: string,
    newStatus: string,
    feedbackText?: string
  ) => {
    const update = (prev: ReviewItem[]) =>
      prev.map((item) =>
        item._id === id ? { ...item, status: newStatus as ReviewItem["status"] } : item
      );
    setItems(update);
    if (selectedItem?._id === id) {
      setSelectedItem((prev) =>
        prev ? { ...prev, status: newStatus as ReviewItem["status"] } : null
      );
    }

    if (feedbackText?.trim()) {
      const msg: ChatMessage = {
        _id: `msg-${Date.now()}`,
        contentId: id,
        userId: "admin",
        userName: "Admin",
        type: "text",
        message: `[${newStatus === "approved" ? "✅ Approved" : "❌ Rejected"}] ${feedbackText}`,
        timestamp: new Date().toISOString(),
        isOwn: true,
      };
      addChatMessage(id, msg);
    }

    if (usingMock) {
      toast.success(`Status updated to ${newStatus} (demo mode)`);
      setReviewModal(null);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/submissions/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
        credentials: "include",
      });
      if (res.ok) {
        toast.success(`Status updated to ${newStatus}`);
      } else if (res.status === 401) {
        toast.error("Please log in to approve or reject content.");
        fetchItems();
      } else {
        throw new Error("Update failed");
      }
    } catch {
      toast.error("Status update failed.");
      fetchItems();
    } finally {
      setReviewModal(null);
    }
  };

  // ── Chat helpers ───────────────────────────────────────────────────────────
  const addChatMessage = (contentId: string, msg: ChatMessage) => {
    setChatByTask((prev) => ({
      ...prev,
      [contentId]: [...(prev[contentId] ?? []), msg],
    }));
  };

  // Active chat target: drawer task or detail view task
  const activeChatItem = chatTask ?? selectedItem;
  const currentMessages = activeChatItem
    ? (chatByTask[activeChatItem._id] ?? [])
    : [];

  const handleSendMessage = () => {
    if (!newMessage.trim() || !activeChatItem) return;
    const msg: ChatMessage = {
      _id: `msg-${Date.now()}`,
      contentId: activeChatItem._id,
      userId: "admin",
      userName: "Admin",
      type: "text",
      message: newMessage.trim(),
      timestamp: new Date().toISOString(),
      isOwn: true,
    };
    addChatMessage(activeChatItem._id, msg);
    setNewMessage("");

    // Simulate editor reply after 2s
    const replyTarget = activeChatItem;
    setTimeout(() => {
      const reply: ChatMessage = {
        _id: `msg-reply-${Date.now()}`,
        contentId: replyTarget._id,
        userId: "editor",
        userName: replyTarget.submittedBy,
        type: "text",
        message: "Got it! I'll make those changes and resubmit shortly.",
        timestamp: new Date().toISOString(),
        isOwn: false,
      };
      addChatMessage(replyTarget._id, reply);
    }, 2000);
  };

  // ── Voice recording ────────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        const target = chatTask ?? selectedItem;
        if (target) {
          const duration = recordingSeconds;
          const msg: ChatMessage = {
            _id: `msg-voice-${Date.now()}`,
            contentId: target._id,
            userId: "admin",
            userName: "Admin",
            type: "voice",
            audioUrl: url,
            audioDuration: duration,
            timestamp: new Date().toISOString(),
            isOwn: true,
          };
          addChatMessage(target._id, msg);
        }
        setRecordingSeconds(0);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch {
      toast.error("Microphone access denied. Please allow microphone permissions.");
    }
  }, [chatTask, selectedItem, recordingSeconds]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setIsRecording(false);
  }, []);

  const fmtSec = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  // ── Derived ────────────────────────────────────────────────────────────────
  const filteredItems =
    activeTab === "All"
      ? items
      : items.filter((r) => r.status === activeTab.toLowerCase());

  const counts = {
    pending: items.filter((r) => r.status === "pending").length,
    approved: items.filter((r) => r.status === "approved").length,
    rejected: items.filter((r) => r.status === "rejected").length,
    revision: items.filter((r) => r.status === "revision").length,
  };

  // ── Shared chat input UI (used in both drawer and detail view) ────────────
  const ChatInput = () => (
    <>
      {isRecording && (
        <div className="mx-4 mb-2 flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
          <span className="text-xs font-semibold text-red-600">
            Recording… {fmtSec(recordingSeconds)}
          </span>
          <button
            onClick={stopRecording}
            className="ml-auto text-[10px] font-bold text-red-600 hover:text-red-800 uppercase tracking-wide"
          >
            Stop
          </button>
        </div>
      )}
      <div className="p-3 border-t border-gray-100 bg-white">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Send feedback…"
              rows={2}
              disabled={isRecording}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 pt-2.5 pb-2 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-indigo-300 focus:bg-white transition-all resize-none disabled:opacity-50"
            />
          </div>
          <button
            onClick={isRecording ? stopRecording : startRecording}
            title={isRecording ? "Stop recording" : "Record voice note"}
            className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center transition-all shrink-0",
              isRecording
                ? "bg-red-500 hover:bg-red-600 text-white animate-pulse"
                : "bg-gray-100 hover:bg-indigo-100 text-gray-500 hover:text-indigo-600"
            )}
          >
            {isRecording ? (
              <MicOff className="w-4 h-4" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || isRecording}
            className="w-9 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="text-[10px] text-gray-400 text-center mt-1.5">
          Enter to send · 🎙 Mic to record voice note
        </p>
      </div>
    </>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // DETAIL VIEW (full screen — clicking title/type icon)
  // ══════════════════════════════════════════════════════════════════════════
  if (selectedItem) {
    const sc = statusConfig[selectedItem.status];
    const detailMessages = chatByTask[selectedItem._id] ?? [];
    return (
      <div className="flex bg-gray-50 h-[calc(100vh-56px)] overflow-hidden">

        {/* ── Left: Video + Actions ── */}
        <div className="flex-1 flex flex-col p-5 gap-4 min-w-0">
          <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedItem(null)}
              className="rounded-lg h-8 w-8 shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold text-gray-900 truncate">
                {selectedItem.title}
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                by{" "}
                <span className="font-medium text-gray-600">
                  {selectedItem.submittedBy}
                </span>
                {" · "}
                {new Date(selectedItem.submittedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full shrink-0 ${sc.bgColor}`}
            >
              {sc.icon}
              {sc.label}
            </span>
          </div>

          <div className="flex-1 bg-black rounded-2xl overflow-hidden border border-gray-800 shadow-2xl">
            {selectedItem.videoUrl ? (
              <video
                key={selectedItem._id}
                src={selectedItem.videoUrl}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-gray-500">
                {typeIcons[selectedItem.type]}
                <p className="text-sm">
                  No preview available for {selectedItem.type} content
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 bg-white border border-gray-200 rounded-xl px-5 py-3 shadow-sm">
            <Button
              variant="outline"
              onClick={() =>
                setReviewModal({ item: selectedItem, action: "reject" })
              }
              className="border-red-300 text-red-500 hover:bg-red-50 font-semibold text-sm px-5"
            >
              <XCircle className="w-4 h-4 mr-1.5" /> Reject
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                handleStatusUpdate(selectedItem._id, "revision")
              }
              className="border-blue-300 text-blue-500 hover:bg-blue-50 font-semibold text-sm px-5"
            >
              <MessageSquare className="w-4 h-4 mr-1.5" /> Request Changes
            </Button>
            <Button
              onClick={() =>
                setReviewModal({ item: selectedItem, action: "approve" })
              }
              className="bg-green-600 hover:bg-green-700 text-white font-semibold text-sm px-6"
            >
              <CheckCircle className="w-4 h-4 mr-1.5" /> Approve
            </Button>
          </div>
        </div>

        {/* ── Right: Embedded Chat Sidebar ── */}
        <div className="w-[380px] border-l border-gray-200 bg-white flex flex-col shrink-0">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2.5 bg-gray-50/60">
            <div className="relative">
              <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-indigo-600" />
              </div>
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-white" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-gray-800">Task Feedback</h2>
              <p className="text-[10px] text-gray-400">
                {selectedItem.submittedBy} · {detailMessages.length} messages
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/30">
            {detailMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center gap-3 text-gray-400 py-16">
                <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
                  <MessageSquare className="w-7 h-7 text-gray-300" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">No messages yet</p>
                  <p className="text-xs mt-1 text-gray-400">Start the conversation below</p>
                </div>
              </div>
            ) : (
              detailMessages.map((msg) => <ChatBubble key={msg._id} msg={msg} />)
            )}
            <div ref={chatEndRef} />
          </div>

          <ChatInput />
        </div>

        {reviewModal && (
          <ReviewModal
            item={reviewModal.item}
            action={reviewModal.action}
            onConfirm={(fb) =>
              handleStatusUpdate(
                reviewModal.item._id,
                reviewModal.action === "approve" ? "approved" : "rejected",
                fb
              )
            }
            onClose={() => setReviewModal(null)}
          />
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // LIST VIEW
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-300">

      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900">Review</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Review and approve submitted content
          </p>
        </div>
      </div>

      {/* DB Error Banner */}
      {dbError && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50">
          <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0 text-amber-500" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800">
              Database connection issue
            </p>
            <p className="text-xs mt-0.5 text-amber-700">{dbError}</p>
            <p className="text-xs mt-1 text-amber-600 font-medium">
              💡 Showing sample data. Add your IP to the MongoDB Atlas network access
              list.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchItems}
            className="shrink-0 border-amber-300 text-amber-700 hover:bg-amber-100 text-xs"
          >
            <RefreshCw className="w-3 h-3 mr-1" /> Retry
          </Button>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Pending",
            count: counts.pending,
            color: "text-orange-500",
            accent: "border-l-orange-400",
          },
          {
            label: "Approved",
            count: counts.approved,
            color: "text-green-600",
            accent: "border-l-green-500",
          },
          {
            label: "Rejected",
            count: counts.rejected,
            color: "text-red-500",
            accent: "border-l-red-500",
          },
          {
            label: "Revision",
            count: counts.revision,
            color: "text-blue-500",
            accent: "border-l-blue-500",
          },
        ].map((s) => (
          <Card
            key={s.label}
            className={`p-4 border border-gray-100 border-l-4 ${s.accent} shadow-sm hover:shadow-md transition-shadow cursor-pointer`}
            onClick={() => setActiveTab(s.label)}
          >
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">
              {s.label}
            </p>
            <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.count}</p>
          </Card>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
              activeTab === tab
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed border-gray-200 rounded-xl text-gray-400">
          <FileText className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No items in this category</p>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-xl bg-white overflow-hidden shadow-sm">
          {/* Table header */}
          <div className="grid grid-cols-12 px-5 py-3 bg-gray-50 border-b text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
            <div className="col-span-1" />
            <div className="col-span-4">Title</div>
            <div className="col-span-2">Author / Date</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-1 text-center">Chat</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          {/* Table rows */}
          <div className="divide-y divide-gray-100">
            {filteredItems.map((item) => {
              const sc = statusConfig[item.status];
              const unread = unreadByTask[item._id] ?? 0;
              const msgCount = (chatByTask[item._id] ?? []).length;
              return (
                <div
                  key={item._id}
                  className="grid grid-cols-12 px-5 py-3.5 items-center hover:bg-gray-50/70 transition-colors"
                >
                  {/* Type icon — opens detail view */}
                  <div className="col-span-1">
                    <div
                      className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors"
                      onClick={() => setSelectedItem(item)}
                    >
                      {typeIcons[item.type] ?? (
                        <FileText className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </div>

                  {/* Title — opens detail view */}
                  <div
                    className="col-span-4 pr-4 cursor-pointer"
                    onClick={() => setSelectedItem(item)}
                  >
                    <p className="text-sm font-semibold text-gray-900 truncate hover:text-blue-600 transition-colors">
                      {item.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-gray-400 capitalize">{item.type}</p>
                      {item.videoUrl && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100">
                          <Video className="w-2.5 h-2.5" /> Video Ready
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Author / Date */}
                  <div className="col-span-2">
                    <p className="text-sm text-gray-700 font-medium">
                      {item.submittedBy}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(item.submittedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>

                  {/* Status */}
                  <div className="col-span-2">
                    <span
                      className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${sc.bgColor}`}
                    >
                      {sc.icon}
                      {sc.label}
                    </span>
                  </div>

                  {/* Chat button — opens sliding drawer */}
                  <div className="col-span-1 flex justify-center">
                    <button
                      onClick={() => setChatTask(item)}
                      className="relative w-8 h-8 rounded-lg bg-gray-100 hover:bg-indigo-100 flex items-center justify-center transition-colors text-gray-500 hover:text-indigo-600"
                      title="Open task chat"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      {unread > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                          {unread}
                        </span>
                      )}
                      {msgCount > 0 && unread === 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gray-400 text-white text-[9px] font-bold flex items-center justify-center">
                          {msgCount}
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Actions */}
                  <div className="col-span-2 flex items-center justify-end gap-2">
                    {item.status !== "approved" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setReviewModal({ item, action: "approve" });
                        }}
                        className="h-7 text-xs border-green-300 text-green-600 hover:bg-green-50 hover:border-green-400 px-3 font-semibold"
                      >
                        Approve
                      </Button>
                    )}
                    {item.status !== "rejected" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setReviewModal({ item, action: "reject" });
                        }}
                        className="h-7 text-xs border-red-300 text-red-500 hover:bg-red-50 hover:border-red-400 px-3 font-semibold"
                      >
                        Reject
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Review Modal ──────────────────────────────────────────────────── */}
      {reviewModal && (
        <ReviewModal
          item={reviewModal.item}
          action={reviewModal.action}
          onConfirm={(fb) =>
            handleStatusUpdate(
              reviewModal.item._id,
              reviewModal.action === "approve" ? "approved" : "rejected",
              fb
            )
          }
          onClose={() => setReviewModal(null)}
        />
      )}

      {/* ── Chat Drawer (sliding from right) ─────────────────────────────── */}
      {/* Overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] transition-opacity duration-300",
          chatTask ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setChatTask(null)}
      />

      {/* Drawer panel */}
      <div
        className={cn(
          "fixed right-0 top-[56px] bottom-0 z-50 w-[420px] bg-white shadow-2xl flex flex-col border-l border-gray-200 transition-transform duration-300 ease-out",
          chatTask ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Drawer header */}
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/80 flex items-center gap-3">
          <div className="relative shrink-0">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
              <MessageSquare className="w-4.5 h-4.5 text-indigo-600" />
            </div>
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-sm text-gray-900 truncate">
              Task Discussion
            </h2>
            <p className="text-[11px] text-gray-500 truncate">
              {chatTask?.title ?? ""}
            </p>
          </div>
          <button
            onClick={() => setChatTask(null)}
            className="w-7 h-7 rounded-lg hover:bg-gray-200 flex items-center justify-center text-gray-400 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Assigned to + date meta */}
        {chatTask && (
          <div className="px-5 py-2.5 border-b border-gray-100 bg-gray-50/40 flex items-center gap-3">
            <div
              className={cn(
                "inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full",
                statusConfig[chatTask.status].bgColor
              )}
            >
              {statusConfig[chatTask.status].icon}
              {statusConfig[chatTask.status].label}
            </div>
            <span className="text-xs text-gray-400">
              by{" "}
              <span className="font-medium text-gray-600">{chatTask.submittedBy}</span>
            </span>
            <span className="ml-auto text-[11px] text-gray-400 font-mono">
              {currentMessages.length} msgs
            </span>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/20">
          {currentMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-3 text-gray-400 py-16">
              <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
                <MessageSquare className="w-7 h-7 text-gray-300" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">No messages yet</p>
                <p className="text-xs mt-1 text-gray-400">
                  Start the conversation below
                </p>
              </div>
            </div>
          ) : (
            currentMessages.map((msg) => <ChatBubble key={msg._id} msg={msg} />)
          )}
          <div ref={chatEndRef} />
        </div>

        <ChatInput />
      </div>
    </div>
  );
};

export default Review;
