"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Music, CheckCircle2, Loader2, AlertCircle, Sparkles } from "lucide-react";
import { ethers } from "ethers";

interface SpotifyFanVerificationProps {
  eventId: number;
  artistId: string;
  artistName: string;
  eventTitle: string;
  eventDate: number;
  contractAddress: string;
  onSuccess?: () => void;
}

interface SpotifyArtist {
  id: string;
  name: string;
  images: Array<{ url: string }>;
}

export default function SpotifyFanVerification({
  eventId,
  artistId,
  artistName,
  eventTitle,
  eventDate,
  contractAddress,
  onSuccess
}: SpotifyFanVerificationProps) {
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [spotifyAccessToken, setSpotifyAccessToken] = useState<string>("");
  const [spotifyUserId, setSpotifyUserId] = useState<string>("");
  const [topArtists, setTopArtists] = useState<SpotifyArtist[]>([]);
  const [proof, setProof] = useState<any>(null);
  const [publicSignals, setPublicSignals] = useState<string[]>([]);
  const [txHash, setTxHash] = useState<string>("");

  // Check for Spotify callback tokens in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (accessToken) {
      setSpotifyAccessToken(accessToken);
      if (refreshToken) {
        localStorage.setItem("spotify_refresh_token", refreshToken);
      }
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      handleSpotifyAuthenticated(accessToken);
    }
  }, []);

  // Step 1: Spotify OAuth
  const handleSpotifyAuth = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/spotify/auth`);
      const data = await response.json();

      if (data.success) {
        // Store state for verification
        localStorage.setItem("spotify_state", data.state);
        // Redirect to Spotify auth
        window.location.href = data.authUrl;
      } else {
        setError("Failed to initiate Spotify authentication");
      }
    } catch (err) {
      console.error("Spotify auth error:", err);
      setError("Failed to connect to Spotify");
    } finally {
      setLoading(false);
    }
  };

  // After Spotify auth callback
  const handleSpotifyAuthenticated = async (accessToken: string) => {
    try {
      setLoading(true);
      setError("");

      // Get user profile
      const profileResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/spotify/profile?access_token=${accessToken}`
      );
      const profileData = await profileResponse.json();

      if (profileData.success) {
        setSpotifyUserId(profileData.profile.id);
        
        // Get top artists
        const artistsResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/spotify/top-artists?access_token=${accessToken}`
        );
        const artistsData = await artistsResponse.json();

        if (artistsData.success) {
          setTopArtists(artistsData.artists);
          
          // Check if target artist is in top artists
          const isTopFan = artistsData.artists.some((artist: SpotifyArtist) => artist.id === artistId);
          
          if (isTopFan) {
            setStep(2);
          } else {
            setError(`You need to be a top fan of ${artistName} to get priority tickets. Keep streaming!`);
          }
        } else {
          setError("Failed to fetch your top artists");
        }
      } else {
        setError("Failed to fetch Spotify profile");
      }
    } catch (err) {
      console.error("Spotify profile error:", err);
      setError("Failed to verify Spotify account");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Generate ZK Proof
  const handleGenerateProof = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/spotify/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          spotifyUserId,
          artistId,
          eventId,
          access_token: spotifyAccessToken,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setProof(data.proof);
        setPublicSignals(data.publicSignals);
        setStep(3);
      } else {
        setError(data.error || "Failed to generate proof");
      }
    } catch (err) {
      console.error("Proof generation error:", err);
      setError("Failed to generate zero-knowledge proof");
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Mint Priority Ticket
  const handleMintTicket = async () => {
    try {
      setLoading(true);
      setError("");

      if (!window.ethereum) {
        setError("Please install MetaMask to continue");
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Contract ABI for mintPriorityTicketConcert
      const contractABI = [
        "function mintPriorityTicketConcert(tuple(uint256[2] a, uint256[2][2] b, uint256[2] c) proof, uint256[3] publicSignals, uint256 eventId, string eventTitle, string artistName, uint256 eventDate) external payable returns (uint256)"
      ];

      const contract = new ethers.Contract(contractAddress, contractABI, signer);

      // Format proof for contract
      const proofForContract = {
        a: proof.pi_a,
        b: proof.pi_b,
        c: proof.pi_c,
      };

      // Call contract
      const tx = await contract.mintPriorityTicketConcert(
        proofForContract,
        publicSignals,
        eventId,
        eventTitle,
        artistName,
        eventDate,
        { value: 0 } // Free priority ticket
      );

      setTxHash(tx.hash);
      await tx.wait();

      setStep(4);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error("Minting error:", err);
      if (err.message?.includes("Proof already used")) {
        setError("You have already claimed a priority ticket for this event");
      } else if (err.message?.includes("Invalid proof")) {
        setError("Verification failed. Please try again.");
      } else {
        setError("Failed to mint priority ticket");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Music className="w-6 h-6" />
          Spotify Fan Priority Tickets
        </CardTitle>
        <CardDescription>
          Prove you're a top fan of {artistName} to get priority access using zero-knowledge proofs
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Progress Steps */}
        <div className="flex items-center justify-between">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  s <= step
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {s < step ? <CheckCircle2 className="w-5 h-5" /> : s}
              </div>
              {s < 4 && <div className="w-16 h-0.5 bg-muted mx-2" />}
            </div>
          ))}
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Step 1: Spotify Auth */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <Music className="w-16 h-16 mx-auto text-green-500" />
              <h3 className="text-xl font-semibold">Connect Your Spotify</h3>
              <p className="text-muted-foreground">
                We'll verify you're a top listener of {artistName} without revealing your listening history
              </p>
            </div>
            <Button
              onClick={handleSpotifyAuth}
              disabled={loading}
              className="w-full bg-green-500 hover:bg-green-600"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Music className="w-4 h-4 mr-2" />
                  Connect with Spotify
                </>
              )}
            </Button>
          </div>
        )}

        {/* Step 2: Generate Proof */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <Sparkles className="w-16 h-16 mx-auto text-purple-500" />
              <h3 className="text-xl font-semibold">You're a Top Fan!</h3>
              <p className="text-muted-foreground">
                {artistName} is in your top 10 artists. Let's create your proof.
              </p>
            </div>

            {/* Top Artists Preview */}
            <div className="grid grid-cols-5 gap-2">
              {topArtists.slice(0, 5).map((artist) => (
                <div key={artist.id} className="text-center">
                  {artist.images[0] && (
                    <img
                      src={artist.images[0].url}
                      alt={artist.name}
                      className="w-full aspect-square rounded-lg object-cover mb-1"
                    />
                  )}
                  <p className="text-xs truncate">{artist.name}</p>
                </div>
              ))}
            </div>

            <Button onClick={handleGenerateProof} disabled={loading} className="w-full" size="lg">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating Proof...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate ZK Proof
                </>
              )}
            </Button>
          </div>
        )}

        {/* Step 3: Mint Ticket */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <CheckCircle2 className="w-16 h-16 mx-auto text-green-500" />
              <h3 className="text-xl font-semibold">Proof Generated!</h3>
              <p className="text-muted-foreground">
                Your proof is ready. Mint your priority ticket now.
              </p>
            </div>

            <Alert>
              <AlertDescription>
                <strong>What happens next:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Your proof will be verified on-chain</li>
                  <li>A priority ticket NFT will be minted to your wallet</li>
                  <li>Your listening history remains private</li>
                  <li>Transaction is free (only gas fees)</li>
                </ul>
              </AlertDescription>
            </Alert>

            <Button onClick={handleMintTicket} disabled={loading} className="w-full" size="lg">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Minting Ticket...
                </>
              ) : (
                "Mint Priority Ticket"
              )}
            </Button>
          </div>
        )}

        {/* Step 4: Success */}
        {step === 4 && (
          <div className="space-y-4 text-center">
            <CheckCircle2 className="w-20 h-20 mx-auto text-green-500" />
            <h3 className="text-2xl font-bold">Priority Ticket Minted!</h3>
            <p className="text-muted-foreground">
              Your priority ticket NFT has been successfully minted to your wallet
            </p>
            {txHash && (
              <a
                href={`https://explorer.monad.xyz/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline text-sm"
              >
                View transaction →
              </a>
            )}
          </div>
        )}

        {/* Info Box */}
        <div className="bg-muted p-4 rounded-lg text-sm space-y-2">
          <h4 className="font-semibold">🔒 Privacy Guaranteed</h4>
          <p className="text-muted-foreground">
            This system uses zero-knowledge proofs to verify you're a top fan without revealing:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>Your Spotify account ID</li>
            <li>Your complete listening history</li>
            <li>Your other top artists</li>
            <li>Any personal information</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
