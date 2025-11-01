"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function SpotifyCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    // The Spotify verification component will handle the tokens from URL
    // This page just shows loading state during redirect
    const timer = setTimeout(() => {
      // Redirect back to the page that initiated auth
      const returnUrl = localStorage.getItem("spotify_return_url") || "/";
      localStorage.removeItem("spotify_return_url");
      router.push(returnUrl);
    }, 1000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="w-12 h-12 animate-spin mx-auto text-green-500" />
        <h2 className="text-xl font-semibold">Connecting to Spotify...</h2>
        <p className="text-muted-foreground">Please wait while we verify your account</p>
      </div>
    </div>
  );
}
