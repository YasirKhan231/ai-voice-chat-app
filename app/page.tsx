"use client";
import type React from "react";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, Bot, User, Clock, Mic } from "lucide-react";
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
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
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
  //ai-voice-chat-app
  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Speech recognition not supported in this browser.");
      return;
    }

    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = false;
    recognitionRef.current.lang = "en-US";

    recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      setMessage(transcript); // Set the transcribed text in the input field
      setIsListening(false);
      handleSendMessage(transcript); // Send the transcribed message to OpenAI
    };

    recognitionRef.current.onerror = (event: Event) => {
      console.error("Speech recognition error:", event);
      toast.error("Error recognizing speech. Please try again.");
      setIsListening(false);
    };

    recognitionRef.current.onend = () => {
      setIsListening(false); // Reset the listening state
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

      const botMessage: Message = {
        text: aiResponse,
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
            text: aiResponse,
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
      audio.play();
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Error sending message. Please try again.");
    } finally {
      setLoading(false);
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
    // Split by code blocks (text between ```)
    const parts = text.split(/(```[\s\S]*?```)/g);

    return parts.map((part, index) => {
      // Check if this part is a code block
      if (part.startsWith("```") && part.endsWith("```")) {
        // Extract language and code
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
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 shadow-md">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="bg-primary-foreground/20 p-2 rounded-full">
            <Bot className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold">AI Assistant</h1>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-hidden max-w-4xl w-full mx-auto px-4 py-6">
        <Card className="h-full border rounded-xl shadow-lg bg-card/50 backdrop-blur-sm">
          <CardContent className="p-0 h-full">
            <ScrollArea className="h-full p-6" ref={scrollAreaRef}>
              <div className="space-y-6">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-[50vh] text-center text-muted-foreground">
                    <Bot className="h-12 w-12 mb-4 text-primary/50" />
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
                            ? "ring-primary/20"
                            : "ring-secondary/20"
                        }`}
                      >
                        <AvatarImage
                          src="/placeholder.svg?height=36&width=36"
                          alt={msg.sender === "user" ? "User" : "AI"}
                        />
                        <AvatarFallback
                          className={`${
                            msg.sender === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary text-secondary-foreground"
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
                            ? "bg-primary text-primary-foreground"
                            : "bg-card border shadow-sm dark:bg-slate-800"
                        }`}
                      >
                        <div
                          className={`${
                            msg.sender === "assistant" ? "text-foreground" : ""
                          }`}
                        >
                          {formatMessageText(msg.text)}
                        </div>

                        <div
                          className={`flex items-center text-xs mt-2 gap-1 ${
                            msg.sender === "user"
                              ? "text-primary-foreground/70 justify-start"
                              : "text-muted-foreground justify-end"
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
                      <Avatar className="h-9 w-9 mt-1 ring-2 ring-secondary/20">
                        <AvatarFallback className="bg-secondary text-secondary-foreground">
                          <Bot className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>

                      <div className="rounded-2xl px-5 py-3.5 bg-card border shadow-sm dark:bg-slate-800 min-w-[120px]">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2 w-2 bg-primary rounded-full animate-bounce"
                            style={{ animationDelay: "0ms" }}
                          ></div>
                          <div
                            className="h-2 w-2 bg-primary rounded-full animate-bounce"
                            style={{ animationDelay: "300ms" }}
                          ></div>
                          <div
                            className="h-2 w-2 bg-primary rounded-full animate-bounce"
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
      <div className="p-4 bg-background/80 backdrop-blur-sm border-t">
        <div className="max-w-4xl mx-auto">
          <div className="relative">
            <Input
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && !e.shiftKey && handleSendMessage()
              }
              className="pr-14 py-6 rounded-full border-primary/20 shadow-sm"
            />
            <Button
              onClick={() => handleSendMessage()}
              disabled={message.trim() === "" || loading}
              size="icon"
              className="h-10 w-10 absolute right-1.5 top-1/2 transform -translate-y-1/2 rounded-full"
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
              className="h-10 w-10 absolute right-12 top-1/2 transform -translate-y-1/2 rounded-full"
              variant={isListening ? "destructive" : "outline"}
            >
              <Mic className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-xs text-center mt-2 text-muted-foreground">
            Press Enter to send, Shift+Enter for new line
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatApp;
