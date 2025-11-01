"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export default function GitHubCallbackPage() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const access_token = searchParams.get("access_token");
    const token_type = searchParams.get("token_type");
    const error = searchParams.get("error");

    if (error) {
      // Send error to parent window
      if (window.opener) {
        window.opener.postMessage(
          {
            type: "github-oauth-callback",
            error: error,
          },
          window.location.origin
        );
      }
      window.close();
      return;
    }

    if (access_token) {
      // Send token to parent window
      if (window.opener) {
        window.opener.postMessage(
          {
            type: "github-oauth-callback",
            access_token: access_token,
            token_type: token_type,
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
        <div className="w-16 h-16 border-4 border-kaizen-yellow border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-kaizen-white">Completing GitHub authentication...</p>
        <p className="text-kaizen-gray text-sm mt-2">
          This window will close automatically
        </p>
      </div>
    </div>
  );
}
