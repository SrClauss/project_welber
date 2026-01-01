import { NextResponse } from 'next/server';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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
    
    // Dynamic import to avoid issues during build
    const { firestore } = await import('../../../../lib/firebaseAdmin');
    const admin = await import('../../../../lib/firebaseAdmin').then(m => m.default);
    
    // Verify the ID token
    if (!admin || !admin.auth) {
      return NextResponse.json({ 
        error: 'Serviço de autenticação não configurado' 
      }, { status: 503 });
    }

    try {
      await admin.auth().verifyIdToken(idToken);
    } catch (error) {
      console.error('Token verification failed:', error);
      return NextResponse.json({ 
        error: 'Token inválido ou expirado' 
      }, { status: 401 });
    }
    
    // Get all documents from the viagens collection, ordered by date descending
    const viagensSnapshot = await firestore
      .collection('viagens')
      .orderBy('dataViagem', 'desc')
      .get();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const viagens = viagensSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));

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
