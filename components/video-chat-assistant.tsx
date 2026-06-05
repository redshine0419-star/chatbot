"use client";

import { MicOff, Mic, Phone, PhoneOff, Video, VideoOff } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionAPI;
    webkitSpeechRecognition: new () => SpeechRecognitionAPI;
  }
}

interface SpeechRecognitionAPI extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult:
    | ((event: {
        results: { length: number; [i: number]: { isFinal: boolean; [j: number]: { transcript: string } } };
      }) => void)
    | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

type Message = { role: "user" | "assistant"; content: string };

function AvatarFace({ isSpeaking }: { isSpeaking: boolean }) {
  const [blinkState, setBlinkState] = useState(false);
  const [mouthOpen, setMouthOpen] = useState(0);

  useEffect(() => {
    const blink = () => {
      setBlinkState(true);
      setTimeout(() => setBlinkState(false), 150);
    };
    const id = setInterval(blink, 3000 + Math.random() * 2000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!isSpeaking) {
      setMouthOpen(0);
      return;
    }
    const id = setInterval(() => {
      setMouthOpen(Math.random() * 14 + 2);
    }, 100);
    return () => clearInterval(id);
  }, [isSpeaking]);

  const eyeRy = blinkState ? 1 : 10;

  return (
    <svg
      viewBox="0 0 200 220"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full drop-shadow-2xl"
    >
      <defs>
        <radialGradient id="skinGrad" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#FFE0C8" />
          <stop offset="100%" stopColor="#D4936A" />
        </radialGradient>
        <radialGradient id="bgGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#1e3a5f" />
          <stop offset="100%" stopColor="#0a1628" />
        </radialGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <circle cx="100" cy="110" r="100" fill="url(#bgGrad)" />
      <rect x="82" y="172" width="36" height="28" rx="8" fill="#D4936A" />
      <ellipse cx="100" cy="115" rx="62" ry="72" fill="url(#skinGrad)" />
      <ellipse cx="100" cy="60" rx="64" ry="38" fill="#1a0e08" />
      <ellipse cx="100" cy="75" rx="62" ry="28" fill="url(#skinGrad)" />
      <ellipse cx="40" cy="100" rx="10" ry="22" fill="#1a0e08" />
      <ellipse cx="160" cy="100" rx="10" ry="22" fill="#1a0e08" />
      <ellipse cx="38" cy="115" rx="11" ry="15" fill="#D4936A" />
      <ellipse cx="162" cy="115" rx="11" ry="15" fill="#D4936A" />
      <ellipse cx="38" cy="115" rx="6" ry="9" fill="#C0825A" opacity="0.5" />
      <ellipse cx="162" cy="115" rx="6" ry="9" fill="#C0825A" opacity="0.5" />
      <path d="M 66 88 Q 78 81 90 85" stroke="#2C1810" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d="M 110 85 Q 122 81 134 88" stroke="#2C1810" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <ellipse cx="78" cy="100" rx="12" ry={eyeRy} fill="white" />
      <ellipse cx="122" cy="100" rx="12" ry={eyeRy} fill="white" />
      {!blinkState && (
        <>
          <circle cx="78" cy="101" r="7" fill="#2E5988" />
          <circle cx="122" cy="101" r="7" fill="#2E5988" />
          <circle cx="78" cy="101" r="4" fill="#111" />
          <circle cx="122" cy="101" r="4" fill="#111" />
          <circle cx="81" cy="98" r="2" fill="white" opacity="0.8" />
          <circle cx="125" cy="98" r="2" fill="white" opacity="0.8" />
        </>
      )}
      <path
        d="M 100 112 C 96 118 92 122 96 125 Q 100 127 104 125 C 108 122 104 118 100 112 Z"
        fill="#C0825A"
        opacity="0.45"
      />
      <circle cx="95" cy="124" r="3" fill="#C0825A" opacity="0.3" />
      <circle cx="105" cy="124" r="3" fill="#C0825A" opacity="0.3" />
      <path
        d={`M 82 140 Q 100 ${140 + mouthOpen} 118 140`}
        stroke="#C0506A"
        strokeWidth="3"
        fill={mouthOpen > 4 ? "#7a1230" : "none"}
        strokeLinecap="round"
      />
      {mouthOpen <= 4 && (
        <path
          d="M 82 140 Q 91 136 100 137 Q 109 136 118 140"
          stroke="#D4688A"
          strokeWidth="1.5"
          fill="none"
          opacity="0.6"
        />
      )}
      {isSpeaking && (
        <g filter="url(#glow)">
          <circle
            cx="100"
            cy="110"
            r="72"
            fill="none"
            stroke="#3B82F6"
            strokeWidth="2"
            opacity="0.3"
          >
            <animate attributeName="r" values="72;80;72" dur="1s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.3;0.1;0.3" dur="1s" repeatCount="indefinite" />
          </circle>
        </g>
      )}
    </svg>
  );
}

export function VideoChatAssistant() {
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [statusText, setStatusText] = useState("통화를 시작하려면 아래 버튼을 누르세요");
  const [messages, setMessages] = useState<Message[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<SpeechRecognitionAPI | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const isCallActiveRef = useRef(false);
  const isMicOnRef = useRef(true);

  const startListening = useCallback(() => {
    if (!recognitionRef.current || !isMicOnRef.current || !isCallActiveRef.current) return;
    try {
      recognitionRef.current.start();
      setIsListening(true);
      setStatusText("듣고 있어요...");
    } catch (_) {}
  }, []);

  const stopListening = useCallback(() => {
    try { recognitionRef.current?.stop(); } catch (_) {}
    setIsListening(false);
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!synthRef.current) return;
      synthRef.current.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "ko-KR";
      utterance.rate = 1.05;
      utterance.pitch = 1.1;
      utterance.onstart = () => {
        setIsSpeaking(true);
        setStatusText("AI가 말하고 있어요...");
      };
      utterance.onend = () => {
        setIsSpeaking(false);
        if (isCallActiveRef.current && isMicOnRef.current) {
          setTimeout(startListening, 300);
        } else {
          setStatusText("듣고 있어요...");
        }
      };
      utterance.onerror = () => setIsSpeaking(false);
      synthRef.current.speak(utterance);
    },
    [startListening]
  );

  const sendToAI = useCallback(
    async (userText: string) => {
      const userMsg: Message = { role: "user", content: userText };
      const newMessages = [...messages, userMsg];
      setMessages(newMessages);
      setIsLoading(true);
      setStatusText("AI가 응답 중...");

      try {
        const res = await fetch("/api/video-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: newMessages }),
        });

        if (!res.ok || !res.body) {
          throw new Error("API error");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullText = "";

        setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          fullText += decoder.decode(value, { stream: true });
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = { role: "assistant", content: fullText };
            return updated;
          });
        }

        if (fullText) {
          setStatusText("AI가 말하고 있어요...");
          speak(fullText);
        }
      } catch (_) {
        setStatusText("오류가 발생했습니다. 다시 시도해주세요.");
        if (isCallActiveRef.current && isMicOnRef.current) {
          setTimeout(startListening, 1000);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [messages, speak, startListening]
  );

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setIsCameraOn(true);
    } catch (_) {
      setIsCameraOn(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => {
    synthRef.current = window.speechSynthesis;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    const recognition = new SR();
    recognition.lang = "ko-KR";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      const result = event.results[event.results.length - 1];
      const text = result[0].transcript;
      setTranscript(text);
      if (result.isFinal && text.trim()) {
        setTranscript("");
        sendToAI(text);
      }
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognitionRef.current = recognition;
  }, [sendToAI]);

  const startCall = async () => {
    isCallActiveRef.current = true;
    setIsCallActive(true);
    setStatusText("연결 중...");
    await startCamera();
    setTimeout(() => speak("안녕하세요! AI 영상 비서입니다. 무엇을 도와드릴까요?"), 600);
  };

  const endCall = () => {
    isCallActiveRef.current = false;
    setIsCallActive(false);
    stopCamera();
    stopListening();
    synthRef.current?.cancel();
    setIsSpeaking(false);
    setIsListening(false);
    setTranscript("");
    setStatusText("통화를 시작하려면 아래 버튼을 누르세요");
  };

  const toggleMic = () => {
    const next = !isMicOn;
    isMicOnRef.current = next;
    setIsMicOn(next);
    if (!next) stopListening();
    else if (isCallActive && !isSpeaking) startListening();
  };

  const toggleCamera = () => {
    if (isCameraOn) { stopCamera(); setIsCameraOn(false); }
    else startCamera();
  };

  const recentMessages = messages.slice(-6);

  return (
    <div className="h-screen bg-gray-950 flex flex-col select-none">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
            <span className="text-white text-sm font-bold">AI</span>
          </div>
          <div>
            <h1 className="text-white font-semibold text-sm">AI 영상 비서</h1>
            <p className="text-gray-500 text-xs">실시간 대화 도우미</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full transition-colors ${isCallActive ? "bg-green-400 animate-pulse" : "bg-gray-600"}`} />
          <span className="text-gray-400 text-xs">{isCallActive ? "통화 중" : "대기 중"}</span>
        </div>
      </div>

      <div className="flex-1 flex gap-4 p-4 min-h-0">
        <div className="flex-1 relative bg-gray-900 rounded-2xl overflow-hidden flex flex-col items-center justify-center">
          <div className="w-56 h-56 md:w-72 md:h-72">
            <AvatarFace isSpeaking={isSpeaking} />
          </div>
          <div className="absolute top-4 left-1/2 -translate-x-1/2">
            <div className="bg-black/70 backdrop-blur-sm px-4 py-1.5 rounded-full border border-gray-700">
              <p className="text-gray-300 text-xs">{statusText}</p>
            </div>
          </div>
          <div className="absolute bottom-4 left-4">
            <div className="bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center gap-2">
              {isSpeaking && (
                <span className="flex gap-0.5">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-0.5 bg-blue-400 rounded-full animate-bounce"
                      style={{ height: `${8 + i * 4}px`, animationDelay: `${i * 0.1}s` }}
                    />
                  ))}
                </span>
              )}
              <span className="text-white text-xs font-medium">AI 비서</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 w-64 md:w-72">
          <div className="relative bg-gray-900 rounded-2xl overflow-hidden" style={{ aspectRatio: "4/3" }}>
            {isCameraOn && isCallActive ? (
              <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-800">
                <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center">
                  <span className="text-4xl">👤</span>
                </div>
              </div>
            )}
            {isCallActive && (
              <div className="absolute top-2 right-2">
                {isListening ? (
                  <span className="flex items-center gap-1 bg-red-600/80 px-2 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    <span className="text-white text-[10px]">REC</span>
                  </span>
                ) : (
                  !isMicOn && (
                    <span className="bg-gray-700/80 p-1 rounded-full flex items-center">
                      <MicOff size={10} className="text-red-400" />
                    </span>
                  )
                )}
              </div>
            )}
            <div className="absolute bottom-2 left-2">
              <div className="bg-black/70 px-2 py-0.5 rounded-full">
                <span className="text-white text-xs">나</span>
              </div>
            </div>
          </div>

          <div className="flex-1 bg-gray-900 rounded-2xl p-3 flex flex-col min-h-0">
            <p className="text-gray-500 text-xs mb-2 font-medium uppercase tracking-wide">대화 내역</p>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {recentMessages.length === 0 && (
                <p className="text-gray-600 text-xs text-center mt-4">대화를 시작해보세요</p>
              )}
              {recentMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[90%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white rounded-br-sm"
                      : "bg-gray-700 text-gray-100 rounded-bl-sm"
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {transcript && (
                <div className="flex justify-end">
                  <div className="max-w-[90%] px-3 py-2 rounded-xl text-xs bg-blue-700/40 text-blue-200 border border-blue-500/40 border-dashed">
                    {transcript}
                  </div>
                </div>
              )}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="px-3 py-2 rounded-xl bg-gray-700 flex gap-1 items-center">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="shrink-0 flex items-center justify-center gap-4 py-4 border-t border-gray-800">
        {isCallActive ? (
          <>
            <button
              type="button"
              onClick={toggleMic}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                isMicOn
                  ? "bg-gray-700 hover:bg-gray-600 text-white"
                  : "bg-red-600/20 hover:bg-red-600/30 text-red-400 ring-1 ring-red-500/50"
              }`}
            >
              {isMicOn ? <Mic size={18} /> : <MicOff size={18} />}
            </button>
            <button
              type="button"
              onClick={endCall}
              className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 active:bg-red-700 flex items-center justify-center text-white transition-all shadow-lg shadow-red-900/50"
            >
              <PhoneOff size={22} />
            </button>
            <button
              type="button"
              onClick={toggleCamera}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                isCameraOn
                  ? "bg-gray-700 hover:bg-gray-600 text-white"
                  : "bg-red-600/20 hover:bg-red-600/30 text-red-400 ring-1 ring-red-500/50"
              }`}
            >
              {isCameraOn ? <Video size={18} /> : <VideoOff size={18} />}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={startCall}
            className="w-14 h-14 rounded-full bg-green-600 hover:bg-green-500 active:bg-green-700 flex items-center justify-center text-white transition-all shadow-lg shadow-green-900/50"
          >
            <Phone size={22} />
          </button>
        )}
      </div>
    </div>
  );
}
