import { NextResponse } from 'next/server';
import { verifyUserToken } from '../../../../lib/firebaseServerService';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const FIRESTORE_PROJECT_ID = 'wf-transportes';

function parseValorFromDoc(doc: any): number | null {
  if (!doc || !doc.fields) return null;
  const v = doc.fields.valor_passagem;
  if (!v) return null;
  if (v.doubleValue !== undefined) return Number(v.doubleValue);
  if (v.integerValue !== undefined) return Number(v.integerValue);
  if (v.stringValue !== undefined) return Number(v.stringValue);
  return null;
}

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Não autorizado. Token ausente.' }, { status: 401 });
    }
    const idToken = authHeader.split('Bearer ')[1];
    await verifyUserToken(idToken);

    const res = await fetch(`https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT_ID}/databases/(default)/documents/config/global`, {
      headers: { 'Authorization': `Bearer ${idToken}` },
    });

    if (res.status === 404) {
      return NextResponse.json({ valor_passagem: null }, { status: 200 });
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Firestore GET failed: ${res.status} ${text}`);
    }

    const json = await res.json();
    const valor = parseValorFromDoc(json);
    return NextResponse.json({ valor_passagem: valor }, { status: 200 });
  } catch (err: unknown) {
    console.error('admin/valor-passagem GET error:', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Não autorizado. Token ausente.' }, { status: 401 });
    }
    const idToken = authHeader.split('Bearer ')[1];
    await verifyUserToken(idToken);

    const body = await req.json().catch(() => ({}));
    const valor = Number(body.valor_passagem);
    if (!Number.isFinite(valor) || valor <= 0) {
      return NextResponse.json({ error: 'valor_passagem inválido' }, { status: 400 });
    }

    const docBody = {
      fields: {
        valor_passagem: { doubleValue: String(valor) }
      }
    };

    const res = await fetch(`https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT_ID}/databases/(default)/documents/config/global`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(docBody)
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Firestore PUT failed: ${res.status} ${text}`);
    }

    return NextResponse.json({ ok: true, valor_passagem: valor }, { status: 200 });
  } catch (err: unknown) {
    console.error('admin/valor-passagem PUT error:', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
