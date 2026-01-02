export interface PreferenceItem {
  title: string;
  quantity: number;
  unit_price: number;
  currency_id?: string;
  description?: string;
}

export interface PreferenceBody {
  items: PreferenceItem[];
  payer?: Record<string, unknown>;
  external_reference?: string;
  [k: string]: unknown;
}

export type PreferenceResponse = Record<string, unknown>;

export class MercadoPagoError extends Error {
  status?: number;
  body?: unknown;
  constructor(message: string, status?: number, body?: unknown) {
    super(message);
    this.name = 'MercadoPagoError';
    this.status = status;
    this.body = body;
  }
}

export async function createPreference(body: PreferenceBody, tokenOverride?: string): Promise<PreferenceResponse> {
  const token = tokenOverride || process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!token) throw new Error('MERCADO_PAGO_ACCESS_TOKEN não definido no ambiente');

  // simple validation
  if (!Array.isArray(body.items) || body.items.length === 0) {
    throw new MercadoPagoError('items é obrigatório e deve ser um array não-vazio', 400);
  }

  const url = 'https://api.mercadopago.com/checkout/preferences';
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => ({})) as unknown;
  if (!res.ok) {
    throw new MercadoPagoError('Erro ao criar preferência no Mercado Pago', res.status, json);
  }

  return json as PreferenceResponse;
}

