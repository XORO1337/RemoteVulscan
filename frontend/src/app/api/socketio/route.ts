import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  // This route is just for the socket.io connection
  // The actual socket.io handling is done in server.ts
  return new Response('Socket.IO endpoint', { status: 200 })
}

export async function POST(request: NextRequest) {
  // This route is just for the socket.io connection
  // The actual socket.io handling is done in server.ts
  return new Response('Socket.IO endpoint', { status: 200 })
}
