import { NextResponse } from 'next/server';

// PIX endpoint removed. Return 410 Gone to indicate the resource is intentionally unavailable.
export async function POST() {
  return NextResponse.json({ error: 'PIX endpoint removed' }, { status: 410 });
}

export async function GET() {
  return NextResponse.json({ error: 'PIX endpoint removed' }, { status: 410 });
}
