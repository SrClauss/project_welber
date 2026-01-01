import { NextResponse } from 'next/server';
import { verifyUserToken, queryFirestoreCollection } from '../../../../lib/firebaseServerService';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Helper to convert Firestore document to plain object
interface FirestoreValue {
  stringValue?: string;
  integerValue?: string;
  booleanValue?: boolean;
  arrayValue?: { values: unknown[] };
  mapValue?: { fields: Record<string, FirestoreValue> };
}

function firestoreDocToObject(doc: { name: string; fields: Record<string, FirestoreValue> }): Record<string, unknown> {
  const id = doc.name.split('/').pop() || '';
  const data: Record<string, unknown> = { id };

  for (const [key, value] of Object.entries(doc.fields)) {
    if (value.stringValue !== undefined) {
      data[key] = value.stringValue;
    } else if (value.integerValue !== undefined) {
      data[key] = parseInt(value.integerValue);
    } else if (value.arrayValue) {
      data[key] = value.arrayValue.values?.map((v) => {
        const vTyped = v as { mapValue?: { fields: Record<string, FirestoreValue> } };
        if (vTyped.mapValue) {
          return firestoreMapToObject(vTyped.mapValue.fields);
        }
        return v;
      }) || [];
    } else if (value.mapValue) {
      data[key] = firestoreMapToObject(value.mapValue.fields);
    }
  }

  return data;
}

function firestoreMapToObject(fields: Record<string, FirestoreValue>): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value.stringValue !== undefined) {
      obj[key] = value.stringValue;
    } else if (value.integerValue !== undefined) {
      obj[key] = parseInt(value.integerValue);
    } else if (value.booleanValue !== undefined) {
      obj[key] = value.booleanValue;
    } else if (value.mapValue) {
      obj[key] = firestoreMapToObject(value.mapValue.fields);
    }
  }
  return obj;
}

export async function GET(request: Request) {
  try {
    // Authentication check: verify Firebase ID token from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ 
        error: 'Não autorizado. Token de autenticação ausente.' 
      }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    
    // Verify the user token
    try {
      await verifyUserToken(idToken);
    } catch (error) {
      console.error('Token verification failed:', error);
      return NextResponse.json({ 
        error: 'Token inválido ou expirado' 
      }, { status: 401 });
    }
    
    // Get all documents from the viagens collection, ordered by date descending
    const docs = await queryFirestoreCollection('viagens', 'dataViagem');
    const viagens = docs.map((doc: unknown) => firestoreDocToObject(doc as { name: string; fields: Record<string, FirestoreValue> }));

    return NextResponse.json({
      viagens,
      total: viagens.length,
    }, { status: 200 });
  } catch (err: unknown) {
    console.error('Error fetching viagens:', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ 
      error: `Erro ao buscar viagens: ${message}` 
    }, { status: 500 });
  }
}
