import { NextResponse } from "next/server";
import { markPassagensPaidByExternalReference } from "../../../../lib/viagemService";

export const runtime = 'nodejs';

// Mercado Pago webhook handler
// - Accepts POST requests from Mercado Pago notification_url and other webhook triggers
// - Attempts to fetch payment details from Mercado Pago using MERCADO_PAGO_ACCESS_TOKEN
// - Extracts external_reference and marks passagens paid via markPassagensPaidByExternalReference

export async function POST(req: Request) {
  try {
    const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (!token) {
      console.error('MERCADO_PAGO_ACCESS_TOKEN not configured');
      return NextResponse.json({ error: 'server misconfigured' }, { status: 500 });
    }

    // Parse body and query params to obtain an identifier (payment id)
    let body: any = {};
    try { body = await req.json().catch(() => ({})); } catch (e) { body = {}; }

    const url = new URL(req.url);
    const qp = url.searchParams;

    // Mercado Pago sends several shapes. Try common locations for payment id:
    // - body.id
    // - body.data.id
    // - body.collection.id
    // - query param id or payment_id
    const id = body?.id || body?.data?.id || body?.collection?.id || qp.get('id') || qp.get('payment_id');

    if (!id) {
      console.warn('Webhook received without payment id', { body, query: Object.fromEntries(qp) });
      return NextResponse.json({ ok: true, message: 'no id to process' }, { status: 200 });
    }

    // Fetch payment details from Mercado Pago
    const paymentRes = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(String(id))}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!paymentRes.ok) {
      const text = await paymentRes.text().catch(() => '');
      console.error('Failed fetching payment from Mercado Pago', { id, status: paymentRes.status, text });
      return NextResponse.json({ ok: true, message: 'unable to fetch payment details' }, { status: 200 });
    }

    const payment = await paymentRes.json().catch(() => ({}));

    // Try to extract external_reference from payment or merchant order
    let externalReference: string | null = null;
    if (payment?.external_reference) externalReference = payment.external_reference;
    if (!externalReference && payment?.metadata?.external_reference) externalReference = payment.metadata.external_reference;

    // If merchant_order_id is present, fetch merchant order and try to read external_reference there
    if (!externalReference && payment?.merchant_order_id) {
      const moRes = await fetch(`https://api.mercadopago.com/merchant_orders/${encodeURIComponent(String(payment.merchant_order_id))}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (moRes.ok) {
        const mo = await moRes.json().catch(() => ({}));
        if (mo?.external_reference) externalReference = mo.external_reference;
        if (!externalReference && mo?.preference?.external_reference) externalReference = mo.preference.external_reference;
      }
    }

    // As a last resort, try common fields
    if (!externalReference && payment?.order?.external_reference) externalReference = payment.order.external_reference;

    const status = (payment?.status || payment?.collection_status || '').toString().toLowerCase();

    // If we found an externalReference and the payment is approved/paid, mark passagens
    let updated = 0;
    if (externalReference && (status === 'approved' || status === 'paid')) {
      try {
        updated = await markPassagensPaidByExternalReference(String(externalReference), { paymentId: String(id), by: 'mercadopago-webhook' });
        console.log(`Webhook: marked ${updated} passagens as paid for ${externalReference}`);
      } catch (err) {
        console.error('Error marking passagens paid:', err);
      }
    } else {
      console.log('Webhook received but no action required', { id, externalReference, status });
    }

    // Always respond 200/OK so Mercado Pago won't retry unnecessarily
    return NextResponse.json({ ok: true, processed: Boolean(externalReference), updated }, { status: 200 });
  } catch (err: unknown) {
    console.error('mercadopago webhook error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
