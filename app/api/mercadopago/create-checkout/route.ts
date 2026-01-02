import { NextResponse } from "next/server";
import type { PreferenceBody } from "../../../../lib/mercadoPago";
import { createPreference, MercadoPagoError } from "../../../../lib/mercadoPago";

function isPreferenceBody(value: unknown): value is PreferenceBody {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as { items?: unknown };
  if (!Array.isArray(v.items) || v.items.length === 0) return false;
  // item shape and value checks
  return v.items.every((it) => {
    if (typeof it !== 'object' || it === null) return false;
    const item = it as Record<string, unknown>;
    if (!('title' in item) || !('quantity' in item) || !('unit_price' in item)) return false;
    const q = Number(item.quantity);
    const price = Number(item.unit_price);
    if (!Number.isFinite(q) || q < 1) return false;
    if (!Number.isFinite(price) || price <= 0) return false;
    return true;
  });
}

export async function POST(req: Request) {
  try {
    const payload = await req.json().catch(() => ({}));

    if (!isPreferenceBody(payload)) {
      return NextResponse.json({ error: 'items é obrigatório e deve ser array não-vazio' }, { status: 400 });
    }

    // Defaults: allow only card by excluding other non-card payment types,
    // force single installment and set automatic redirect URLs + notification.
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || 'http://localhost:3000';
    // Only set auto_return by default for HTTPS sites. Mercado Pago may reject
    // auto_return when back_urls use HTTP/localhost.
    const defaultAutoReturn = String(siteUrl).startsWith('https://') ? 'approved' : undefined;

    const defaults = {
      payment_methods: {
        excluded_payment_types: [
          { id: 'ticket' },        // boleto
          { id: 'atm' },           // ATM
       
            // transferências bancárias
        ],
        installments: 1
      },
      back_urls: {
        success: `${siteUrl}/confirmacao`,
        failure: `${siteUrl}/pagamento-falhou`,
        pending: `${siteUrl}/pagamento-pendente`
      },
      auto_return: defaultAutoReturn,
      // notification_url: prefer explicit server-side variable, fall back to NEXT_PUBLIC for convenience
      notification_url: process.env.MERCADO_PAGO_NOTIFICATION_URL || process.env.NEXT_PUBLIC_MERCADO_PAGO_NOTIFICATION_URL
    };

    const prefBody = {
      ...payload,
      payment_methods: {
        ...(defaults.payment_methods),
        ...(payload.payment_methods ?? {})
      },
      back_urls: {
        ...(defaults.back_urls),
        ...(payload.back_urls ?? {})
      },
      auto_return: payload.auto_return ?? defaults.auto_return,
      notification_url: payload.notification_url ?? defaults.notification_url
    };

    // Use MERCADO_PAGO_ACCESS_TOKEN for production
    const tokenOverride = process.env.MERCADO_PAGO_ACCESS_TOKEN;

    const pref = await createPreference(prefBody, tokenOverride);

    // Return a simplified checkout_link that the frontend can use directly.
    const checkoutLink = (pref && pref.init_point) || null;

    return NextResponse.json({ ok: true, preference: pref, checkout_link: checkoutLink }, { status: 201 });
  } catch (err: unknown) {
    console.error('create-checkout error:', err);
    const status = err instanceof MercadoPagoError ? err.status ?? 500 : err instanceof Error ? 500 : 500;
    const message = err instanceof Error ? err.message : String(err);
    const details = err instanceof MercadoPagoError ? err.body : undefined;
    return NextResponse.json({ error: message, details }, { status });
  }
}
