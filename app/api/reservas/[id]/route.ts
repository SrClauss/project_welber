import { NextResponse } from 'next/server';
import { findViagemByExternalReference, markPassagensPaidByExternalReference, deletePassagensByExternalReference } from '../../../../lib/viagemService';

export async function GET(req: Request, context: any) {
  const params = await Promise.resolve(context?.params);
  const id = typeof params?.id === 'string' ? params.id : String(params?.id ?? '');
  if (!id) return NextResponse.json({ error: 'ID da reserva ausente' }, { status: 400 });
  try {
    const found = await findViagemByExternalReference(id);
    if (!found) return NextResponse.json({ error: 'Reserva não encontrada' }, { status: 404 });

    const matched = found.viagem.passagens.filter(p => p.externalReference === id);
    return NextResponse.json({ ok: true, viagemId: found.viagem.id, dataViagem: found.viagem.dataViagem, percurso: found.viagem.percurso, passagens: matched });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request, context: any) {
  const params = await Promise.resolve(context?.params);
  const id = typeof params?.id === 'string' ? params.id : String(params?.id ?? '');
  if (!id) return NextResponse.json({ error: 'ID da reserva ausente' }, { status: 400 });
  try {
    const body = await req.json().catch(() => ({}));
    const paymentId = (body && body.paymentId) || undefined;

    const updated = await markPassagensPaidByExternalReference(id, { paymentId });
    if (updated === 0) {
      // Could be already paid or not found
      // Check if exists
      const found = await findViagemByExternalReference(id);
      if (!found) return NextResponse.json({ error: 'Reserva não encontrada' }, { status: 404 });
      // if exists but no update, it might already be paid
      return NextResponse.json({ ok: true, updated: 0, message: 'Nenhuma passagem atualizada (já estava paga?)' });
    }

    return NextResponse.json({ ok: true, updated });
  } catch (err) {
    console.error('confirm-payment error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: Request, context: any) {
  const params = await Promise.resolve(context?.params);
  const id = typeof params?.id === 'string' ? params.id : String(params?.id ?? '');
  if (!id) return NextResponse.json({ error: 'ID da reserva ausente' }, { status: 400 });

  // Require admin auth to delete reservation(s)
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Não autorizado. Token de autenticação ausente.' }, { status: 401 });
  }
  const idToken = authHeader.split('Bearer ')[1];

  try {
    const { verifyUserToken } = await import('../../../../lib/firebaseServerService');
    await verifyUserToken(idToken);
  } catch (err) {
    console.error('Token verification failed:', err);
    return NextResponse.json({ error: 'Token inválido ou expirado' }, { status: 401 });
  }

  try {
    const result = await deletePassagensByExternalReference(id);
    if (result.deleted === 0) {
      return NextResponse.json({ ok: true, deleted: 0, message: 'Nenhuma passagem encontrada com essa referência' }, { status: 200 });
    }
    return NextResponse.json({ ok: true, deleted: result.deleted, viagensDeleted: result.viagensDeleted }, { status: 200 });
  } catch (err) {
    console.error('delete reservation error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
