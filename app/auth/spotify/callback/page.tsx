"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export default function SpotifyCallbackPage() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const access_token = searchParams.get("access_token");
    const refresh_token = searchParams.get("refresh_token");
    const expires_in = searchParams.get("expires_in");
    const error = searchParams.get("error");

    if (error) {
      // Send error to parent window
      if (window.opener) {
        window.opener.postMessage(
          {
            type: "spotify-oauth-callback",
            error: error,
          },
          window.location.origin
        );
      }
      window.close();
      return;
    }

    if (access_token) {
      // Send tokens to parent window
      if (window.opener) {
        window.opener.postMessage(
          {
            type: "spotify-oauth-callback",
            access_token: access_token,
            refresh_token: refresh_token,
            expires_in: expires_in,
          },
          window.location.origin
        );
      }
      window.close();
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-kaizen-black">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-kaizen-white">Completing Spotify authentication...</p>
        <p className="text-kaizen-gray text-sm mt-2">
          This window will close automatically
        </p>
      </div>
    </div>
  );
}
