import { NextResponse } from 'next/server';
import { getFirestoreInstance } from '../../../../lib/firestoreClient';
import { collection, getDocs, writeBatch } from 'firebase/firestore';
import { auth as firebaseAuthInstance } from '../../../../lib/firebaseAuth';

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
    
    // Verify the ID token using Firebase Auth
    if (!firebaseAuthInstance) {
      return NextResponse.json({ 
        error: 'Serviço de autenticação não configurado' 
      }, { status: 503 });
    }

    // Verify the token by attempting to get user info from Firebase
    // This validates the token is legitimate and not expired
    try {
      const { getAuth } = await import('firebase/auth');
      const auth = getAuth();
      
      // Check if there's a current user with a valid token
      if (!auth.currentUser) {
        return NextResponse.json({ 
          error: 'Token inválido ou expirado' 
        }, { status: 401 });
      }
      
      // Verify the token matches the current user
      const currentUserToken = await auth.currentUser.getIdToken();
      if (currentUserToken !== idToken) {
        return NextResponse.json({ 
          error: 'Token não corresponde ao usuário atual' 
        }, { status: 401 });
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      return NextResponse.json({ 
        error: 'Token inválido ou expirado' 
      }, { status: 401 });
    }
    
    // Get Firestore instance
    const db = await getFirestoreInstance();
    
    // Get all documents from the viagens collection
    const viagensCollection = collection(db, 'viagens');
    const viagensSnapshot = await getDocs(viagensCollection);

    if (viagensSnapshot.empty) {
      return NextResponse.json({ 
        message: 'Banco de dados já está vazio',
        deleted: 0 
      }, { status: 200 });
    }

    // Delete all documents in a batch
    const batch = writeBatch(db);
    let deleteCount = 0;

    viagensSnapshot.docs.forEach((docSnap) => {
      batch.delete(docSnap.ref);
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
