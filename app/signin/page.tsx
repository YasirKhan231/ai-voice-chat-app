"use client";
import { useRouter } from "next/navigation";
import { signInWithGoogle } from "../firebase/auth";

export default function SignInPage() {
  const router = useRouter();

  const handleSignIn = async () => {
    const user = await signInWithGoogle();
    if (user) {
      router.push("/"); // Redirect to home after successful sign-in
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-2xl font-bold">Sign In</h1>
      <button
        onClick={handleSignIn}
        className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-lg"
      >
        Sign in with Google
      </button>
    </div>
  );
}
