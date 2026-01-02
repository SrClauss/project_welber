import { NextResponse } from "next/server";
import { markPassagensPaidByExternalReference } from "../../../../lib/viagemService";

export async function PUT(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { external_reference } = body;

    if (!external_reference || typeof external_reference !== 'string') {
      return NextResponse.json({ error: 'external_reference é obrigatório' }, { status: 400 });
    }

    const updated = await markPassagensPaidByExternalReference(external_reference, {
      by: 'manual-confirmation',
    });

    if (updated === 0) {
      return NextResponse.json({ error: 'Nenhuma passagem encontrada ou já está paga' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, updated }, { status: 200 });
  } catch (err: unknown) {
    console.error('confirmar-pagamento error:', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
