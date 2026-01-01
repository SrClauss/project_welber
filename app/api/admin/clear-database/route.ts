import { NextResponse } from 'next/server';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST() {
  try {
    // Dynamic import to avoid issues during build
    const { firestore } = await import('../../../../lib/firebaseAdmin');
    
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

    viagensSnapshot.docs.forEach((doc: any) => {
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
