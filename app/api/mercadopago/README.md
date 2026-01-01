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
- The endpoint uses the environment variable `MERCADO_PAGO_ACCESS_TOKEN` to authenticate with Mercado Pago's API.
- Returns the Mercado Pago preference object (including `sandbox_init_point` when using sandbox token).
