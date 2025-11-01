'use client';

import React from 'react';
import ZKPriorityTicket from '@/components/zk-priority-ticket';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Users, Sparkles } from 'lucide-react';

export default function HackathonEventPage() {
  // Example event data
  const event = {
    id: 'monad-blitz-delhi-2025',
    title: 'Monad Blitz Delhi 2025',
    description: 'Build the future of Web3 on Monad - the fastest EVM blockchain',
    date: new Date('2025-12-01').getTime() / 1000, // Unix timestamp
    location: 'Delhi, India',
    category: 'Hackathon',
    maxAttendees: 500,
    currentAttendees: 234,
    imageUrl: '/event-banner.jpg',
  };

  // Contract address (replace with your deployed address)
  const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_EVENT_TICKET_ADDRESS || '0x...';

  const handleTicketMinted = (tokenId: string) => {
    console.log('🎉 Priority ticket minted! Token ID:', tokenId);
    // Redirect to success page or update UI
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Event Header */}
        <div className="relative h-64 md:h-96 rounded-lg overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/20 to-purple-500/20" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-4">
              <Badge className="bg-yellow-500 text-black">
                <Sparkles className="h-4 w-4 mr-1" />
                Web3 Hackathon
              </Badge>
              <h1 className="text-4xl md:text-6xl font-bold">{event.title}</h1>
              <p className="text-xl text-zinc-400 max-w-2xl">
                {event.description}
              </p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Event Details */}
          <div className="md:col-span-2 space-y-6">
            {/* Info Cards */}
            <div className="grid md:grid-cols-3 gap-4">
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-8 w-8 text-yellow-500" />
                    <div>
                      <p className="text-sm text-zinc-500">Date</p>
                      <p className="font-semibold">
                        {new Date(event.date * 1000).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-8 w-8 text-yellow-500" />
                    <div>
                      <p className="text-sm text-zinc-500">Location</p>
                      <p className="font-semibold">{event.location}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Users className="h-8 w-8 text-yellow-500" />
                    <div>
                      <p className="text-sm text-zinc-500">Attendees</p>
                      <p className="font-semibold">
                        {event.currentAttendees}/{event.maxAttendees}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Event Description */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle>About This Event</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-zinc-400 leading-relaxed">
                  Join us for Monad Blitz Delhi - a 48-hour hackathon where developers,
                  designers, and entrepreneurs come together to build innovative Web3
                  applications on Monad, the fastest EVM blockchain.
                </p>
                <div className="space-y-2">
                  <h3 className="font-semibold text-yellow-500">What to Expect:</h3>
                  <ul className="list-disc list-inside space-y-1 text-zinc-400">
                    <li>$50,000 in prizes</li>
                    <li>Workshops with Monad core team</li>
                    <li>Networking with Web3 leaders</li>
                    <li>Free meals and swag</li>
                    <li>POAP NFTs for all participants</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-yellow-500">Requirements:</h3>
                  <ul className="list-disc list-inside space-y-1 text-zinc-400">
                    <li>Experience with Solidity or smart contracts</li>
                    <li>Laptop and development environment</li>
                    <li>Team of 2-4 people (or join at the event)</li>
                    <li>Enthusiasm for building on Monad!</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ZK Priority Ticket Sidebar */}
          <div className="space-y-6">
            <ZKPriorityTicket
              eventId={event.id}
              eventTitle={event.title}
              eventDate={event.date}
              contractAddress={CONTRACT_ADDRESS}
              onSuccess={handleTicketMinted}
            />

            {/* Standard Ticket Option */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-lg">Standard Ticket</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-zinc-400 mb-4">
                  Not a Web3 contributor yet? You can still attend!
                </p>
                <p className="text-2xl font-bold text-yellow-500 mb-4">0.05 ETH</p>
                <button className="w-full bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded-lg transition">
                  Mint Standard Ticket
                </button>
              </CardContent>
            </Card>

            {/* Info Box */}
            <Card className="bg-yellow-500/10 border-yellow-500/30">
              <CardContent className="pt-6">
                <h3 className="font-semibold text-yellow-500 mb-2">
                  Why Priority Tickets?
                </h3>
                <ul className="space-y-2 text-sm text-zinc-400">
                  <li>✅ 80% cheaper (0.01 vs 0.05 ETH)</li>
                  <li>✅ Early access to workshops</li>
                  <li>✅ Premium seating</li>
                  <li>✅ Exclusive mentor sessions</li>
                  <li>✅ Special swag package</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
