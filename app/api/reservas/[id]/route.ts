import { NextResponse } from 'next/server';
import { findViagemByExternalReference, markPassagensPaidByExternalReference } from '../../../../lib/viagemService';

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
