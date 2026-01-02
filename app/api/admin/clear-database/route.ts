import { NextResponse } from 'next/server';
import { verifyUserToken, queryFirestoreCollection, batchDeleteDocuments } from '../../../../lib/firebaseServerService';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST() {
  return NextResponse.json({ error: 'Esta operação foi desativada. Use o endpoint de remoção de reserva específico.' }, { status: 410 });
}
