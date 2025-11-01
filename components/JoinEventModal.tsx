"use client";

import { useState, useEffect } from "react";
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
import { Music, Github, Loader2, CheckCircle, XCircle } from "lucide-react";

interface JoinEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventCategory: string;
  eventTitle: string;
  walletAddress: string;
  onSuccess: (data: { spotifyId?: string; githubUsername?: string }) => void;
}

export default function JoinEventModal({
  isOpen,
  onClose,
  eventId,
  eventCategory,
  eventTitle,
  walletAddress,
  onSuccess,
}: JoinEventModalProps) {
  const [spotifyId, setSpotifyId] = useState("");
  const [githubUsername, setGithubUsername] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const isLiveShow = eventCategory === "Live shows";
  const isWeb3Hackathon = eventCategory === "Web3 Hackathon";
  const needsExtraInfo = isLiveShow || isWeb3Hackathon;

  useEffect(() => {
    if (!isOpen) {
      // Reset form when modal closes
      setSpotifyId("");
      setGithubUsername("");
      setError("");
      setSuccess(false);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      // Validate required fields
      if (isLiveShow && !spotifyId.trim()) {
        throw new Error("Spotify ID is required for Live shows events");
      }
      if (isWeb3Hackathon && !githubUsername.trim()) {
        throw new Error("GitHub username is required for Web3 Hackathon events");
      }

      // Call backend API to join event
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/events/${eventId}/join`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-wallet-address": walletAddress,
          },
          body: JSON.stringify({
            spotifyId: isLiveShow ? spotifyId.trim() : undefined,
            githubUsername: isWeb3Hackathon ? githubUsername.trim() : undefined,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to join event");
      }

      console.log("✅ Successfully joined event:", data);
      setSuccess(true);

      // Pass the data back to parent
      setTimeout(() => {
        onSuccess({
          spotifyId: isLiveShow ? spotifyId.trim() : undefined,
          githubUsername: isWeb3Hackathon ? githubUsername.trim() : undefined,
        });
        onClose();
      }, 1500);
    } catch (err) {
      console.error("Join event error:", err);
      setError(err instanceof Error ? err.message : "Failed to join event");
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Join Event</DialogTitle>
          <DialogDescription>
            {needsExtraInfo
              ? `Complete your registration for ${eventTitle}`
              : `Confirm your registration for ${eventTitle}`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Show wallet address */}
            <div className="space-y-2">
              <Label>Connected Wallet</Label>
              <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono break-all">
                {walletAddress}
              </div>
            </div>

            {/* Spotify ID for Live shows */}
            {isLiveShow && (
              <div className="space-y-2">
                <Label
                  htmlFor="spotifyId"
                  className="flex items-center gap-2 text-base font-semibold"
                >
                  <Music className="w-5 h-5 text-green-600" />
                  Spotify User ID *
                </Label>
                <Input
                  id="spotifyId"
                  placeholder="e.g., yourspotifyusername"
                  value={spotifyId}
                  onChange={(e) => setSpotifyId(e.target.value)}
                  required
                  className="text-base"
                  autoFocus
                  disabled={isSubmitting || success}
                />
                <p className="text-xs text-muted-foreground">
                  💡 This helps verify you're a real fan for priority access.
                  Find your Spotify ID in your profile settings.
                </p>
              </div>
            )}

            {/* GitHub username for Web3 Hackathon */}
            {isWeb3Hackathon && (
              <div className="space-y-2">
                <Label
                  htmlFor="githubUsername"
                  className="flex items-center gap-2 text-base font-semibold"
                >
                  <Github className="w-5 h-5" />
                  GitHub Username *
                </Label>
                <Input
                  id="githubUsername"
                  placeholder="e.g., octocat"
                  value={githubUsername}
                  onChange={(e) => setGithubUsername(e.target.value)}
                  required
                  className="text-base"
                  autoFocus
                  disabled={isSubmitting || success}
                />
                <p className="text-xs text-muted-foreground">
                  💡 Your GitHub profile helps verify Web3 contributions for
                  priority tickets
                </p>
              </div>
            )}

            {/* No extra info needed */}
            {!needsExtraInfo && (
              <Alert>
                <AlertDescription>
                  Click "Join Event" to complete your registration
                </AlertDescription>
              </Alert>
            )}

            {/* Error display */}
            {error && (
              <Alert className="bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
                <XCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800 dark:text-red-200">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {/* Success display */}
            {success && (
              <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  Successfully joined the event! 🎉
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting || success}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || success}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Joining...
                </>
              ) : success ? (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Joined!
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
