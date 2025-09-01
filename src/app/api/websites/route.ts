import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const websites = await db.website.findMany({
      include: {
        scans: {
          include: {
            vulnerabilities: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1, // Get latest scan for each website
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(websites)
  } catch (error) {
    console.error('Failed to fetch websites:', error)
    return NextResponse.json({ error: 'Failed to fetch websites' }, { status: 500 })
  }
}
