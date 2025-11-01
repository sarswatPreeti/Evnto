"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Github, Music2, Check, X, Loader2, AlertCircle } from "lucide-react";

interface OAuthVerificationProps {
  eventCategory: string;
  eventId: string;
  artistId?: string;
  onVerificationComplete: (proof: any, publicSignals: any, type: "github" | "spotify") => void;
}

interface VerificationStatus {
  status: "idle" | "authenticating" | "verifying" | "success" | "error";
  message?: string;
  isEligible?: boolean;
  stats?: any;
}

export function OAuthVerification({
  eventCategory,
  eventId,
  artistId,
  onVerificationComplete,
}: OAuthVerificationProps) {
  const [githubStatus, setGithubStatus] = useState<VerificationStatus>({ status: "idle" });
  const [spotifyStatus, setSpotifyStatus] = useState<VerificationStatus>({ status: "idle" });

  const isHackathon = eventCategory === "Web3 Hackathon";
  const isConcert = eventCategory === "Live shows";

  /**
   * Handle GitHub OAuth verification
   */
  const handleGitHubVerification = async () => {
    try {
      setGithubStatus({ status: "authenticating", message: "Opening GitHub login..." });

      // Request OAuth URL from backend
      const authResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/github/auth`
      );
      const authData = await authResponse.json();

      if (!authData.success) {
        throw new Error("Failed to generate GitHub OAuth URL");
      }

      // Store state for verification
      if (typeof window !== "undefined") {
        sessionStorage.setItem("github_oauth_state", authData.state);
        sessionStorage.setItem("github_oauth_eventId", eventId);
      }

      // Open OAuth popup
      const popup = window.open(
        authData.authUrl,
        "GitHub OAuth",
        "width=600,height=700,left=200,top=100"
      );

      // Listen for callback message
      const handleMessage = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;

        if (event.data.type === "github-oauth-callback") {
          const { access_token } = event.data;

          if (access_token) {
            setGithubStatus({
              status: "verifying",
              message: "Verifying GitHub contributions...",
            });

            // Verify eligibility and generate ZK proof
            const verifyResponse = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/github/verify-eligibility`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  access_token,
                  eventId,
                }),
              }
            );

            const verifyData = await verifyResponse.json();

            if (verifyData.success && verifyData.isEligible) {
              setGithubStatus({
                status: "success",
                message: "✅ You are eligible for priority access!",
                isEligible: true,
                stats: verifyData.stats,
              });

              // Pass proof to parent
              onVerificationComplete(
                verifyData.proof,
                verifyData.publicSignals,
                "github"
              );
            } else {
              setGithubStatus({
                status: "error",
                message: verifyData.message || "❌ Not eligible for priority access",
                isEligible: false,
                stats: verifyData.stats,
              });
            }
          }

          popup?.close();
        }
      };

      window.addEventListener("message", handleMessage);

      // Cleanup listener after 5 minutes
      setTimeout(() => {
        window.removeEventListener("message", handleMessage);
      }, 5 * 60 * 1000);
    } catch (error) {
      console.error("GitHub verification error:", error);
      setGithubStatus({
        status: "error",
        message: error instanceof Error ? error.message : "Verification failed",
      });
    }
  };

  /**
   * Handle Spotify OAuth verification
   */
  const handleSpotifyVerification = async () => {
    try {
      setSpotifyStatus({ status: "authenticating", message: "Opening Spotify login..." });

      if (!artistId) {
        throw new Error("Artist ID not provided for this event");
      }

      // Request OAuth URL from backend
      const authResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/spotify/auth`
      );
      const authData = await authResponse.json();

      if (!authData.success) {
        throw new Error("Failed to generate Spotify OAuth URL");
      }

      // Store state for verification
      if (typeof window !== "undefined") {
        sessionStorage.setItem("spotify_oauth_state", authData.state);
        sessionStorage.setItem("spotify_oauth_eventId", eventId);
        sessionStorage.setItem("spotify_oauth_artistId", artistId);
      }

      // Open OAuth popup
      const popup = window.open(
        authData.authUrl,
        "Spotify OAuth",
        "width=600,height=700,left=200,top=100"
      );

      // Listen for callback message
      const handleMessage = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;

        if (event.data.type === "spotify-oauth-callback") {
          const { access_token } = event.data;

          if (access_token) {
            setSpotifyStatus({
              status: "verifying",
              message: "Verifying Spotify listening history...",
            });

            // Get user profile
            const profileResponse = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/spotify/profile?access_token=${access_token}`
            );
            const profileData = await profileResponse.json();

            if (!profileData.success) {
              throw new Error("Failed to fetch Spotify profile");
            }

            const spotifyUserId = profileData.profile.id;

            // Verify eligibility and generate ZK proof
            const verifyResponse = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/spotify/verify`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  spotifyUserId,
                  artistId,
                  eventId,
                  access_token,
                }),
              }
            );

            const verifyData = await verifyResponse.json();

            if (verifyData.success && verifyData.artistFound) {
              setSpotifyStatus({
                status: "success",
                message: "✅ You are a top fan! Eligible for priority access!",
                isEligible: true,
              });

              // Pass proof to parent
              onVerificationComplete(
                verifyData.proof,
                verifyData.publicSignals,
                "spotify"
              );
            } else {
              setSpotifyStatus({
                status: "error",
                message:
                  "❌ Not in your top artists. Priority access not available.",
                isEligible: false,
              });
            }
          }

          popup?.close();
        }
      };

      window.addEventListener("message", handleMessage);

      // Cleanup listener after 5 minutes
      setTimeout(() => {
        window.removeEventListener("message", handleMessage);
      }, 5 * 60 * 1000);
    } catch (error) {
      console.error("Spotify verification error:", error);
      setSpotifyStatus({
        status: "error",
        message: error instanceof Error ? error.message : "Verification failed",
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* GitHub Verification (Hackathons only) */}
      {isHackathon && (
        <Card className="bg-kaizen-dark-gray border-kaizen-gray/20 p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-kaizen-black rounded-2xl flex items-center justify-center flex-shrink-0">
              <Github className="w-6 h-6 text-kaizen-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-kaizen-white font-semibold mb-1">
                GitHub Web3 Contributor Verification
              </h3>
              <p className="text-kaizen-gray text-sm mb-4">
                Prove your Web3 contributions with zero-knowledge proof. No
                identity revealed on-chain.
              </p>

              {githubStatus.status === "idle" && (
                <Button
                  onClick={handleGitHubVerification}
                  className="bg-kaizen-yellow text-kaizen-black hover:bg-kaizen-yellow/90 font-semibold"
                >
                  <Github className="w-4 h-4 mr-2" />
                  Verify GitHub for Priority Access
                </Button>
              )}

              {githubStatus.status === "authenticating" && (
                <div className="flex items-center gap-2 text-kaizen-white">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">{githubStatus.message}</span>
                </div>
              )}

              {githubStatus.status === "verifying" && (
                <div className="flex items-center gap-2 text-kaizen-white">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">{githubStatus.message}</span>
                </div>
              )}

              {githubStatus.status === "success" && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="text-green-500 font-semibold text-sm">
                      {githubStatus.message}
                    </span>
                  </div>
                  {githubStatus.stats && (
                    <p className="text-kaizen-gray text-xs">
                      Web3 Repos: {githubStatus.stats.web3RepoCount} | Commits:{" "}
                      {githubStatus.stats.web3CommitCount}
                    </p>
                  )}
                </div>
              )}

              {githubStatus.status === "error" && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <X className="w-4 h-4 text-red-500" />
                    <span className="text-red-500 font-semibold text-sm">
                      {githubStatus.message}
                    </span>
                  </div>
                  {githubStatus.stats && (
                    <p className="text-kaizen-gray text-xs mb-3">
                      Web3 Repos: {githubStatus.stats.web3RepoCount} | Commits:{" "}
                      {githubStatus.stats.web3CommitCount}
                      <br />
                      Required: ≥{githubStatus.stats.threshold.repos} repos OR ≥
                      {githubStatus.stats.threshold.commits} commits
                    </p>
                  )}
                  <Button
                    onClick={handleGitHubVerification}
                    variant="outline"
                    size="sm"
                    className="border-kaizen-gray/30 text-kaizen-white hover:bg-kaizen-gray/20"
                  >
                    Try Again
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Spotify Verification (Concerts only) */}
      {isConcert && (
        <Card className="bg-kaizen-dark-gray border-kaizen-gray/20 p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-kaizen-black rounded-2xl flex items-center justify-center flex-shrink-0">
              <Music2 className="w-6 h-6 text-kaizen-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-kaizen-white font-semibold mb-1">
                Spotify Top Fan Verification
              </h3>
              <p className="text-kaizen-gray text-sm mb-4">
                Prove you're a top fan with zero-knowledge proof. Your listening
                history stays private.
              </p>

              {spotifyStatus.status === "idle" && (
                <Button
                  onClick={handleSpotifyVerification}
                  className="bg-green-500 text-white hover:bg-green-600 font-semibold"
                >
                  <Music2 className="w-4 h-4 mr-2" />
                  Verify Spotify for Priority Access
                </Button>
              )}

              {spotifyStatus.status === "authenticating" && (
                <div className="flex items-center gap-2 text-kaizen-white">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">{spotifyStatus.message}</span>
                </div>
              )}

              {spotifyStatus.status === "verifying" && (
                <div className="flex items-center gap-2 text-kaizen-white">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">{spotifyStatus.message}</span>
                </div>
              )}

              {spotifyStatus.status === "success" && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="text-green-500 font-semibold text-sm">
                      {spotifyStatus.message}
                    </span>
                  </div>
                </div>
              )}

              {spotifyStatus.status === "error" && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <X className="w-4 h-4 text-red-500" />
                    <span className="text-red-500 font-semibold text-sm">
                      {spotifyStatus.message}
                    </span>
                  </div>
                  <Button
                    onClick={handleSpotifyVerification}
                    variant="outline"
                    size="sm"
                    className="border-kaizen-gray/30 text-kaizen-white hover:bg-kaizen-gray/20"
                  >
                    Try Again
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Info Box */}
      {(isHackathon || isConcert) && (
        <Card className="bg-kaizen-black/50 border-kaizen-gray/20 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-kaizen-yellow flex-shrink-0 mt-0.5" />
            <div className="text-xs text-kaizen-gray">
              <p className="mb-2">
                <strong className="text-kaizen-white">
                  Zero-Knowledge Privacy:
                </strong>
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>Your identity is never revealed on-chain</li>
                <li>Only eligibility result is verified</li>
                <li>
                  {isHackathon
                    ? "GitHub data is hashed before proof generation"
                    : "Spotify listening history stays private"}
                </li>
                <li>OAuth tokens are short-lived and never stored</li>
              </ul>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
