Server-side endpoint to create a Mercado Pago checkout preference (server-side).

POST /api/mercadopago/create-checkout

Body (JSON):
- items: array required (title, quantity, unit_price)
- payer: optional
- external_reference: optional

Example:

curl -X POST http://localhost:3000/api/mercadopago/create-checkout \
  -H "Content-Type: application/json" \
  -d '{
    "items": [{"title":"Passagem","quantity":1,"unit_price":100.0}],
    "payer": {"email":"cliente@ex.com"},
    "external_reference": "passagem_123"
  }'

Notes:
- The endpoint decides sandbox vs production from the `NEXT_PUBLIC_ENVIROMENT` variable. If `NEXT_PUBLIC_ENVIROMENT` is `development` (or `dev`/`local`) the endpoint will use the **sandbox** token; otherwise it will use **production**.

  Configure in your `.env`:

  ```env
  # Sandbox token
  MERCADO_PAGO_ACCESS_TOKEN=APP_USR-... (sandbox)
  # Production token
  __MERCADO_PAGO_ACCESS_TOKEN=APP_USR-... (production)

  # Example environment flag used to default to sandbox in development
  NEXT_PUBLIC_ENVIROMENT=development
  ```

- Returns the Mercado Pago preference object and a convenience field `checkout_link` (either `sandbox_init_point` or `init_point`, depending on the resolved environment).

Defaults applied by the server when creating a preference:
- Only **card** is allowed by excluding common non-card methods (boleto, ATM, bank transfer, account money) and forcing `installments: 1`.
- Automatic redirect to confirmation pages is enabled via `auto_return: "approved"` and `back_urls` set to `<SITE_URL>/confirmacao`, `<SITE_URL>/pagamento-falhou`, `<SITE_URL>/pagamento-pendente`. Set `NEXT_PUBLIC_SITE_URL` or `SITE_URL` env var to override (defaults to `http://localhost:3000`).
- You can override any of these defaults by passing `payment_methods`, `back_urls`, or `auto_return` in the request body.
- Optionally set `MERCADO_PAGO_NOTIFICATION_URL` to receive webhooks (notification_url). For convenience you may also use `NEXT_PUBLIC_MERCADO_PAGO_NOTIFICATION_URL` (exposed to client-side) — the server will prefer `MERCADO_PAGO_NOTIFICATION_URL` but fall back to `NEXT_PUBLIC_MERCADO_PAGO_NOTIFICATION_URL` if the former is not present.

Webhook handler
---------------

This project exposes a webhook endpoint to process Mercado Pago payment notifications:

- POST /api/mercadopago/webhook

Behavior:
- The webhook attempts to extract a payment id from the incoming request (common locations: `body.id`, `body.data.id`, `body.collection.id`, or query params `id`/`payment_id`).
- It fetches the payment details from Mercado Pago (`GET /v1/payments/{id}`) using `MERCADO_PAGO_ACCESS_TOKEN`.
- If it can find an `external_reference` and the payment status is `approved`/`paid`, it calls `markPassagensPaidByExternalReference` to set `paga: true` for matching reservations.
- The endpoint always returns 200 OK for incoming notifications (unless misconfigured) so Mercado Pago does not retry unnecessarily.

How to configure in Mercado Pago (three options):
1) Per-preference: set `notification_url` when creating the preference (in `/api/mercadopago/create-checkout`) to point to your public webhook URL. Example value:

   https://your-domain.com/api/mercadopago/webhook

   Note: If you set `NEXT_PUBLIC_MERCADO_PAGO_NOTIFICATION_URL` in your `.env`, the server will automatically include that value as the `notification_url` when creating preferences (unless you override `notification_url` in the request body). This is convenient for staging or dev setups.

2) Account-level webhooks: In your Mercado Pago dashboard, go to **Account settings > Webhooks** and add the same URL. This will notify for payments across the account.

3) Server-side env: Set `MERCADO_PAGO_NOTIFICATION_URL` (preferred for production) to the webhook URL; this will be used by the server when creating preferences.

Testing the webhook locally
---------------------------

- Quick manual test (simulate Mercado Pago):

  curl -X POST http://localhost:3000/api/mercadopago/webhook -H "Content-Type: application/json" -d '{"id":"<payment_id>","topic":"payment"}'

  Replace `<payment_id>` with a known payment id (from sandbox) to let the handler fetch the payment and process it.

- End-to-end sandbox test:
  1. Set `NEXT_PUBLIC_MERCADO_PAGO_NOTIFICATION_URL` in your `.env` to your public tunnel URL (eg. `https://<ngrok-id>.ngrok.io/api/mercadopago/webhook`) or set `MERCADO_PAGO_NOTIFICATION_URL` for production.
  2. Create a preference in sandbox (use `NEXT_PUBLIC_ENVIROMENT=development` or create via API with sandbox token). The server will include the configured `notification_url` in the preference.
  3. Complete a sandbox payment (test card).
  4. Confirm that Mercado Pago sends a notification to your webhook URL. Tunnels like ngrok can be used to expose localhost to the public and receive webhooks.

Security and notes
------------------
- The handler fetches payment details from Mercado Pago (server-side) using your `MERCADO_PAGO_ACCESS_TOKEN` — this is the recommended verification method instead of trusting raw webhook payloads.
- Ensure your webhook URL is served over HTTPS in production and accessible publicly.
- If you prefer, set the `MERCADO_PAGO_NOTIFICATION_URL` env var (or include `notification_url` in the preference creation) to make Mercado Pago call this endpoint automatically.
