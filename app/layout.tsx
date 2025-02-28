"use client";
import { useEffect, useState } from "react";
import { auth } from "../app/firebase/firebaseConfig";
import { onAuthStateChanged, User } from "firebase/auth";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <nav className="p-4 bg-gray-900 text-white flex justify-between">
          <Link href="/">Home</Link>
          {user ? (
            <div className="flex gap-4">
              <span>{user.displayName}</span>
              <Link href="/signout">Sign Out</Link>
            </div>
          ) : (
            <Link href="/signin">Sign In</Link>
          )}
        </nav>
        <main className="p-4">{children}</main>
      </body>
    </html>
  );
}
