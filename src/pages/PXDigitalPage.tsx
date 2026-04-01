import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/auth-context";
import { ConnectionIndicator } from "@/components/ConnectionIndicator";
import { toast } from "@/hooks/use-toast";
import { Send, Mic, MicOff, ArrowLeft, Search, Users, Volume2, Info } from "lucide-react";
import AudioPlayer from "@/components/px/AudioPlayer";

interface PxChannel {
  id: string;
  name: string;
  type: "public" | "private";
  category: string;
  region: string | null;
  creator_id: string | null;
  expires_at: string | null;
}

interface PxMessage {
  id: string;
  channel_id: string;
  user_id: string;
  display_name: string;
  text: string | null;
  audio_url: string | null;
  created_at: string;
}

interface MuralPost {
  id: string;
  user_id: string;
  display_name: string;
  image_url: string;
  caption: string;
  likes: number;
  created_at: string;
}

type Tab = "conversa" | "audios" | "sobre";

const PXDigitalPage = () => {
  const { user } = useAuth();
  const [channels, setChannels] = useState<PxChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<PxChannel | null>(null);
  const [messages, setMessages] = useState<PxMessage[]>([]);
  const [textInput, setTextInput] = useState("");
  const [recording, setRecording] = useState(false);
  const [displayName, setDisplayName] = useState("Motorista");
  const [muralPosts, setMuralPosts] = useState<MuralPost[]>([]);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<Tab>("conversa");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const activeChannelId = selectedChannel?.id;

  // Fetch profile
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.display_name) setDisplayName(data.display_name);
      });
  }, [user]);

  // Fetch channels
  useEffect(() => {
    const fetchChannels = async () => {
      const { data } = await supabase
        .from("px_channels")
        .select("*")
        .order("created_at", { ascending: true });
      if (data) {
        setChannels(data as unknown as PxChannel[]);
        const inviteId = sessionStorage.getItem("px_invite_channel");
        if (inviteId) {
          sessionStorage.removeItem("px_invite_channel");
          const ch = data.find((c: { id: string }) => c.id === inviteId);
          if (ch) {
            setSelectedChannel(ch as unknown as PxChannel);
          }
        }
      }
    };
    fetchChannels();
  }, []);

  // Fetch messages for active channel
  useEffect(() => {
    if (!activeChannelId) {
      setMessages([]);
      return;
    }
    const fetchMessages = async () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("px_messages")
        .select("*")
        .eq("channel_id", activeChannelId)
        .gte("created_at", twoHoursAgo)
        .order("created_at", { ascending: true })
        .limit(100);
      if (data) setMessages(data as PxMessage[]);
    };
    fetchMessages();

    const channel = supabase
      .channel(`px-${activeChannelId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "px_messages",
          filter: `channel_id=eq.${activeChannelId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as PxMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeChannelId]);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch mural posts (today only) + realtime
  useEffect(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayISO = todayStart.toISOString();

    supabase
      .from("mural_posts")
      .select("*")
      .gte("created_at", todayISO)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (data) setMuralPosts(data as MuralPost[]);
      });
    if (user) {
      supabase
        .from("mural_likes")
        .select("post_id")
        .eq("user_id", user.id)
        .then(({ data }) => {
          if (data) setLikedPosts(new Set(data.map((l: { post_id: string }) => l.post_id)));
        });
    }

    const muralChannel = supabase
      .channel("mural-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "mural_posts" },
        (payload) => {
          setMuralPosts((prev) => [payload.new as MuralPost, ...prev]);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "mural_posts" },
        (payload) => {
          setMuralPosts((prev) =>
            prev.map((p) =>
              p.id === (payload.new as MuralPost).id ? (payload.new as MuralPost) : p
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(muralChannel);
    };
  }, [user]);

  // Send text message
  const sendTextMessage = async () => {
    if (!textInput.trim() || !selectedChannel || !user) return;
    const msg = textInput.trim();
    setTextInput("");
    await supabase.from("px_messages").insert({
      channel_id: selectedChannel.id,
      user_id: user.id,
      display_name: displayName,
      text: msg,
    });
  };

  // Audio recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        await uploadAudio(blob);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
    } catch {
      toast({
        title: "Erro",
        description: "Não foi possível acessar o microfone.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const uploadAudio = async (blob: Blob) => {
    if (!user || !selectedChannel) return;
    const fileName = `audio/${user.id}/${Date.now()}.webm`;
    const { error: uploadErr } = await supabase.storage
      .from("px-media")
      .upload(fileName, blob);
    if (uploadErr) {
      toast({ title: "Erro no upload", variant: "destructive" });
      return;
    }
    const { data: urlData } = supabase.storage.from("px-media").getPublicUrl(fileName);
    await supabase.from("px_messages").insert({
      channel_id: selectedChannel.id,
      user_id: user.id,
      display_name: displayName,
      audio_url: urlData.publicUrl,
    });
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  const getCategoryLabel = (category: string) => {
    if (category === "global") return "Global";
    if (category === "private") return "Privado";
    return category;
  };

  const getCategoryColor = (category: string) => {
    if (category === "global") return "bg-primary/15 text-primary";
    return "bg-muted text-muted-foreground";
  };

  const audioMessages = messages.filter((m) => m.audio_url);

  // muralPosts / likedPosts are kept intentionally: the mural realtime subscription
  // (mural-realtime channel) must stay active per product requirements even though
  // FeedDoTrecho is no longer rendered in this view.
  void muralPosts;
  void likedPosts;

  // ── Home view ──────────────────────────────────────────────────────────────
  if (!selectedChannel) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <header className="px-4 pt-6 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">PX Digital</h1>
              <p className="text-xs text-muted-foreground">Comunidades do Trecho</p>
            </div>
            <ConnectionIndicator />
          </div>
        </header>

        <div className="px-4 space-y-5">
          {/* Search bar — static visual */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar comunidade..."
              readOnly
              className="input-field w-full pl-9 py-3 text-sm cursor-default"
            />
          </div>

          {/* Communities list */}
          <section>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
              Comunidades
            </h2>
            {channels.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhuma comunidade disponível</p>
              </div>
            ) : (
              <div className="space-y-2">
                {channels.map((ch) => (
                  <button
                    key={ch.id}
                    onClick={() => {
                      setSelectedChannel(ch);
                      setActiveTab("conversa");
                    }}
                    className="w-full bg-card rounded-xl p-4 flex items-center gap-3 text-left hover:bg-card/80 transition-colors border border-border/50"
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-semibold text-sm truncate">{ch.name}</span>
                        <span
                          className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 ${getCategoryColor(ch.category)}`}
                        >
                          {getCategoryLabel(ch.category)}
                        </span>
                      </div>
                      {ch.region && (
                        <p className="text-xs text-muted-foreground truncate">{ch.region}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    );
  }

  // ── Community view ─────────────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Community header + tabs */}
      <header className="flex-shrink-0 px-4 pt-6 pb-3 border-b border-border/50">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedChannel(null)}
            className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-base truncate">{selectedChannel.name}</h1>
            <span
              className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${getCategoryColor(selectedChannel.category)}`}
            >
              {getCategoryLabel(selectedChannel.category)}
            </span>
          </div>
          <ConnectionIndicator />
        </div>

        {/* Tab bar */}
        <div className="flex mt-3 rounded-lg bg-secondary p-1 gap-1">
          {(["conversa", "audios", "sobre"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 text-xs font-semibold py-2 rounded-md transition-colors ${
                activeTab === tab
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "audios" ? "Áudios" : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </header>

      {/* ── Conversa tab ── */}
      {activeTab === "conversa" && (
        <>
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 no-scrollbar">
            {messages.length === 0 && (
              <p className="text-center py-8 text-muted-foreground text-sm">
                Nenhuma mensagem ainda. Seja o primeiro a falar!
              </p>
            )}
            {messages.map((msg) => {
              const isMe = msg.user_id === user?.id;
              return (
                <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                  {!isMe && (
                    <span className="text-[10px] text-muted-foreground ml-1 mb-0.5">
                      {msg.display_name}
                    </span>
                  )}
                  <div
                    className={`max-w-[75%] rounded-2xl px-3 py-2 ${
                      isMe
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-card text-foreground rounded-bl-sm border border-border/50"
                    }`}
                  >
                    {msg.audio_url ? (
                      <AudioPlayer src={msg.audio_url} isMe={isMe} />
                    ) : (
                      <p className="text-sm">{msg.text}</p>
                    )}
                    <p
                      className={`text-[9px] mt-0.5 ${
                        isMe ? "text-primary-foreground/60" : "text-muted-foreground"
                      }`}
                    >
                      {formatTime(msg.created_at)}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Message input */}
          <div className="flex-shrink-0 px-4 py-3 border-t border-border/50 flex items-center gap-2">
            <input
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendTextMessage()}
              placeholder="Mensagem..."
              className="flex-1 input-field py-3 text-sm"
            />
            {textInput.trim() ? (
              <button
                onClick={sendTextMessage}
                className="w-10 h-10 rounded-xl gradient-profit flex items-center justify-center flex-shrink-0"
              >
                <Send className="w-4 h-4 text-primary-foreground" />
              </button>
            ) : (
              <button
                onPointerDown={startRecording}
                onPointerUp={stopRecording}
                onPointerLeave={stopRecording}
                className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                  recording ? "bg-red-500/20 text-red-500" : "bg-secondary text-foreground"
                }`}
              >
                {recording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            )}
          </div>
        </>
      )}

      {/* ── Áudios tab ── */}
      {activeTab === "audios" && (
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 no-scrollbar">
          {audioMessages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Volume2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhum áudio neste canal</p>
            </div>
          ) : (
            audioMessages.map((msg) => {
              const isMe = msg.user_id === user?.id;
              return (
                <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                  {!isMe && (
                    <span className="text-[10px] text-muted-foreground ml-1 mb-0.5">
                      {msg.display_name}
                    </span>
                  )}
                  <div
                    className={`rounded-2xl px-3 py-2 ${
                      isMe
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-card text-foreground rounded-bl-sm border border-border/50"
                    }`}
                  >
                    <AudioPlayer src={msg.audio_url!} isMe={isMe} />
                    <p
                      className={`text-[9px] mt-0.5 ${
                        isMe ? "text-primary-foreground/60" : "text-muted-foreground"
                      }`}
                    >
                      {formatTime(msg.created_at)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Sobre tab ── */}
      {activeTab === "sobre" && (
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 no-scrollbar">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <Users className="w-8 h-8 text-primary" />
          </div>
          <div className="text-center">
            <h2 className="text-lg font-bold mb-1">{selectedChannel.name}</h2>
            <span
              className={`text-xs font-medium px-2 py-1 rounded-full ${getCategoryColor(selectedChannel.category)}`}
            >
              {getCategoryLabel(selectedChannel.category)}
            </span>
          </div>
          {selectedChannel.region && (
            <div className="bg-card rounded-xl p-4 border border-border/50">
              <p className="text-xs text-muted-foreground mb-1">Região</p>
              <p className="font-medium">{selectedChannel.region}</p>
            </div>
          )}
          <div className="bg-card rounded-xl p-4 border border-border/50 flex items-center gap-3">
            <Info className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              Mensagens ficam disponíveis por 2 horas.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PXDigitalPage;
