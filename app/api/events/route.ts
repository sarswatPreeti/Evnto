import { NextResponse } from "next/server";
import { Client } from "pg";

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

export async function GET() {
  try {
    // Check if DATABASE_URL is available
    if (!process.env.DATABASE_URL) {
      // Return mock data if no database is configured
      return NextResponse.json(
        [
          {
            _id: "1",
            title: "Sample Event",
            date: new Date().toISOString(),
            location: "Sample Location",
            price: "50",
            category: "Live shows",
            imageUrl: "/placeholder.svg",
          },
        ],
        { status: 200 }
      );
    }

    try {
      await client.connect();
    } catch (err) {
      // Client may already be connected, ignore error
    }
    const result = await client.query("SELECT * FROM events ORDER BY id DESC");
    return NextResponse.json(result.rows, { status: 200 });
  } catch (err) {
    console.error("Database error:", err);
    // Return empty array on error instead of failing completely
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    // Basic validation
    if (!body.title || !body.subtitle || !body.time || !body.location) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Connect to PostgreSQL if not already connected
    try {
      await client.connect();
    } catch (err) {
      // Client may already be connected, ignore error
    }

    // Insert event into database
    const query = `INSERT INTO events (title, subtitle, time, location, image) VALUES ($1, $2, $3, $4, $5) RETURNING *`;
    const values = [
      body.title,
      body.subtitle,
      body.time,
      body.location,
      body.image || null,
    ];
    const result = await client.query(query, values);
    const event = result.rows[0];

    return NextResponse.json({ success: true, event }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
