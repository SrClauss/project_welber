"use client";
import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function ReservaConfirmacaoPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : (Array.isArray(params.id) ? params.id[0] : '');
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError('ID da reserva ausente na URL');
      return;
    }
    let canceled = false;
    (async () => {
      try {
        const res = await fetch(`/api/reservas/${encodeURIComponent(id)}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? 'Erro ao buscar reserva');
        if (!canceled) setData(json);
      } catch (e: any) {
        if (!canceled) setError(String(e?.message || e));
      }
    })();
    return () => { canceled = true; };
  }, [id]);

  const onConfirm = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/reservas/${encodeURIComponent(id)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? 'Falha ao confirmar pagamento');
      setMessage(json?.updated && json.updated > 0 ? 'Pagamento confirmado com sucesso ✅' : (json?.message ?? 'OK'));
      // Optionally redirect to success page
      setTimeout(() => {
        router.push('/confirmacao');
      }, 1400);
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  if (error) return <main style={{ padding: 40 }}><h1>Erro</h1><p>{error}</p></main>;
  if (!data) return <main style={{ padding: 40 }}><h1>Carregando...</h1></main>;

  return (
    <main style={{ padding: 40 }}>
      <h1>Confirmar pagamento</h1>
      <p><strong>Viagem:</strong> {data.dataViagem} — {data.percurso}</p>
      <h2>Passagens</h2>
      <ul>
        {data.passagens.map((p: any, i: number) => (
          <li key={i} style={{ marginBottom: 8 }}>{p.cliente?.name} — CPF: {p.cliente?.cpfCnpj} — Pago: {p.paga ? 'Sim' : 'Não'}</li>
        ))}
      </ul>

      {message && <div style={{ marginTop: 12, color: 'green' }}>{message}</div>}
      <div style={{ marginTop: 16 }}>
        <button onClick={onConfirm} disabled={loading} style={{ padding: '8px 16px', background: '#0070f3', color: '#fff', border: 'none', borderRadius: 6 }}>
          {loading ? 'Confirmando...' : 'Confirmar pagamento'}
        </button>
      </div>
    </main>
  );
}
