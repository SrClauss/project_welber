import { NextResponse } from 'next/server';

export const runtime = 'edge';
const FIRESTORE_PROJECT_ID = 'wf-transportes';
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '';

function parseValorFromDoc(doc: any): number | null {
  if (!doc || !doc.fields) return null;
  const v = doc.fields.valor_passagem;
  if (!v) return null;
  if (v.doubleValue !== undefined) return Number(v.doubleValue);
  if (v.integerValue !== undefined) return Number(v.integerValue);
  if (v.stringValue !== undefined) return Number(v.stringValue);
  return null;
}

export async function GET() {
  try {
    if (!FIREBASE_API_KEY) {
      // fallback to env var
      const fallback = Number(process.env.NEXT_PUBLIC_VALOR_PASSAGEM ?? 50);
      return NextResponse.json({ valor_passagem: fallback }, { status: 200 });
    }

    const res = await fetch(`https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT_ID}/databases/(default)/documents/config/global?key=${FIREBASE_API_KEY}`);

    if (!res.ok) {
      const fallback = Number(process.env.NEXT_PUBLIC_VALOR_PASSAGEM ?? 50);
      return NextResponse.json({ valor_passagem: fallback }, { status: 200 });
    }

    const json = await res.json();
    const valor = parseValorFromDoc(json);
    if (valor === null) {
      const fallback = Number(process.env.NEXT_PUBLIC_VALOR_PASSAGEM ?? 50);
      return NextResponse.json({ valor_passagem: fallback }, { status: 200 });
    }

    return NextResponse.json({ valor_passagem: valor }, { status: 200 });
  } catch (err: unknown) {
    console.error('public/valor-passagem GET error:', err);
    const fallback = Number(process.env.NEXT_PUBLIC_VALOR_PASSAGEM ?? 50);
    return NextResponse.json({ valor_passagem: fallback }, { status: 200 });
  }
}
