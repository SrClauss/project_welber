import { NextResponse } from "next/server";
import type { PreferenceBody } from "../../../../lib/mercadoPago";
import { createPreference, MercadoPagoError } from "../../../../lib/mercadoPago";

function isPreferenceBody(value: unknown): value is PreferenceBody {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as { items?: unknown };
  if (!Array.isArray(v.items) || v.items.length === 0) return false;
  // basic item shape check
  return v.items.every((it) => {
    return typeof it === 'object' && it !== null && 'title' in it && 'quantity' in it && 'unit_price' in it;
  });
}

export async function POST(req: Request) {
  try {
    const payload = await req.json().catch(() => ({}));

    if (!isPreferenceBody(payload)) {
      return NextResponse.json({ error: 'items é obrigatório e deve ser array não-vazio' }, { status: 400 });
    }

    const pref = await createPreference(payload);

    return NextResponse.json({ ok: true, preference: pref }, { status: 201 });
  } catch (err: unknown) {
    console.error('create-checkout error:', err);
    const status = err instanceof MercadoPagoError ? err.status ?? 500 : err instanceof Error ? 500 : 500;
    const message = err instanceof Error ? err.message : String(err);
    const details = err instanceof MercadoPagoError ? err.body : undefined;
    return NextResponse.json({ error: message, details }, { status });
  }
}
