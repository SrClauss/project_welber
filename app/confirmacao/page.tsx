'use client';

import React, { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Box, Button, Container, Typography, Paper, Alert, CircularProgress } from '@mui/material';
import { CheckCircle } from 'lucide-react';

export default function ConfirmacaoPage() {
  const searchParams = useSearchParams();
  const externalRef = searchParams.get('external_reference');
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [autoAttempted, setAutoAttempted] = useState(false);

  const handleConfirmarPagamento = async () => {
    if (!externalRef) {
      setMessage({ type: 'error', text: 'Referência externa não encontrada na URL' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/viagens/confirmar-pagamento', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ external_reference: externalRef }),
      });

      const json = await res.json();

      if (!res.ok) {
        setMessage({ type: 'error', text: json?.error || 'Erro ao confirmar pagamento' });
      } else {
        setMessage({ type: 'success', text: `Pagamento confirmado! ${json.updated} passagem(ns) atualizada(s).` });
      }
    } catch (err) {
      setMessage({ type: 'error', text: String(err) });
    } finally {
      setLoading(false);
    }
  };

  // Auto-confirm when Mercado Pago redirects with approved status
  React.useEffect(() => {
    if (autoAttempted) return;
    const status = searchParams.get('status') || searchParams.get('collection_status');
    // treat 'approved' as successful
    if (status && status.toLowerCase() === 'approved' && externalRef) {
      setAutoAttempted(true);
      // call confirmation but don't block rendering
      (async () => {
        try {
          setLoading(true);
          const res = await fetch('/api/viagens/confirmar-pagamento', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ external_reference: externalRef }),
          });
          const json = await res.json().catch(() => ({}));
          if (res.ok) {
            setMessage({ type: 'success', text: `Pagamento confirmado automaticamente! ${json.updated || 0} passagem(ns) atualizada(s).` });
          } else {
            setMessage({ type: 'error', text: json?.error || 'Falha ao confirmar automaticamente' });
          }
        } catch (err) {
          setMessage({ type: 'error', text: String(err) });
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [searchParams, externalRef, autoAttempted]);

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <CheckCircle size={64} color="#4caf50" />
        </Box>
        
        <Typography variant="h4" gutterBottom>
          Pagamento Confirmado ✅
        </Typography>
        
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Obrigado pelo pagamento. Sua reserva está confirmada.
        </Typography>

        {externalRef && (
          <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mb: 3 }}>
            Referência: {externalRef}
          </Typography>
        )}

        {message && (
          <Alert severity={message.type} sx={{ mb: 3 }}>
            {message.text}
          </Alert>
        )}

        <Button
          variant="contained"
          color="primary"
          size="large"
          onClick={handleConfirmarPagamento}
          disabled={loading || !externalRef}
          startIcon={loading && <CircularProgress size={20} />}
          fullWidth
        >
          {loading ? 'Confirmando...' : 'Confirmar Pagamento Manualmente'}
        </Button>

        <Button
          variant="text"
          href="/"
          sx={{ mt: 2 }}
          fullWidth
        >
          Voltar para o início
        </Button>
      </Paper>
    </Container>
  );
}

