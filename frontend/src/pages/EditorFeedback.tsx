import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Video,
  Image,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  MessageSquare,
  RefreshCw,
  AlertTriangle,
  Upload,
  Send,
  Mic,
  MicOff,
  Play,
  Pause,
  X,
  CloudUpload,
  Film,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

// ── Types ────────────────────────────────────────────────────────────────────
type ContentStatus = "pending" | "approved" | "rejected" | "revision";

interface ReviewItem {
  _id: string;
  title: string;
  type: "video" | "design" | "content";
  submittedBy: string;
  submittedAt: string;
  status: ContentStatus;
  videoUrl?: string;
}

interface Feedback {
  _id: string;
  contentId: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: string;
}

interface ChatMessage {
  _id: string;
  contentId: string;
  userId: string;
  userName: string;
  role: "admin" | "editor";
  type: "text" | "voice";
  message?: string;
  audioUrl?: string;
  audioDuration?: number;
  timestamp: string;
}

// ── Mock review items ─────────────────────────────────────────────────────────
const MOCK_ITEMS: ReviewItem[] = [
  {
    _id: "m1",
    title: "Instagram Reels Tips – Episode 3",
    type: "video",
    submittedBy: "You",
    submittedAt: new Date(Date.now() - 86400000).toISOString(),
    status: "rejected",
  },
  {
    _id: "m2",
    title: "How to Grow on YouTube in 2026",
    type: "video",
    submittedBy: "You",
    submittedAt: new Date(Date.now() - 172800000).toISOString(),
    status: "revision",
  },
  {
    _id: "m3",
    title: "Behind the Scenes – March Shoot",
    type: "video",
    submittedBy: "You",
    submittedAt: new Date(Date.now() - 259200000).toISOString(),
    status: "pending",
  },
  {
    _id: "m4",
    title: "Product Launch Teaser Video",
    type: "video",
    submittedBy: "You",
    submittedAt: new Date(Date.now() - 345600000).toISOString(),
    status: "approved",
  },
  {
    _id: "m5",
    title: "Instagram Carousel – Home Tips",
    type: "design",
    submittedBy: "You",
    submittedAt: new Date(Date.now() - 432000000).toISOString(),
    status: "rejected",
  },
];

// ── Mock admin text feedbacks ─────────────────────────────────────────────────
const MOCK_FEEDBACKS: Record<string, Feedback[]> = {
  m1: [
    {
      _id: "fb1",
      contentId: "m1",
      userId: "admin",
      userName: "Admin",
      message:
        "Add subtitles throughout and shorten the intro by at least 10 seconds. The opening hook needs to be stronger.",
      timestamp: new Date(Date.now() - 43200000).toISOString(),
    },
  ],
  m2: [
    {
      _id: "fb2",
      contentId: "m2",
      userId: "admin",
      userName: "Admin",
      message:
        "Color grading looks inconsistent in the second half. Match the warm tones from the intro. Also fix the jump cut at 3:12.",
      timestamp: new Date(Date.now() - 86400000).toISOString(),
    },
  ],
  m5: [
    {
      _id: "fb3",
      contentId: "m5",
      userId: "admin",
      userName: "Admin",
      message:
        "The font size on slide 3 is too small to read on mobile. Also, the CTA on the last slide needs to be more prominent.",
      timestamp: new Date(Date.now() - 172800000).toISOString(),
    },
  ],
};

// ── Dummy chat threads ────────────────────────────────────────────────────────
function buildDummyChats(): Record<string, ChatMessage[]> {
  const now = Date.now();
  return {
    m1: [
      {
        _id: "c1-m1",
        contentId: "m1",
        userId: "admin",
        userName: "Admin",
        role: "admin",
        type: "text",
        message: "Please re-edit the transitions — they feel abrupt at 0:42 and 1:18.",
        timestamp: new Date(now - 7200000).toISOString(),
      },
      {
        _id: "c2-m1",
        contentId: "m1",
        userId: "editor",
        userName: "You",
        role: "editor",
        type: "voice",
        audioUrl: "",
        audioDuration: 14,
        timestamp: new Date(now - 5400000).toISOString(),
      },
      {
        _id: "c3-m1",
        contentId: "m1",
        userId: "admin",
        userName: "Admin",
        role: "admin",
        type: "text",
        message: "Also shorten the intro — aim for under 8 seconds. The hook needs to land faster.",
        timestamp: new Date(now - 3600000).toISOString(),
      },
    ],
    m2: [
      {
        _id: "c1-m2",
        contentId: "m2",
        userId: "admin",
        userName: "Admin",
        role: "admin",
        type: "text",
        message: "Color grading fix needed for the second half — match the warm look from the opening scene.",
        timestamp: new Date(now - 86400000).toISOString(),
      },
      {
        _id: "c2-m2",
        contentId: "m2",
        userId: "editor",
        userName: "You",
        role: "editor",
        type: "voice",
        audioUrl: "",
        audioDuration: 22,
        timestamp: new Date(now - 82800000).toISOString(),
      },
      {
        _id: "c3-m2",
        contentId: "m2",
        userId: "admin",
        userName: "Admin",
        role: "admin",
        type: "text",
        message: "Understood. Also fix the jump cut at 3:12 while you're at it.",
        timestamp: new Date(now - 79200000).toISOString(),
      },
    ],
    m5: [
      {
        _id: "c1-m5",
        contentId: "m5",
        userId: "admin",
        userName: "Admin",
        role: "admin",
        type: "text",
        message: "Slide 3 font is unreadable on mobile — increase to at least 16px. The last slide CTA also needs to be bolder.",
        timestamp: new Date(now - 172800000).toISOString(),
      },
    ],
    m3: [],
    m4: [
      {
        _id: "c1-m4",
        contentId: "m4",
        userId: "admin",
        userName: "Admin",
        role: "admin",
        type: "text",
        message: "Great work on this one! Approved and ready to publish. 🎉",
        timestamp: new Date(now - 259200000).toISOString(),
      },
    ],
  };
}

// ── Status config ─────────────────────────────────────────────────────────────
const statusConfig: Record<
  ContentStatus,
  {
    label: string;
    badgeClass: string;
    dotClass: string;
    icon: React.ReactNode;
    description: string;
  }
> = {
  pending: {
    label: "Pending Review",
    badgeClass: "bg-amber-50 text-amber-700 border border-amber-200",
    dotClass: "bg-amber-400",
    icon: <Clock className="w-3.5 h-3.5" />,
    description: "Submitted and waiting for admin review",
  },
  rejected: {
    label: "Rejected",
    badgeClass: "bg-red-50 text-red-700 border border-red-200",
    dotClass: "bg-red-500",
    icon: <XCircle className="w-3.5 h-3.5" />,
    description: "Rejected — changes required",
  },
  revision: {
    label: "Revision Required",
    badgeClass: "bg-blue-50 text-blue-700 border border-blue-200",
    dotClass: "bg-blue-500",
    icon: <MessageSquare className="w-3.5 h-3.5" />,
    description: "Admin requested modifications",
  },
  approved: {
    label: "Approved",
    badgeClass: "bg-green-50 text-green-700 border border-green-200",
    dotClass: "bg-green-500",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    description: "Approved and ready to publish",
  },
};

const typeIcons: Record<string, React.ReactNode> = {
  video: <Video className="w-4 h-4 text-blue-500" />,
  design: <Image className="w-4 h-4 text-purple-500" />,
  content: <FileText className="w-4 h-4 text-gray-500" />,
};

const TABS = [
  "All",
  "Pending Review",
  "Rejected",
  "Revision Required",
  "Approved",
] as const;
type Tab = (typeof TABS)[number];

const tabToStatus: Record<Tab, ContentStatus | null> = {
  All: null,
  "Pending Review": "pending",
  Rejected: "rejected",
  "Revision Required": "revision",
  Approved: "approved",
};

function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ── Waveform bars ─────────────────────────────────────────────────────────────
const WAVEFORM = [3, 7, 10, 13, 8, 15, 11, 6, 12, 16, 9, 5, 8, 14, 7, 11, 6, 13, 9, 4];

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
              ? `ef-wave ${0.4 + (i % 4) * 0.1}s ease-in-out infinite alternate`
              : "none",
          }}
        />
      ))}
      <style>{`
        @keyframes ef-wave {
          from { transform: scaleY(0.4); }
          to   { transform: scaleY(1.5); }
        }
      `}</style>
    </div>
  );
}

// ── Voice player ──────────────────────────────────────────────────────────────
function VoicePlayer({
  audioUrl,
  duration,
  isAdmin,
}: {
  audioUrl: string;
  duration: number;
  isAdmin: boolean;
}) {
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
    playing ? (audio.pause(), setPlaying(false)) : (audio.play(), setPlaying(true));
  };

  const fmtTime = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="flex items-center gap-2 py-0.5">
      {audioUrl && <audio ref={audioRef} src={audioUrl} preload="metadata" />}
      <button
        onClick={toggle}
        disabled={!audioUrl}
        className={cn(
          "w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors disabled:opacity-50",
          isAdmin
            ? "bg-white/20 hover:bg-white/30"
            : "bg-indigo-100 hover:bg-indigo-200"
        )}
      >
        {playing ? (
          <Pause className={cn("w-3 h-3", isAdmin ? "text-white" : "text-indigo-600")} />
        ) : (
          <Play
            className={cn(
              "w-3 h-3 ml-0.5",
              isAdmin ? "text-white" : "text-indigo-600"
            )}
          />
        )}
      </button>
      <WaveformBars playing={playing} />
      <span
        className={cn(
          "text-[10px] font-mono shrink-0 ml-1",
          isAdmin ? "text-white/70" : "text-gray-400"
        )}
      >
        {playing ? fmtTime(elapsed) : fmtTime(duration)}
      </span>
    </div>
  );
}

// ── Chat bubble ───────────────────────────────────────────────────────────────
function ChatBubble({ msg }: { msg: ChatMessage }) {
  const isAdmin = msg.role === "admin";
  return (
    <div className={cn("flex flex-col gap-1", isAdmin ? "items-start" : "items-end")}>
      <div className={cn("flex items-center gap-1.5", !isAdmin && "flex-row-reverse")}>
        <div
          className={cn(
            "w-5 h-5 rounded-full text-[9px] font-bold text-white flex items-center justify-center shrink-0",
            isAdmin ? "bg-rose-500" : "bg-indigo-500"
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
          "max-w-[88%] px-3 py-2 rounded-2xl text-sm leading-relaxed",
          isAdmin
            ? "bg-rose-500 text-white rounded-tl-sm"
            : "bg-indigo-600 text-white rounded-tr-sm"
        )}
      >
        {msg.type === "voice" ? (
          <VoicePlayer
            audioUrl={msg.audioUrl ?? ""}
            duration={msg.audioDuration ?? 0}
            isAdmin={isAdmin}
          />
        ) : (
          <span>{msg.message}</span>
        )}
      </div>
    </div>
  );
}

// ── Upload Video Modal ────────────────────────────────────────────────────────
function UploadVideoModal({
  item,
  onClose,
  onUploaded,
}: {
  item: ReviewItem;
  onClose: () => void;
  onUploaded: (itemId: string, videoUrl: string) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const handleUpload = () => {
    if (!file) return;
    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    formData.append("video", file);

    const xhr = new XMLHttpRequest();

    // ── No timeout — large video uploads take time ───────────────────────────
    xhr.timeout = 0;

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        setProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const data = JSON.parse(xhr.responseText);
        toast.success("Video uploaded successfully!");
        onUploaded(item._id, data.videoUrl);
        onClose();
      } else {
        let msg = "Upload failed.";
        try {
          const parsed = JSON.parse(xhr.responseText);
          msg = parsed.message ?? msg;
          console.error("Upload Error Details:", parsed);
        } catch {
          console.error("Upload Error Details:", xhr.responseText);
        }
        toast.error(msg);
        setUploading(false);
      }
    });

    xhr.addEventListener("error", () => {
      console.error("Upload Error Details: Network error — check backend logs");
      toast.error("Network error — upload failed. Check console for details.");
      setUploading(false);
    });

    xhr.addEventListener("timeout", () => {
      console.error("Upload Error Details: XHR timed out");
      toast.error("Upload timed out.");
      setUploading(false);
    });

    xhr.open("POST", `${API_BASE}/content/${item._id}/upload-video`);
    xhr.withCredentials = true;
    xhr.send(formData);
  };

  const fileSizeMB = file ? (file.size / (1024 * 1024)).toFixed(1) : null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#0f0f14] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-orange-400 flex items-center justify-center">
              <Film className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-white/40">Upload Revision</p>
              <p className="text-sm font-semibold text-white truncate max-w-[260px]">{item.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={uploading}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-white hover:bg-white/[0.08] transition-colors disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Drop zone */}
          <button
            type="button"
            onClick={() => !uploading && fileInputRef.current?.click()}
            disabled={uploading}
            className={cn(
              "w-full border-2 border-dashed rounded-xl py-10 flex flex-col items-center gap-3 transition-all",
              file
                ? "border-violet-500/60 bg-violet-500/5"
                : "border-white/[0.12] hover:border-violet-400/50 hover:bg-white/[0.03]",
              uploading && "opacity-50 cursor-not-allowed"
            )}
          >
            <div className="w-12 h-12 rounded-xl bg-white/[0.06] flex items-center justify-center">
              {file ? (
                <Video className="w-5 h-5 text-violet-400" />
              ) : (
                <CloudUpload className="w-5 h-5 text-white/30" />
              )}
            </div>
            {file ? (
              <div className="text-center">
                <p className="text-sm font-semibold text-white truncate max-w-[280px] px-2">{file.name}</p>
                <p className="text-xs text-white/40 mt-0.5">{fileSizeMB} MB</p>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-sm font-semibold text-white/60">Click to select video</p>
                <p className="text-xs text-white/30 mt-0.5">MP4, MOV, WEBM, AVI · Max 500 MB</p>
              </div>
            )}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".mp4,.mov,.webm,.avi,video/*"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Progress bar */}
          {uploading && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-white/50">
                <span>Uploading to Cloudinary…</span>
                <span className="font-mono font-semibold text-violet-400">{progress}%</span>
              </div>
              <div className="w-full h-1.5 bg-white/[0.07] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-orange-400 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Action button */}
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className={cn(
              "w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all",
              file && !uploading
                ? "bg-gradient-to-r from-violet-600 to-orange-500 text-white hover:opacity-90 shadow-lg shadow-violet-900/30"
                : "bg-white/[0.06] text-white/30 cursor-not-allowed"
            )}
          >
            {uploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Upload Revision
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Quick Upload Modal ────────────────────────────────────────────────────────
function QuickUploadModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("title", title.trim());
    formData.append("file", file);
    try {
      const res = await fetch(`${API_BASE}/content/quick-upload`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      let data: Record<string, string> = {};
      try {
        data = await res.json();
      } catch {
        throw new Error(`Server error (${res.status} ${res.statusText})`);
      }
      if (!res.ok) throw new Error(data.error || "Upload failed");
      toast.success(`"${title}" uploaded and sent for review!`);
      onSuccess();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-sm">
              <Film className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">New Submission</h2>
              <p className="text-[11px] text-gray-400">Upload video for admin review</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Video Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Instagram Reels – Episode 6"
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"
              disabled={uploading}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Video File <span className="text-red-500">*</span>
            </label>
            <div
              onClick={() => !uploading && fileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer ${
                file ? "border-purple-400 bg-purple-50/50" : "border-gray-200 hover:border-purple-300 bg-gray-50"
              } ${uploading ? "opacity-60 cursor-not-allowed pointer-events-none" : ""}`}
            >
              <input
                ref={fileRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                disabled={uploading}
              />
              {file ? (
                <div className="space-y-1">
                  <Film className="w-5 h-5 text-purple-500 mx-auto" />
                  <p className="text-sm font-semibold text-purple-700 truncate max-w-xs mx-auto">{file.name}</p>
                  <p className="text-xs text-gray-400">{(file.size / 1024 / 1024).toFixed(1)} MB · click to change</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <CloudUpload className="w-6 h-6 text-gray-300 mx-auto" />
                  <p className="text-sm font-medium text-gray-500">Click to select a video</p>
                  <p className="text-xs text-gray-400">MP4, MOV, AVI · max 500 MB</p>
                </div>
              )}
            </div>
          </div>

          {uploading && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-purple-50 border border-purple-100">
              <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin shrink-0" />
              <div>
                <p className="text-sm font-semibold text-purple-800">Uploading to Cloudinary…</p>
                <p className="text-xs text-purple-500 mt-0.5">Large files may take a moment</p>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || !file || uploading}
              className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold shadow-sm hover:from-purple-700 hover:to-violet-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {uploading ? (
                <><div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />Uploading…</>
              ) : (
                <><Upload className="w-3.5 h-3.5" />Upload & Submit</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
const EditorFeedback = () => {
  const [activeTab, setActiveTab] = useState<Tab>("All");
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [feedbacks, setFeedbacks] = useState<Record<string, Feedback[]>>({});
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const [uploadTask, setUploadTask] = useState<ReviewItem | null>(null);
  const [showQuickUpload, setShowQuickUpload] = useState(false);

  // Chat drawer
  const [chatTask, setChatTask] = useState<ReviewItem | null>(null);
  const [chatByTask, setChatByTask] = useState<Record<string, ChatMessage[]>>(
    buildDummyChats
  );
  const [unreadByTask, setUnreadByTask] = useState<Record<string, number>>({
    m1: 2,
    m2: 1,
  });
  const [newMessage, setNewMessage] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Voice recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetchItems();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatByTask, chatTask]);

  useEffect(() => {
    if (chatTask) {
      setUnreadByTask((prev) => ({ ...prev, [chatTask._id]: 0 }));
    }
  }, [chatTask]);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchItems = async () => {
    setLoading(true);
    setDbError(null);
    try {
      const res = await fetch(`${API_BASE}/submissions`, { credentials: "include" });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      const data: ReviewItem[] = await res.json();
      setItems(data.length ? data : MOCK_ITEMS);
      if (!data.length) {
        setFeedbacks(MOCK_FEEDBACKS);
      } else {
        fetchAllFeedbacks(data);
      }
    } catch (err: any) {
      setDbError(
        err instanceof TypeError
          ? "Cannot reach the backend (port 8080)."
          : err.message
      );
      setItems(MOCK_ITEMS);
      setFeedbacks(MOCK_FEEDBACKS);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllFeedbacks = async (list: ReviewItem[]) => {
    const actionable = list.filter(
      (i) => i.status === "rejected" || i.status === "revision"
    );
    const results: Record<string, Feedback[]> = {};
    await Promise.all(
      actionable.map(async (item) => {
        try {
          const res = await fetch(`${API_BASE}/feedbacks/${item._id}`, {
            credentials: "include",
          });
          if (res.ok) results[item._id] = await res.json();
        } catch {}
      })
    );
    setFeedbacks(results);
  };

  // ── Chat helpers ───────────────────────────────────────────────────────────
  const addChatMessage = (contentId: string, msg: ChatMessage) => {
    setChatByTask((prev) => ({
      ...prev,
      [contentId]: [...(prev[contentId] ?? []), msg],
    }));
  };

  const currentMessages = chatTask ? (chatByTask[chatTask._id] ?? []) : [];

  const handleSendMessage = () => {
    if (!newMessage.trim() || !chatTask) return;
    const msg: ChatMessage = {
      _id: `msg-${Date.now()}`,
      contentId: chatTask._id,
      userId: "editor",
      userName: "You",
      role: "editor",
      type: "text",
      message: newMessage.trim(),
      timestamp: new Date().toISOString(),
    };
    addChatMessage(chatTask._id, msg);
    setNewMessage("");

    // Simulate admin reply after 1.8s
    const replyTarget = chatTask;
    setTimeout(() => {
      const reply: ChatMessage = {
        _id: `reply-${Date.now()}`,
        contentId: replyTarget._id,
        userId: "admin",
        userName: "Admin",
        role: "admin",
        type: "text",
        message: "Thanks for the update. I'll check it once you re-submit.",
        timestamp: new Date().toISOString(),
      };
      addChatMessage(replyTarget._id, reply);
    }, 1800);
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
        if (chatTask) {
          const msg: ChatMessage = {
            _id: `voice-${Date.now()}`,
            contentId: chatTask._id,
            userId: "editor",
            userName: "You",
            role: "editor",
            type: "voice",
            audioUrl: url,
            audioDuration: recordingSeconds,
            timestamp: new Date().toISOString(),
          };
          addChatMessage(chatTask._id, msg);
        }
        setRecordingSeconds(0);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(
        () => setRecordingSeconds((s) => s + 1),
        1000
      );
    } catch {
      toast.error("Microphone access denied.");
    }
  }, [chatTask, recordingSeconds]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setIsRecording(false);
  }, []);

  const fmtSec = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  // ── Derived ────────────────────────────────────────────────────────────────
  const filtered =
    tabToStatus[activeTab] === null
      ? items
      : items.filter((i) => i.status === tabToStatus[activeTab]);

  const counts: Record<ContentStatus, number> = {
    pending: items.filter((i) => i.status === "pending").length,
    rejected: items.filter((i) => i.status === "rejected").length,
    revision: items.filter((i) => i.status === "revision").length,
    approved: items.filter((i) => i.status === "approved").length,
  };

  const needsAction = counts.rejected + counts.revision;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6 max-w-5xl">

      {/* Quick Upload Modal */}
      {showQuickUpload && (
        <QuickUploadModal
          onClose={() => setShowQuickUpload(false)}
          onSuccess={() => { setShowQuickUpload(false); fetchItems(); }}
        />
      )}

      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Review Feedback
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Track the status of your submitted content and act on admin feedback.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {needsAction > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
              <span className="text-sm font-medium text-red-700">
                {needsAction} item{needsAction > 1 ? "s" : ""} need attention
              </span>
            </div>
          )}
          <button
            onClick={() => setShowQuickUpload(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold shadow-sm hover:from-purple-700 hover:to-violet-700 transition-all"
          >
            <Upload className="w-4 h-4" />
            + New Submission
          </button>
        </div>
      </div>

      {/* DB error banner */}
      {dbError && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50">
          <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0 text-amber-500" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">
              Could not connect to backend
            </p>
            <p className="text-xs mt-0.5 text-amber-700">{dbError}</p>
            <p className="text-xs mt-1 text-amber-600 font-medium">
              Showing sample data for preview.
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

      {/* Status overview cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(
          [
            {
              key: "pending",
              label: "Pending Review",
              color: "text-amber-600",
              bg: "bg-amber-50",
              border: "border-amber-100",
            },
            {
              key: "rejected",
              label: "Rejected",
              color: "text-red-600",
              bg: "bg-red-50",
              border: "border-red-100",
            },
            {
              key: "revision",
              label: "Revision Required",
              color: "text-blue-600",
              bg: "bg-blue-50",
              border: "border-blue-100",
            },
            {
              key: "approved",
              label: "Approved",
              color: "text-green-600",
              bg: "bg-green-50",
              border: "border-green-100",
            },
          ] as const
        ).map((s) => (
          <Card
            key={s.key}
            className={`rounded-xl border ${s.border} ${s.bg} shadow-none cursor-pointer hover:shadow-sm transition-shadow`}
            onClick={() =>
              setActiveTab(
                s.key === "pending"
                  ? "Pending Review"
                  : s.key === "revision"
                  ? "Revision Required"
                  : (s.label as Tab)
              )
            }
          >
            <CardContent className="p-4">
              <p className="text-xs font-medium text-gray-500">{s.label}</p>
              <p className={`text-3xl font-bold mt-1 ${s.color}`}>{counts[s.key]}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit flex-wrap">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
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
            <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed border-gray-200 rounded-xl">
          <FileText className="w-8 h-8 mx-auto mb-3 text-gray-300" />
          <p className="text-sm font-medium text-gray-400">No items in this category</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const sc = statusConfig[item.status];
            const itemFeedbacks = feedbacks[item._id] ?? [];
            const needsRevision =
              item.status === "rejected" || item.status === "revision";
            const unread = unreadByTask[item._id] ?? 0;
            const msgCount = (chatByTask[item._id] ?? []).length;

            return (
              <div
                key={item._id}
                className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden"
              >
                {/* Main row */}
                <div className="flex items-center gap-4 px-5 py-4">
                  {/* Type icon */}
                  <div className="w-9 h-9 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                    {typeIcons[item.type] ?? (
                      <FileText className="w-4 h-4 text-gray-400" />
                    )}
                  </div>

                  {/* Title + meta */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {item.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-400">
                        by{" "}
                        <span className="font-medium text-gray-600">
                          {item.submittedBy}
                        </span>
                      </span>
                      <span className="text-gray-300">·</span>
                      <span className="text-xs text-gray-400">
                        {fmt(item.submittedAt)}
                      </span>
                    </div>
                  </div>

                  {/* Status badge (desktop) */}
                  <span
                    className={`hidden sm:inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0 ${sc.badgeClass}`}
                  >
                    {sc.icon}
                    {sc.label}
                  </span>

                  {/* Actions row */}
                  <div className="flex items-center gap-2 shrink-0">
                    {needsRevision && (
                      <Button
                        size="sm"
                        className="h-8 px-3 text-xs bg-blue-600 hover:bg-blue-700 gap-1.5"
                        onClick={() => setUploadTask(item)}
                      >
                        <Upload className="w-3.5 h-3.5" />
                        Upload Revision
                      </Button>
                    )}

                    {/* Chat icon button */}
                    <button
                      onClick={() => setChatTask(item)}
                      title="Open feedback chat"
                      className="relative w-8 h-8 rounded-lg bg-gray-100 hover:bg-indigo-100 flex items-center justify-center transition-colors text-gray-500 hover:text-indigo-600"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      {/* Red unread badge */}
                      {unread > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                          {unread}
                        </span>
                      )}
                      {/* Grey count badge when read */}
                      {msgCount > 0 && unread === 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gray-400 text-white text-[9px] font-bold flex items-center justify-center">
                          {msgCount}
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                {/* Status badge (mobile) */}
                <div className="sm:hidden px-5 pb-3">
                  <span
                    className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${sc.badgeClass}`}
                  >
                    {sc.icon}
                    {sc.label}
                  </span>
                </div>

                {/* Admin feedback panel */}
                {itemFeedbacks.length > 0 && (
                  <div className="border-t border-gray-100 bg-gray-50/60 px-5 py-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          item.status === "rejected"
                            ? "bg-red-500"
                            : "bg-blue-500"
                        }`}
                      />
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Admin Feedback
                      </p>
                    </div>
                    {itemFeedbacks.map((fb) => (
                      <div key={fb._id} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-gray-700">
                            {fb.userName}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {new Date(fb.timestamp).toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <div
                          className={`text-sm text-gray-700 leading-relaxed px-4 py-3 rounded-lg border-l-[3px] bg-white ${
                            item.status === "rejected"
                              ? "border-l-red-400"
                              : "border-l-blue-400"
                          }`}
                        >
                          {fb.message}
                        </div>
                      </div>
                    ))}
                    {needsRevision && (
                      <div className="flex items-center justify-between pt-1">
                        <p className="text-xs text-gray-500">
                          Address the feedback above and upload a new version.
                        </p>
                        <Button
                          size="sm"
                          className="h-8 px-4 text-xs bg-blue-600 hover:bg-blue-700 gap-1.5 shrink-0"
                          onClick={() => setUploadTask(item)}
                        >
                          <Upload className="w-3.5 h-3.5" />
                          Upload New Version
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Approved banner */}
                {item.status === "approved" && (
                  <div className="border-t border-green-100 bg-green-50/40 px-5 py-2.5 flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                    <p className="text-xs text-green-700 font-medium">
                      This content has been approved and is ready to publish.
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Chat Drawer ──────────────────────────────────────────────────────── */}

      {/* Overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] transition-opacity duration-300",
          chatTask
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
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
            <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-rose-600" />
            </div>
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-sm text-gray-900">Feedback Chat</h2>
            <p className="text-[11px] text-gray-500 truncate">{chatTask?.title ?? ""}</p>
          </div>
          <button
            onClick={() => setChatTask(null)}
            className="w-7 h-7 rounded-lg hover:bg-gray-200 flex items-center justify-center text-gray-400 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status meta strip */}
        {chatTask && (
          <div className="px-5 py-2.5 border-b border-gray-100 bg-gray-50/40 flex items-center gap-3">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full",
                statusConfig[chatTask.status].badgeClass
              )}
            >
              {statusConfig[chatTask.status].icon}
              {statusConfig[chatTask.status].label}
            </span>
            <span className="ml-auto text-[11px] text-gray-400 font-mono">
              {currentMessages.length} messages
            </span>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/20">
          {currentMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-3 py-16">
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

        {/* Recording indicator */}
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

        {/* Input area */}
        <div className="p-3 border-t border-gray-100 bg-white">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Reply to admin…"
                rows={2}
                disabled={isRecording}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 pt-2.5 pb-2 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-indigo-300 focus:bg-white transition-all resize-none disabled:opacity-50"
              />
            </div>

            {/* Mic */}
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

            {/* Send */}
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
      </div>

      {/* ── Upload Video Modal ──────────────────────────────────────────────── */}
      {uploadTask && (
        <UploadVideoModal
          item={uploadTask}
          onClose={() => setUploadTask(null)}
          onUploaded={(itemId, videoUrl) => {
            setItems((prev) =>
              prev.map((i) => (i._id === itemId ? { ...i, videoUrl } : i))
            );
            setUploadTask(null);
          }}
        />
      )}
    </div>
  );
};

export default EditorFeedback;
