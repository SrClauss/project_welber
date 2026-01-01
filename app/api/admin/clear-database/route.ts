import { NextResponse } from 'next/server';
import { verifyUserToken, queryFirestoreCollection, batchDeleteDocuments } from '../../../../lib/firebaseServerService';

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
    
    // Verify the user token
    try {
      await verifyUserToken(idToken);
    } catch (error) {
      console.error('Token verification failed:', error);
      return NextResponse.json({ 
        error: 'Token inválido ou expirado' 
      }, { status: 401 });
    }
    
    // Get all documents from the viagens collection
    const docs = await queryFirestoreCollection('viagens');

    if (docs.length === 0) {
      return NextResponse.json({ 
        message: 'Banco de dados já está vazio',
        deleted: 0 
      }, { status: 200 });
    }

    // Extract document paths
    const paths = docs.map((doc) => {
      const docTyped = doc as { name: string };
      // name format: "projects/{project}/databases/{database}/documents/viagens/{docId}"
      const parts = docTyped.name.split('/documents/');
      return parts[1]; // "viagens/{docId}"
    });

    // Delete all documents
    const deleteCount = await batchDeleteDocuments(paths);

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
