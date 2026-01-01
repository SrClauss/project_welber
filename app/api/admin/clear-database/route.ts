import { NextResponse } from 'next/server';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
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
    
    // Get all documents from the viagens collection
    const viagensSnapshot = await firestore.collection('viagens').get();

    if (viagensSnapshot.empty) {
      return NextResponse.json({ 
        message: 'Banco de dados já está vazio',
        deleted: 0 
      }, { status: 200 });
    }

    // Delete all documents in a batch
    const batch = firestore.batch();
    let deleteCount = 0;

    viagensSnapshot.docs.forEach((doc: { ref: unknown }) => {
      batch.delete(doc.ref);
      deleteCount++;
    });

    await batch.commit();

    return NextResponse.json({
      message: `Banco de dados limpo com sucesso! ${deleteCount} viagem(ns) deletada(s).`,
      deleted: deleteCount,
    }, { status: 200 });
  } catch (err: unknown) {
    console.error('Error clearing database:', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ 
      error: `Erro ao limpar banco de dados: ${message}` 
    }, { status: 500 });
  }
}
