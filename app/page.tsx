"use client";
import type React from "react";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Bot, User, VolumeX, Mic } from "lucide-react"; // Removed Clock
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

const ChatApp: React.FC = () => {
  // State variables
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [audioPlaying, setAudioPlaying] = useState<boolean>(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null); // Added messagesEndRef

  // API Keys (use environment variables)
  const OPENAI_API_KEY = process.env.NEXT_PUBLIC_OPENAI_API_KEY as string;
  const ELEVENLABS_API_KEY = process.env
    .NEXT_PUBLIC_ELEVENLABS_API_KEY as string;

  // Initialize OpenAI
  const openai = new OpenAI({
    apiKey: OPENAI_API_KEY,
    dangerouslyAllowBrowser: true, // Only for client-side use in development
  });

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
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join("");
      if (event.results[0].isFinal) {
        handleSendMessage(transcript);
      }
    };

    recognition.onerror = (event: Event) => {
      console.error("Speech recognition error:", event);
      toast.error("Error recognizing speech. Please try again.");
      setIsListening(false);
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
  }, [messages]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Function to send message to OpenAI and store in Firebase
  const handleSendMessage = async (text: string) => {
    if (text.trim() === "") {
      toast.error("Message cannot be empty");
      return;
    }

    const userMessage: Message = {
      text: text,
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

      // Fetch AI response
      const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: text },
        ],
      });

      const aiResponse = completion.choices[0].message.content;
      if (!aiResponse) {
        toast.error("Received empty response from AI");
        return;
      }

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

      // Update UI with AI response
      setMessages((prev) => [...prev, botMessage]);

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
    const parts = text.split(/(```[\s\S]*?```)/g);

    return parts.map((part, index) => {
      if (part.startsWith("```") && part.endsWith("```")) {
        const match = part.match(/```(\w*)\n([\s\S]*?)```/);
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
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  return (
    <>
      <style jsx global>{`
        /* Your global styles here */
      `}</style>

      {/* Your existing component JSX */}
      <div className="flex flex-col h-screen w-full bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
        {/* Header */}
        <div className="bg-blue-600 text-white p-4 shadow-md">
          <div className="max-w-4xl mx-auto flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-full">
              <Bot className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-bold">AI Assistant</h1>
          </div>
        </div>

        {/* Messages Container - Full width and height */}
        <div className="flex-1 w-full mx-auto p-4 overflow-hidden">
          <Card className="h-full border rounded-xl shadow-lg bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
            <CardContent className="p-0 h-full">
              <ScrollArea className="h-full p-4">
                <div className="space-y-6">
                  {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-[50vh] text-center text-gray-500">
                      <Bot className="h-12 w-12 mb-4 text-blue-500/50" />
                      <h3 className="text-lg font-medium">
                        Welcome to AI Assistant
                      </h3>
                      <p className="max-w-sm mt-2">
                        Start a conversation by clicking the microphone button.
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
              <Button
                onClick={handleMicClick}
                size="icon"
                className={`h-16 w-16 rounded-full ${
                  isListening
                    ? "bg-red-500 hover:bg-red-600 text-white"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
              >
                {isListening ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <Mic className="h-6 w-6" />
                )}
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
          </div>
        </div>
      </div>
    </>
  );
};

export default ChatApp;
