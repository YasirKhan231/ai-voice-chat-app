"use client";

import type React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Bot, Loader2 } from "lucide-react";

// Mock firebase auth function
const logOut = async () => {
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      resolve();
    }, 500);
  });
};

// Mock toast function
const toast = {
  success: (message: string) => console.log(message),
  error: (message: string) => console.error(message),
};

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "destructive" | "outline";
  disabled?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = "primary",
  disabled = false,
}) => {
  const baseStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0.75rem 1.5rem",
    borderRadius: "0.375rem",
    fontWeight: "600",
    fontSize: "0.875rem",
    transition: "all 0.2s ease",
    cursor: disabled ? "not-allowed" : "pointer",
    width: "100%",
    opacity: disabled ? 0.7 : 1,
  };

  let variantStyle: React.CSSProperties = {};

  if (variant === "primary") {
    variantStyle = {
      backgroundColor: "#3b82f6",
      color: "white",
      border: "none",
    };
  } else if (variant === "destructive") {
    variantStyle = {
      backgroundColor: "#60a5fa", // Changed to blue
      color: "white", // Changed text to white
      border: "none",
    };
  } else if (variant === "outline") {
    variantStyle = {
      backgroundColor: "transparent",
      color: "#6b7280",
      border: "1px solid #e5e7eb",
    };
  }

  const [isHovered, setIsHovered] = useState(false);

  if (isHovered && !disabled) {
    if (variant === "primary") {
      variantStyle.backgroundColor = "#2563eb";
    } else if (variant === "destructive") {
      variantStyle.backgroundColor = "#3b82f6"; // Darker blue on hover
    } else if (variant === "outline") {
      variantStyle.backgroundColor = "#f9fafb";
      variantStyle.color = "#374151";
    }
  }

  return (
    <button
      disabled={disabled}
      onClick={onClick}
      style={{ ...baseStyle, ...variantStyle }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
    </button>
  );
};

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  onConfirm: () => void;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "0.5rem",
          width: "100%",
          maxWidth: "28rem",
          padding: "1.5rem",
          boxShadow:
            "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ marginBottom: "1.5rem" }}>
          <h2
            style={{
              fontSize: "1.25rem",
              fontWeight: "600",
              marginBottom: "0.5rem",
              color: "#111827",
            }}
          >
            {title}
          </h2>
          <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>
            {description}
          </p>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "0.75rem",
            marginTop: "1.5rem",
          }}
        >
          <button
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "0.375rem",
              fontSize: "0.875rem",
              fontWeight: "500",
              backgroundColor: "white",
              color: "#6b7280",
              border: "1px solid #e5e7eb",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onClick={onClose}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#f9fafb";
              e.currentTarget.style.color = "#374151";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "white";
              e.currentTarget.style.color = "#6b7280";
            }}
          >
            Cancel
          </button>
          <button
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "0.375rem",
              fontSize: "0.875rem",
              fontWeight: "500",
              backgroundColor: "#60a5fa", // Changed to blue
              color: "white",
              border: "none",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onClick={onConfirm}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#3b82f6"; // Darker blue on hover
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#60a5fa"; // Back to original blue
            }}
          >
            Yes, sign me out
          </button>
        </div>
      </div>
    </div>
  );
};

export default function SignOutPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      setIsLoading(true);
      await logOut();
      toast.success("Signed out successfully");
      router.push("/signin");
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Error signing out. Please try again.");
    } finally {
      setIsLoading(false);
      setIsModalOpen(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(to bottom right, #dbeafe, #bfdbfe)", // Lighter blue gradient
        padding: "1rem",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "28rem",
          backgroundColor: "rgba(255, 255, 255, 0.9)",
          backdropFilter: "blur(8px)",
          borderRadius: "0.75rem",
          boxShadow:
            "0 20px 25px -5px rgba(59, 130, 246, 0.1), 0 10px 10px -5px rgba(59, 130, 246, 0.04)", // Blue tinted shadow
          overflow: "hidden",
        }}
      >
        {/* Card Header */}
        <div
          style={{
            padding: "1.5rem 1.5rem 0.5rem 1.5rem",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "4rem",
              height: "4rem",
              borderRadius: "50%",
              backgroundColor: "#dbeafe",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "1rem",
            }}
          >
            <Bot style={{ width: "2rem", height: "2rem", color: "#3b82f6" }} />
          </div>
          <h2
            style={{
              fontSize: "1.5rem",
              fontWeight: "700",
              lineHeight: "1.2",
              marginBottom: "0.5rem",
              color: "#1e40af", // Darker blue for title
            }}
          >
            Sign Out
          </h2>
          <p
            style={{
              fontSize: "0.875rem",
              color: "#6b7280",
              marginBottom: "1rem",
            }}
          >
            Are you sure you want to sign out from the AI Assistant?
          </p>
        </div>

        {/* Card Content */}
        <div
          style={{
            padding: "0 1.5rem 0.5rem 1.5rem",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <p
            style={{
              fontSize: "0.875rem",
              color: "#6b7280",
              textAlign: "center",
              maxWidth: "24rem",
              marginBottom: "1rem",
            }}
          >
            You will need to sign in again to continue using the AI chat
            features and access your conversation history.
          </p>
        </div>

        {/* Card Footer */}
        <div
          style={{
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
          }}
        >
          <Button
            variant="destructive"
            disabled={isLoading}
            onClick={() => setIsModalOpen(true)}
          >
            {isLoading ? (
              <div style={{ display: "flex", alignItems: "center" }}>
                <Loader2
                  style={{
                    width: "1rem",
                    height: "1rem",
                    marginRight: "0.5rem",
                    animation: "spin 1s linear infinite",
                  }}
                />
                <style jsx>{`
                  @keyframes spin {
                    from {
                      transform: rotate(0deg);
                    }
                    to {
                      transform: rotate(360deg);
                    }
                  }
                `}</style>
                Processing...
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center" }}>
                <LogOut
                  style={{
                    width: "1rem",
                    height: "1rem",
                    marginRight: "0.5rem",
                  }}
                />
                Sign Out
              </div>
            )}
          </Button>
          <Button variant="outline" onClick={() => router.back()}>
            Go Back
          </Button>
        </div>
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Are you absolutely sure?"
        description="This will sign you out from your current session. You will need to sign in again to access your account."
        onConfirm={handleSignOut}
      />
    </div>
  );
}
