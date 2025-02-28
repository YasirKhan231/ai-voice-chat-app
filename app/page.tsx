"use client";
import type React from "react";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, Bot, User, Clock, Mic, VolumeX, X } from "lucide-react";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
  type DocumentData,
  type QuerySnapshot,
} from "firebase/firestore";
import { db } from "./firebase/firebaseConfig";
import { toast } from "react-toastify";
import { OpenAI } from "openai";

// Define types for messages
interface Message {
  id?: string;
  text: string;
  createdAt?: any; // Firestore timestamp
  sender: "user" | "assistant";
  index: number; // Index to track the order of messages
}

// Extend Window interface for SpeechRecognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
}

interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative;
  length: number;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

const ChatApp: React.FC = () => {
  // State variables
  const [message, setMessage] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [audioPlaying, setAudioPlaying] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>("");
  const [showVoiceModal, setShowVoiceModal] = useState<boolean>(false);
  const [voiceWaveform, setVoiceWaveform] = useState<number[]>([]);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // API Keys (use environment variables)
  const OPENAI_API_KEY = process.env.NEXT_PUBLIC_OPENAI_API_KEY as string;
  const ELEVENLABS_API_KEY = process.env
    .NEXT_PUBLIC_ELEVENLABS_API_KEY as string;

  // Initialize OpenAI
  const openai = new OpenAI({
    apiKey: OPENAI_API_KEY,
    dangerouslyAllowBrowser: true, // Only for client-side use in development
  });

  // Generate random waveform data for visualization
  useEffect(() => {
    if (isListening) {
      const interval = setInterval(() => {
        const newWaveform = Array.from(
          { length: 20 },
          () => Math.floor(Math.random() * 30) + 5
        );
        setVoiceWaveform(newWaveform);
      }, 150);

      return () => clearInterval(interval);
    }
  }, [isListening]);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Speech recognition not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const currentTranscript = event.results[0][0].transcript;
      setTranscript(currentTranscript);

      if (event.results[0].isFinal) {
        setMessage(currentTranscript);
        setTimeout(() => {
          setShowVoiceModal(false);
          setIsListening(false);
          handleSendMessage(currentTranscript);
        }, 1000);
      }
    };

    recognition.onerror = (event: Event) => {
      console.error("Speech recognition error:", event);
      toast.error("Error recognizing speech. Please try again.");
      setIsListening(false);
      setShowVoiceModal(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };
  }, []);

  // Fetch messages from Firebase
  useEffect(() => {
    const messagesRef = collection(db, "messages");
    const q = query(messagesRef, orderBy("index", "asc")); // Order messages by index

    const unsubscribe = onSnapshot(
      q,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const messageData: Message[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Message[];
        setMessages(messageData);
      },
      (error) => {
        console.error("Error fetching messages:", error);
        toast.error("Error fetching messages");
      }
    );

    return () => unsubscribe();
  }, []);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    scrollToBottom();
  }, []);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Function to send message to OpenAI and store in Firebase
  const handleSendMessage = async (text?: string) => {
    const messageText = text || message;
    if (messageText.trim() === "") {
      toast.error("Message cannot be empty");
      return;
    }

    const userMessage: Message = {
      text: messageText,
      createdAt: new Date(),
      sender: "user",
      index: messages.length,
    };

    setMessages((prev) => [...prev, userMessage]); // Update UI immediately

    try {
      setLoading(true);

      // Add user message to Firestore
      await addDoc(collection(db, "messages"), {
        ...userMessage,
        createdAt: serverTimestamp(),
      });

      setMessage(""); // Clear input field

      // Fetch AI response
      const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: messageText },
        ],
      });

      const aiResponse = completion.choices[0].message.content;
      if (!aiResponse) {
        toast.error("Received empty response from AI");
        return;
      }

      // Remove unwanted characters like *, /, etc.
      const cleanedResponse = aiResponse.replace(/[*/]/g, "");

      const botMessage: Message = {
        text: cleanedResponse,
        createdAt: new Date(),
        sender: "assistant",
        index: messages.length + 1,
      };

      // Add AI response to Firestore
      await addDoc(collection(db, "messages"), {
        ...botMessage,
        createdAt: serverTimestamp(),
      });

      // Convert AI response to speech using ElevenLabs API
      const response = await fetch(
        "https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "xi-api-key": ELEVENLABS_API_KEY,
          },
          body: JSON.stringify({
            text: cleanedResponse,
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.5,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to convert text to speech");
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      setAudioPlaying(true);

      audio.play();
      audio.onended = () => {
        setAudioPlaying(false);
      };
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Error sending message. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Stop the AI's voice response
  const handleStopVoice = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setAudioPlaying(false);
    }
  };

  // Format timestamp
  const formatTime = (timestamp: any) => {
    if (!timestamp) return "Sending...";

    const date = timestamp.seconds
      ? new Date(timestamp.seconds * 1000)
      : new Date(timestamp);

    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Format message text with code blocks
  const formatMessageText = (text: string) => {
    // Split by code blocks (text between \`\`\`)
    const parts = text.split(/(\`\`\`[\s\S]*?\`\`\`)/g);

    return parts.map((part, index) => {
      // Check if this part is a code block
      if (part.startsWith("```") && part.endsWith("```")) {
        // Extract language and code
        const match = part.match(/\`\`\`(\w*)\n([\s\S]*?)\`\`\`/);
        if (!match)
          return (
            <pre
              key={index}
              className="bg-gray-800 text-gray-200 p-4 rounded-md my-2 overflow-x-auto"
            >
              {part}
            </pre>
          );

        const [, language, code] = match;

        return (
          <div
            key={index}
            className="my-4 overflow-hidden rounded-md border border-gray-700"
          >
            {language && (
              <div className="bg-gray-800 text-gray-300 px-4 py-1 text-xs font-mono">
                {language}
              </div>
            )}
            <pre className="bg-gray-900 text-gray-200 p-4 overflow-x-auto">
              <code>{code}</code>
            </pre>
          </div>
        );
      }

      // Regular text - split by newlines and create paragraphs
      return (
        <div key={index} className="whitespace-pre-wrap">
          {part.split("\n").map((line, i) => (
            <p key={i} className={line.trim() === "" ? "h-4" : "mb-2"}>
              {line}
            </p>
          ))}
        </div>
      );
    });
  };

  // Handle microphone button click
  const handleMicClick = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      setShowVoiceModal(false);
    } else {
      setTranscript("");
      setShowVoiceModal(true);
      setTimeout(() => {
        recognitionRef.current?.start();
        setIsListening(true);
      }, 500);
    }
  };

  return (
    <>
      {/* CSS Variables and Global Styles */}
      <style jsx global>{`
        :root {
          /* Base colors */
          --background: 210 40% 98%;
          --foreground: 222.2 84% 4.9%;

          /* Card colors */
          --card: 0 0% 100%;
          --card-foreground: 222.2 84% 4.9%;

          /* Popover colors */
          --popover: 0 0% 100%;
          --popover-foreground: 222.2 84% 4.9%;

          /* Primary colors */
          --primary: 221.2 83.2% 53.3%;
          --primary-foreground: 210 40% 98%;

          /* Secondary colors */
          --secondary: 226.7 70.7% 40.2%;
          --secondary-foreground: 210 40% 98%;

          /* Muted colors */
          --muted: 210 40% 96.1%;
          --muted-foreground: 215.4 16.3% 46.9%;

          /* Accent colors */
          --accent: 210 40% 96.1%;
          --accent-foreground: 222.2 47.4% 11.2%;

          /* Destructive colors */
          --destructive: 0 84.2% 60.2%;
          --destructive-foreground: 210 40% 98%;

          /* Border and input colors */
          --border: 214.3 31.8% 91.4%;
          --input: 214.3 31.8% 91.4%;
          --ring: 221.2 83.2% 53.3%;

          /* Border radius */
          --radius: 0.5rem;

          /* Blue scale */
          --blue-50: #eff6ff;
          --blue-100: #dbeafe;
          --blue-200: #bfdbfe;
          --blue-300: #93c5fd;
          --blue-400: #60a5fa;
          --blue-500: #3b82f6;
          --blue-600: #2563eb;
          --blue-700: #1d4ed8;
          --blue-800: #1e40af;
          --blue-900: #1e3a8a;
          --blue-950: #172554;

          /* Indigo scale */
          --indigo-50: #eef2ff;
          --indigo-100: #e0e7ff;
          --indigo-200: #c7d2fe;
          --indigo-300: #a5b4fc;
          --indigo-400: #818cf8;
          --indigo-500: #6366f1;
          --indigo-600: #4f46e5;
          --indigo-700: #4338ca;
          --indigo-800: #3730a3;
          --indigo-900: #312e81;
          --indigo-950: #1e1b4b;
        }

        .dark {
          --background: 222.2 84% 4.9%;
          --foreground: 210 40% 98%;

          --card: 222.2 84% 4.9%;
          --card-foreground: 210 40% 98%;

          --popover: 222.2 84% 4.9%;
          --popover-foreground: 210 40% 98%;

          --primary: 217.2 91.2% 59.8%;
          --primary-foreground: 222.2 47.4% 11.2%;

          --secondary: 217.2 32.6% 17.5%;
          --secondary-foreground: 210 40% 98%;

          --muted: 217.2 32.6% 17.5%;
          --muted-foreground: 215 20.2% 65.1%;

          --accent: 217.2 32.6% 17.5%;
          --accent-foreground: 210 40% 98%;

          --destructive: 0 62.8% 30.6%;
          --destructive-foreground: 210 40% 98%;

          --border: 217.2 32.6% 17.5%;
          --input: 217.2 32.6% 17.5%;
          --ring: 224.3 76.3% 48%;
        }

        /* Base styles */
        * {
          border-color: hsl(var(--border));
        }

        body {
          background-color: hsl(var(--background));
          color: hsl(var(--foreground));
        }

        /* Animations */
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scaleIn {
          from {
            transform: scale(0.95);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes bounce {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-5px);
          }
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes accordion-down {
          from {
            height: 0;
          }
          to {
            height: var(--radix-accordion-content-height);
          }
        }

        @keyframes accordion-up {
          from {
            height: var(--radix-accordion-content-height);
          }
          to {
            height: 0;
          }
        }

        .animate-accordion-down {
          animation: accordion-down 0.2s ease-out;
        }

        .animate-accordion-up {
          animation: accordion-up 0.2s ease-out;
        }

        .animate-bounce {
          animation: bounce 1s infinite;
        }

        .animate-spin {
          animation: spin 1s linear infinite;
        }

        .fade-in {
          animation: fadeIn 0.2s ease-out;
        }

        .scale-in {
          animation: scaleIn 0.3s ease-out;
        }

        /* Custom utility classes */
        .bg-gradient-custom {
          background-image: linear-gradient(
            to bottom right,
            var(--blue-50),
            var(--blue-100)
          );
        }

        .dark .bg-gradient-custom {
          background-image: linear-gradient(
            to bottom right,
            var(--blue-950),
            var(--blue-900)
          );
        }

        /* Responsive container */
        .container {
          width: 100%;
          margin-right: auto;
          margin-left: auto;
          padding-right: 2rem;
          padding-left: 2rem;
        }

        @media (min-width: 1400px) {
          .container {
            max-width: 1400px;
          }
        }

        /* Border radius utilities */
        .rounded-custom {
          border-radius: var(--radius);
        }

        .rounded-custom-md {
          border-radius: calc(var(--radius) - 2px);
        }

        .rounded-custom-sm {
          border-radius: calc(var(--radius) - 4px);
        }

        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
        }

        ::-webkit-scrollbar-track {
          background: transparent;
        }

        ::-webkit-scrollbar-thumb {
          background: hsl(var(--muted));
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: hsl(var(--muted-foreground));
        }

        /* Focus styles */
        *:focus-visible {
          outline: 2px solid hsl(var(--ring));
          outline-offset: 2px;
        }

        /* Input styles */
        input::placeholder {
          color: hsl(var(--muted-foreground));
        }

        /* Transition utilities */
        .transition-all {
          transition-property: all;
          transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
          transition-duration: 150ms;
        }

        .transition-colors {
          transition-property: color, background-color, border-color;
          transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
          transition-duration: 150ms;
        }

        /* Shadow utilities */
        .shadow-custom {
          box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1),
            0 1px 2px -1px rgb(0 0 0 / 0.1);
        }

        .shadow-custom-lg {
          box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1),
            0 4px 6px -4px rgb(0 0 0 / 0.1);
        }
      `}</style>

      {/* Your existing component JSX */}
      <div className="flex flex-col h-screen bg-gradient-custom">
        {/* Header */}
        <div className="bg-blue-600 text-white p-4 shadow-md">
          <div className="max-w-4xl mx-auto flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-full">
              <Bot className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-bold">AI Assistant</h1>
          </div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-hidden max-w-4xl w-full mx-auto px-4 py-6">
          <Card className="h-full border rounded-xl shadow-lg bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
            <CardContent className="p-0 h-full">
              <ScrollArea className="h-full p-6" ref={scrollAreaRef}>
                <div className="space-y-6">
                  {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-[50vh] text-center text-gray-500">
                      <Bot className="h-12 w-12 mb-4 text-blue-500/50" />
                      <h3 className="text-lg font-medium">
                        Welcome to AI Assistant
                      </h3>
                      <p className="max-w-sm mt-2">
                        Start a conversation by typing a message below.
                      </p>
                    </div>
                  )}

                  {messages.map((msg, index) => (
                    <div
                      key={msg.id || index}
                      className={`flex ${
                        msg.sender === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`flex items-start gap-3 max-w-[85%] ${
                          msg.sender === "user" ? "flex-row-reverse" : ""
                        }`}
                      >
                        <Avatar
                          className={`h-9 w-9 mt-1 ring-2 ${
                            msg.sender === "user"
                              ? "ring-blue-500/20"
                              : "ring-indigo-500/20"
                          }`}
                        >
                          <AvatarImage
                            src="/placeholder.svg?height=36&width=36"
                            alt={msg.sender === "user" ? "User" : "AI"}
                          />
                          <AvatarFallback
                            className={`${
                              msg.sender === "user"
                                ? "bg-blue-600 text-white"
                                : "bg-indigo-600 text-white"
                            }`}
                          >
                            {msg.sender === "user" ? (
                              <User className="h-4 w-4" />
                            ) : (
                              <Bot className="h-4 w-4" />
                            )}
                          </AvatarFallback>
                        </Avatar>

                        <div
                          className={`rounded-2xl px-5 py-3.5 ${
                            msg.sender === "user"
                              ? "bg-blue-600 text-white"
                              : "bg-white border shadow-sm dark:bg-gray-800 dark:border-gray-700"
                          }`}
                        >
                          <div
                            className={`${
                              msg.sender === "assistant"
                                ? "text-gray-900 dark:text-white"
                                : ""
                            }`}
                          >
                            {formatMessageText(msg.text)}
                          </div>

                          <div
                            className={`flex items-center text-xs mt-2 gap-1 ${
                              msg.sender === "user"
                                ? "text-blue-100 justify-start"
                                : "text-gray-500 dark:text-gray-400 justify-end"
                            }`}
                          >
                            <Clock className="h-3 w-3" />
                            <span>{formatTime(msg.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {loading && (
                    <div className="flex justify-start my-4">
                      <div className="flex items-start gap-3 max-w-[85%]">
                        <Avatar className="h-9 w-9 mt-1 ring-2 ring-indigo-500/20">
                          <AvatarFallback className="bg-indigo-600 text-white">
                            <Bot className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>

                        <div className="rounded-2xl px-5 py-3.5 bg-white border shadow-sm dark:bg-gray-800 dark:border-gray-700 min-w-[120px]">
                          <div className="flex items-center gap-2">
                            <div
                              className="h-2 w-2 bg-blue-600 rounded-full animate-bounce"
                              style={{ animationDelay: "0ms" }}
                            ></div>
                            <div
                              className="h-2 w-2 bg-blue-600 rounded-full animate-bounce"
                              style={{ animationDelay: "300ms" }}
                            ></div>
                            <div
                              className="h-2 w-2 bg-blue-600 rounded-full animate-bounce"
                              style={{ animationDelay: "600ms" }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-t border-blue-100 dark:border-blue-900">
          <div className="max-w-4xl mx-auto">
            <div className="relative">
              <Input
                placeholder="Type a message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && !e.shiftKey && handleSendMessage()
                }
                className="pr-14 py-6 rounded-full border-blue-200 dark:border-blue-800 shadow-sm focus:border-blue-400 focus:ring-blue-400"
              />
              <Button
                onClick={() => handleSendMessage()}
                disabled={message.trim() === "" || loading}
                size="icon"
                className="h-10 w-10 absolute right-1.5 top-1/2 transform -translate-y-1/2 rounded-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
              <Button
                onClick={handleMicClick}
                size="icon"
                className={`h-10 w-10 absolute right-12 top-1/2 transform -translate-y-1/2 rounded-full ${
                  isListening
                    ? "bg-red-500 hover:bg-red-600 text-white"
                    : "bg-blue-100 text-blue-600 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:hover:bg-blue-800"
                }`}
                variant={isListening ? "destructive" : "outline"}
              >
                <Mic className="h-4 w-4" />
              </Button>
              {audioPlaying && (
                <Button
                  onClick={handleStopVoice}
                  size="icon"
                  className="h-10 w-10 absolute right-24 top-1/2 transform -translate-y-1/2 rounded-full bg-red-500 hover:bg-red-600 text-white"
                  variant="destructive"
                >
                  <VolumeX className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="text-xs text-center mt-2 text-gray-500 dark:text-gray-400">
              Press Enter to send, Shift+Enter for new line
            </div>
          </div>
        </div>

        {/* Voice Recognition Modal */}
        {showVoiceModal && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
            style={{ animation: "fadeIn 0.2s ease-out" }}
          >
            <div
              className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden"
              style={{ animation: "scaleIn 0.3s ease-out" }}
            >
              <div className="p-6 flex flex-col items-center">
                <div className="w-full h-24 flex items-center justify-center mb-4">
                  {/* Voice waveform visualization */}
                  <div className="flex items-center justify-center gap-1 h-full">
                    {Array.from({ length: 20 }).map((_, i) => (
                      <div
                        key={i}
                        className="w-1 bg-blue-500 rounded-full"
                        style={{
                          height: `${voiceWaveform[i] || 5}px`,
                          opacity: isListening ? 1 : 0.5,
                          transition: "height 0.1s ease-in-out",
                        }}
                      ></div>
                    ))}
                  </div>
                </div>

                <div className="text-center mb-6">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    {isListening ? "Listening..." : "Getting ready..."}
                  </p>
                  <p className="text-lg font-medium text-blue-600 dark:text-blue-400 min-h-[28px]">
                    {transcript}
                  </p>
                </div>

                <div className="flex gap-4">
                  <Button
                    onClick={() => {
                      recognitionRef.current?.stop();
                      setIsListening(false);
                      setShowVoiceModal(false);
                    }}
                    size="icon"
                    className="h-12 w-12 rounded-full bg-red-100 text-red-500 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                    variant="outline"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                  <Button
                    size="icon"
                    className={`h-12 w-12 rounded-full ${
                      isListening
                        ? "bg-red-500 hover:bg-red-600 text-white"
                        : "bg-blue-500 hover:bg-blue-600 text-white"
                    }`}
                  >
                    <Mic className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ChatApp;
