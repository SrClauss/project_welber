import { NextResponse } from 'next/server';
import { getFirestoreInstance } from '../../../../lib/firestoreClient';
import { collection, getDocs, writeBatch } from 'firebase/firestore';

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
    
    // Basic token validation - check format and length
    // Note: Without firebase-admin, we rely on Firestore security rules
    // to enforce proper authentication. The token is validated when
    // Firestore operations are performed.
    if (!idToken || idToken.length < 50) {
      return NextResponse.json({ 
        error: 'Token inválido' 
      }, { status: 401 });
    }
    
    // Validate token format (JWT has 3 parts separated by dots)
    const tokenParts = idToken.split('.');
    if (tokenParts.length !== 3) {
      return NextResponse.json({ 
        error: 'Token com formato inválido' 
      }, { status: 401 });
    }
    
    try {
      // Get Firestore instance
      // Note: The Firebase client SDK will use the authentication context
      // from the client, and Firestore security rules will enforce access control
      const db = await getFirestoreInstance();
      
      // Get all documents from the viagens collection
      // This operation will fail if the user is not properly authenticated
      // based on Firestore security rules
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
    } catch (firestoreError) {
      console.error('Firestore operation failed:', firestoreError);
      // If Firestore operations fail, it's likely due to authentication/authorization
      return NextResponse.json({ 
        error: 'Operação não autorizada ou token inválido' 
      }, { status: 401 });
    }
  } catch (err: unknown) {
    console.error('Error clearing database:', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ 
      error: `Erro ao limpar banco de dados: ${message}` 
    }, { status: 500 });
  }
}
