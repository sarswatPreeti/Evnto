"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Music, Github, AlertCircle, Loader2 } from "lucide-react";

interface JoinEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventCategory: string;
  eventTitle: string;
  walletAddress: string;
  eventId: string;
  onSuccess?: () => void;
}

export function JoinEventModal({
  isOpen,
  onClose,
  eventCategory,
  eventTitle,
  walletAddress,
  eventId,
  onSuccess,
}: JoinEventModalProps) {
  const [spotifyId, setSpotifyId] = useState("");
  const [githubUsername, setGithubUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const requiresSpotifyId = eventCategory === "Live shows";
  const requiresGithubUsername = eventCategory === "Web3 Hackathon";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate required fields
    if (requiresSpotifyId && !spotifyId.trim()) {
      setError("Spotify ID is required for Live shows events");
      return;
    }

    if (requiresGithubUsername && !githubUsername.trim()) {
      setError("GitHub username is required for Web3 Hackathon events");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/events/${eventId}/join`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-wallet-address": walletAddress,
          },
          body: JSON.stringify({
            spotifyId: requiresSpotifyId ? spotifyId.trim() : undefined,
            githubUsername: requiresGithubUsername
              ? githubUsername.trim()
              : undefined,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to join event");
      }

      // Success
      if (onSuccess) {
        onSuccess();
      }
      handleClose();
    } catch (err) {
      console.error("Join event error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to join event"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSpotifyId("");
    setGithubUsername("");
    setError("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Join {eventTitle}</DialogTitle>
          <DialogDescription>
            {requiresSpotifyId &&
              "Please provide your Spotify ID to join this Live show event"}
            {requiresGithubUsername &&
              "Please provide your GitHub username to join this Web3 Hackathon"}
            {!requiresSpotifyId &&
              !requiresGithubUsername &&
              "Confirm to join this event"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Spotify ID Input for Live shows */}
            {requiresSpotifyId && (
              <div className="space-y-2">
                <Label htmlFor="spotifyId" className="flex items-center gap-2">
                  <Music className="w-4 h-4 text-green-500" />
                  Spotify ID
                </Label>
                <Input
                  id="spotifyId"
                  placeholder="Enter your Spotify ID"
                  value={spotifyId}
                  onChange={(e) => setSpotifyId(e.target.value)}
                  disabled={loading}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Find your Spotify ID in your profile settings or Spotify URL
                </p>
              </div>
            )}

            {/* GitHub Username Input for Web3 Hackathon */}
            {requiresGithubUsername && (
              <div className="space-y-2">
                <Label
                  htmlFor="githubUsername"
                  className="flex items-center gap-2"
                >
                  <Github className="w-4 h-4" />
                  GitHub Username
                </Label>
                <Input
                  id="githubUsername"
                  placeholder="Enter your GitHub username"
                  value={githubUsername}
                  onChange={(e) => setGithubUsername(e.target.value)}
                  disabled={loading}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Your GitHub username (without @)
                </p>
              </div>
            )}

            {/* Wallet Address Display */}
            <div className="space-y-2">
              <Label>Connected Wallet</Label>
              <div className="p-2 bg-muted rounded-md">
                <code className="text-xs break-all">{walletAddress}</code>
              </div>
            </div>

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Joining...
                </>
              ) : (
                "Join Event"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
