import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { Send, X, MessageSquare, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL.replace("/api", "");
const API_BASE   = import.meta.env.VITE_API_BASE_URL;

// ── Types ─────────────────────────────────────────────────────────────────────
interface Message {
  _id:        string;
  taskId:     string;
  senderId:   string;
  senderName: string;
  senderRole: "admin" | "editor" | "member";
  message:    string;
  timestamp:  string;
}

interface TypingUser {
  userId:   string;
  userName: string;
  role:     string;
}

interface Props {
  taskId:    string;
  taskTitle: string;
  onClose:   () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(ts: string) {
  const d = new Date(ts);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Today";
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function groupByDate(messages: Message[]) {
  const groups: { date: string; msgs: Message[] }[] = [];
  for (const msg of messages) {
    const label = formatDate(msg.timestamp);
    const last  = groups[groups.length - 1];
    if (last?.date === label) {
      last.msgs.push(msg);
    } else {
      groups.push({ date: label, msgs: [msg] });
    }
  }
  return groups;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function TaskChat({ taskId, taskTitle, onClose }: Props) {
  const { user } = useAuth();
  const [messages,    setMessages]    = useState<Message[]>([]);
  const [input,       setInput]       = useState("");
  const [loading,     setLoading]     = useState(true);
  const [sending,     setSending]     = useState(false);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);

  const socketRef        = useRef<Socket | null>(null);
  const bottomRef        = useRef<HTMLDivElement>(null);
  const typingTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef      = useRef(false);

  const currentUserId = (user as { _id?: string; id?: string } | null)?._id
    ?? (user as { _id?: string; id?: string } | null)?.id
    ?? "";

  // Keep a stable ref so the socket effect doesn't reconnect when user obj re-renders
  const currentUserIdRef = useRef(currentUserId);
  useEffect(() => { currentUserIdRef.current = currentUserId; }, [currentUserId]);

  // ── Scroll to bottom ────────────────────────────────────────────────────────
  const scrollToBottom = useCallback(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }, []);

  // ── Fetch history ───────────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/messages/${taskId}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data: Message[]) => {
        setMessages(Array.isArray(data) ? data : []);
        setLoading(false);
        scrollToBottom();
      })
      .catch(() => setLoading(false));
  }, [taskId, scrollToBottom]);

  // ── Socket.io ───────────────────────────────────────────────────────────────
  useEffect(() => {
    // Guard: never connect with an undefined/empty taskId
    if (!taskId) {
      console.warn("[TaskChat] taskId is undefined — skipping socket connection");
      return;
    }

    console.log("[TaskChat] Attempting to connect to:", SOCKET_URL);
    console.log("[TaskChat] Attempting to join room:", taskId);

    // Create socket — withCredentials sends the httpOnly JWT cookie
    const socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    // ── connect: fires when auth succeeds and WS handshake completes ─────────
    const onConnect = () => {
      console.log("[TaskChat] ✅ Socket connected, id:", socket.id);
      console.log("[TaskChat] Attempting to join room:", taskId);
      socket.emit("join_task", taskId);
      console.log("[TaskChat] Joined room:", taskId);
    };

    // ── receive_message: functional update avoids stale closure ──────────────
    const onReceiveMessage = (msg: Message) => {
      console.log("FRONTEND_RECEIVED:", msg);
      setMessages((prev) => {
        if (prev.some((m) => String(m._id) === String(msg._id))) return prev;
        return [...prev, msg];
      });
      scrollToBottom();
    };

    // ── typing indicators ─────────────────────────────────────────────────────
    const onUserTyping = (data: TypingUser) => {
      if (data.userId === currentUserIdRef.current) return;
      setTypingUsers((prev) => {
        if (prev.some((u) => u.userId === data.userId)) return prev;
        return [...prev, data];
      });
    };

    const onUserStopTyping = ({ userId }: { userId: string }) => {
      setTypingUsers((prev) => prev.filter((u) => u.userId !== userId));
    };

    // ── error / disconnect logging ────────────────────────────────────────────
    const onConnectError = (err: Error) => {
      console.error("[TaskChat] ❌ Socket connect_error:", err.message);
      console.error("[TaskChat] Full error:", err);
    };

    const onDisconnect = (reason: string) => {
      console.warn("[TaskChat] Socket disconnected, reason:", reason);
    };

    // Register all listeners
    socket.on("connect",           onConnect);
    socket.on("receive_message",   onReceiveMessage);
    socket.on("user_typing",       onUserTyping);
    socket.on("user_stop_typing",  onUserStopTyping);
    socket.on("connect_error",     onConnectError);
    socket.on("disconnect",        onDisconnect);

    // ── cleanup: off all listeners, then disconnect ───────────────────────────
    return () => {
      socket.off("connect",          onConnect);
      socket.off("receive_message",  onReceiveMessage);
      socket.off("user_typing",      onUserTyping);
      socket.off("user_stop_typing", onUserStopTyping);
      socket.off("connect_error",    onConnectError);
      socket.off("disconnect",       onDisconnect);
      socket.emit("leave_task", taskId);
      socket.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  // ── Typing emit ─────────────────────────────────────────────────────────────
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socketRef.current?.emit("typing", taskId);
    }
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      isTypingRef.current = false;
      socketRef.current?.emit("stop_typing", taskId);
    }, 1500);
  };

  // ── Send message ─────────────────────────────────────────────────────────────
  const handleSend = () => {
    const text = input.trim();
    if (!text || sending) return;

    setSending(true);
    socketRef.current?.emit("send_message", { taskId, message: text });
    setInput("");
    setSending(false);

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    isTypingRef.current = false;
    socketRef.current?.emit("stop_typing", taskId);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Derived ──────────────────────────────────────────────────────────────────
  const groups = groupByDate(messages);
  const typingLabel = typingUsers.length === 1
    ? `${typingUsers[0].userName} is typing…`
    : typingUsers.length > 1
      ? "Several people are typing…"
      : null;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full w-full bg-[#0f0f14] rounded-xl overflow-hidden border border-white/[0.06] shadow-2xl">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07] bg-[#13131a]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-orange-400 flex items-center justify-center shrink-0">
            <MessageSquare className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
              Task Discussion
            </p>
            <p className="text-sm font-semibold text-white truncate leading-tight">
              {taskTitle}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-white hover:bg-white/[0.08] transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 scrollbar-thin scrollbar-thumb-white/10">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-5 h-5 text-white/30 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.04] flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white/20" />
            </div>
            <p className="text-sm font-medium text-white/30">No messages yet</p>
            <p className="text-xs text-white/20">Start the task discussion below</p>
          </div>
        ) : (
          groups.map(({ date, msgs }) => (
            <div key={date} className="space-y-2">
              {/* Date separator */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-white/[0.06]" />
                <span className="text-[10px] font-semibold text-white/25 uppercase tracking-wider">
                  {date}
                </span>
                <div className="flex-1 h-px bg-white/[0.06]" />
              </div>

              {msgs.map((msg) => {
                const isOwn = msg.senderId === currentUserId;
                const isAdmin = msg.senderRole === "admin";

                return (
                  <div
                    key={msg._id}
                    className={cn(
                      "flex flex-col gap-1",
                      isOwn ? "items-end" : "items-start"
                    )}
                  >
                    {/* Sender label */}
                    <div className={cn("flex items-center gap-1.5", isOwn && "flex-row-reverse")}>
                      {/* Avatar */}
                      <div
                        className={cn(
                          "w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0",
                          isAdmin
                            ? "bg-gradient-to-br from-violet-500 to-orange-400 text-white"
                            : "bg-white/[0.12] text-white/60"
                        )}
                      >
                        {msg.senderName.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-[10px] font-medium text-white/35">
                        {isOwn ? "You" : msg.senderName}
                      </span>
                      <span className="text-[10px] text-white/20">
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>

                    {/* Bubble */}
                    <div
                      className={cn(
                        "max-w-[82%] px-3.5 py-2 rounded-2xl text-sm leading-relaxed break-words",
                        isOwn
                          ? isAdmin
                            ? "bg-gradient-to-br from-violet-600 to-orange-500 text-white rounded-tr-sm shadow-lg shadow-violet-900/30"
                            : "bg-gradient-to-br from-violet-600 to-orange-500 text-white rounded-tr-sm shadow-lg shadow-violet-900/30"
                          : "bg-white/[0.07] backdrop-blur text-white/85 rounded-tl-sm border border-white/[0.06]"
                      )}
                    >
                      {msg.message}
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}

        {/* Typing indicator */}
        {typingLabel && (
          <div className="flex items-start gap-2 pl-1">
            <div className="flex gap-1 items-center px-3.5 py-2.5 bg-white/[0.06] rounded-2xl rounded-tl-sm border border-white/[0.05]">
              <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce [animation-delay:300ms]" />
            </div>
            <span className="text-[10px] text-white/25 self-end pb-1">{typingLabel}</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input ── */}
      <div className="px-3 py-3 border-t border-white/[0.06] bg-[#13131a]">
        <div className="flex items-center gap-2 bg-white/[0.05] rounded-xl px-3 py-2 border border-white/[0.08] focus-within:border-violet-500/50 transition-colors">
          <input
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message…"
            className="flex-1 bg-transparent text-sm text-white placeholder:text-white/25 outline-none"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className={cn(
              "w-7 h-7 rounded-lg flex items-center justify-center transition-all shrink-0",
              input.trim()
                ? "bg-gradient-to-br from-violet-500 to-orange-400 text-white shadow-md shadow-violet-900/40 hover:opacity-90 active:scale-95"
                : "bg-white/[0.06] text-white/20 cursor-not-allowed"
            )}
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="text-[10px] text-white/15 text-center mt-1.5">
          Press Enter to send
        </p>
      </div>
    </div>
  );
}
