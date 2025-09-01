import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const scan = await db.scan.findUnique({
      where: { id: params.id },
      include: {
        website: true,
        vulnerabilities: true,
      },
    })

    if (!scan) {
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 })
    }

    return NextResponse.json(scan)
  } catch (error) {
    console.error('Failed to fetch scan:', error)
    return NextResponse.json({ error: 'Failed to fetch scan' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { status, errorMessage, results } = await request.json()

    const scan = await db.scan.update({
      where: { id: params.id },
      data: {
        status,
        errorMessage,
        results,
        ...(status === 'COMPLETED' && { completedAt: new Date() }),
        ...(status === 'RUNNING' && { startedAt: new Date() }),
      },
      include: {
        website: true,
        vulnerabilities: true,
      },
    })

    return NextResponse.json(scan)
  } catch (error) {
    console.error('Failed to update scan:', error)
    return NextResponse.json({ error: 'Failed to update scan' }, { status: 500 })
  }
}
