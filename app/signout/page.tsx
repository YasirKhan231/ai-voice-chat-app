"use client";
import { logOut } from "../firebase/auth";

export default function SignOutPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-2xl font-bold">Sign Out</h1>
      <button
        onClick={logOut}
        className="mt-4 bg-red-500 text-white px-4 py-2 rounded-lg"
      >
        Sign Out
      </button>
    </div>
  );
}
