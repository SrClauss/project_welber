
'use client';

import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  TextField,
  MenuItem,
  Stack,
  Chip,
  Divider,
  ThemeProvider,
  CssBaseline,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import {
  Wifi,
  Armchair,
  Clock,
  ShieldCheck,
  ChevronRight,
  MessageCircle,
  User,
} from 'lucide-react';
import theme from './theme';

const LogoWF = () => (
  <Box sx={{ width: 160, mb: 2 }}>
    <svg viewBox="0 0 800 300" xmlns="http://www.w3.org/2000/svg">
      <path d="M50 250 Q100 200 250 50 L230 45 Q80 190 50 250 Z" fill="#D4AF37" />
      <text x="310" y="130" fontWeight="bold" fontSize="100" fill="#1a1a1a">WF</text>
      <text x="170" y="220" fontSize="35" letterSpacing="15" fill="#444">TRANSPORTES</text>
    </svg>
  </Box>
);

function getDisponibilidade() {
  const dias: { label: string; value: string; iso: string }[] = [];
  const hoje = new Date();
  let count = 0;
  let i = 1;
  while (count < 5) {
    const data = new Date(hoje);
    data.setDate(hoje.getDate() + i);
    if (data.getDay() !== 0 && data.getDay() !== 6) {
      dias.push({
        label: data.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }),
        value: data.toLocaleDateString('pt-BR'),
        iso: data.toISOString().slice(0, 10),
      });
      count++;
    }
    i++;
  }
  return dias;
}

export default function Home() {
  const [reserva, setReserva] = useState({ origem: '', dataIso: '', dataLabel: '', passageiros: 1 });
  // cliente agora fica no modal (modalCliente) — página não exibe nome/email/CPF
  const [loading, setLoading] = useState(false);
  const [snack, setSnack] = useState<{ open: boolean; severity?: 'success' | 'error' | 'info'; message?: string }>({ open: false });
  const [infoOpen, setInfoOpen] = useState(false);

  // modal state for checkout personal info
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [modalCliente, setModalCliente] = useState({ name: '', cpfCnpj: '', email: '' });

  const datasDisponiveis = getDisponibilidade();

  const canSubmit = () => {
    // main page only requires route/date/passengers; personal info will be collected in modal
    return Boolean(reserva.origem && reserva.dataIso && reserva.passageiros > 0 && !loading);
  };

  // submit reservations given a client object (name, cpfCnpj, email)
  async function submitReservations(client: { name: string; cpfCnpj: string; email?: string }) {
    if (!client?.name || !client?.cpfCnpj) {
      setSnack({ open: true, severity: 'error', message: 'Nome e CPF/CNPJ são obrigatórios.' });
      return;
    }

    setCheckoutOpen(false);
    setLoading(true);
    const results: { ok: boolean; detail?: string }[] = [];

    for (let i = 0; i < reserva.passageiros; i++) {
      const externalReference = `resv_${Date.now()}_${i}`;
      const passagem = {
        cliente: {
          name: reserva.passageiros > 1 ? `${client.name} (${i + 1}/${reserva.passageiros})` : client.name,
          cpfCnpj: client.cpfCnpj,
          email: client.email,
        },
        paga: false,
        externalReference,
      };

      const body = {
        viagem: { dataViagem: reserva.dataIso, percurso: reserva.origem === 'sjp-the' ? 'São João dos Patos - Teresina' : 'Teresina - São João dos Patos' },
        passagem,
      };

      try {
        const res = await fetch('/api/viagens/passagens', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const json = await res.json();
        if (!res.ok) {
          results.push({ ok: false, detail: json?.error ?? JSON.stringify(json) });
        } else {
          results.push({ ok: true });
        }
      } catch (e) {
        results.push({ ok: false, detail: String(e) });
      }
    }

    setLoading(false);
    const failed = results.filter((r) => !r.ok);
    if (failed.length === 0) {
      setSnack({ open: true, severity: 'success', message: `Reserva(s) criada(s): ${reserva.passageiros}` });
      setReserva({ origem: '', dataIso: '', dataLabel: '', passageiros: 1 });
    } else {
      setSnack({ open: true, severity: 'error', message: `Falha em ${failed.length} reserva(s): ${failed.map(f => f.detail).join('; ')}` });
    }


  }





  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', bgcolor: '#f0f2f5' }}>
        {/* Banner Hero */}
        <Box sx={{ position: 'relative', pt: 4, pb: { xs: 15, md: 22 }, backgroundImage: 'linear-gradient(rgba(255,255,255,0.1), rgba(240,242,245,1)), url("/image_b0e4d2.png")', backgroundSize: 'cover', backgroundPosition: 'center 40%', backgroundAttachment: 'fixed' }}>
          <Container maxWidth="lg">
            <Stack direction="row" justifyContent="center" sx={{ mb: { xs: 4, md: 8 } }}>
              <LogoWF />
            </Stack>

            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
              <Box sx={{ flex: 1, maxWidth: { md: '60%' }, textAlign: { xs: 'center', md: 'left' } }}>
                <Box sx={{ 
                  p: { xs: 2, md: 0 }, 
                  borderRadius: '24px',
                  background: { xs: 'rgba(255,255,255,0.4)', md: 'transparent' },
                  backdropFilter: { xs: 'blur(10px)', md: 'none' },
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center'
                }}>
                  <Typography variant="h1" sx={{ fontSize: { xs: '2.5rem', md: '4.2rem' }, color: '#1a1a1a', mb: 2 }}>
                    Sua viagem VIP <br />
                    <span style={{ color: '#D4AF37' }}>e personalizada</span>
                  </Typography>
                  <Typography variant="h6" sx={{ color: '#333', mb: 4, fontWeight: 400, maxWidth: 550, lineHeight: 1.6, mx: { xs: 'auto', md: 0 } }}>
                    Conectando São João dos Patos a Teresina com o conforto e a segurança que você merece.
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ justifyContent: { xs: 'center', md: 'flex-start' } }}>
                    <Chip icon={<Wifi size={16} />} label="Starlink 5G" sx={{ bgcolor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', fontWeight: 600 }} />
                    <Chip icon={<User size={16} />} label="Atendimento Direto" sx={{ bgcolor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', fontWeight: 600 }} />
                  </Stack>
                </Box>
              </Box>

              {/* Card de Horários Glassmórfico */}
              <Box sx={{ width: { xs: '100%', md: '38%' }, display: 'flex', justifyContent: 'center' }}>
                <Paper sx={{ 
                  p: 4, 
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.4)', 
                  backdropFilter: 'blur(30px)',
                  boxShadow: '0 25px 50px rgba(0,0,0,0.1)',
                  border: '1px solid rgba(255,255,255,0.8)'
                }}>
                  <Typography variant="overline" sx={{ color: '#D4AF37', fontWeight: 900, mb: 3, display: 'block', letterSpacing: 2, textAlign: 'center' }}>
                    HORÁRIOS DE VIAGEM
                  </Typography>
                  <Stack spacing={3}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography variant="caption" sx={{ fontWeight: 800, color: '#555', display: 'block' }}>SJP → Teresina</Typography>
                        <Typography variant="h4" sx={{ fontWeight: 900, color: '#1a1a1a' }}>04:30h</Typography>
                      </Box>
                      <ChevronRight size={28} color="#D4AF37" strokeWidth={3} />
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="caption" sx={{ fontWeight: 800, color: '#555', display: 'block' }}>Teresina → SJP</Typography>
                        <Typography variant="h4" sx={{ fontWeight: 900, color: '#1a1a1a' }}>14:00h</Typography>
                      </Box>
                    </Box>
                    <Divider sx={{ borderColor: 'rgba(0,0,0,0.1)' }} />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
                      <Clock size={16} color="#D4AF37" />
                      <Typography variant="subtitle2" sx={{ color: '#444', fontWeight: 700 }}>
                        Segunda a Sexta-feira
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>
              </Box>
            </Box>
          </Container>
        </Box>

        {/* Reserva */}
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 10, display: 'flex', justifyContent: 'center' }}>
          <Box sx={{ width: '100%', maxWidth: 1100, display: 'flex', gap: 6, flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', py: { xs: 2, md: 6 } }}>

            {/* Reservation card (fills container width on large screens) */}
            <Paper elevation={0} sx={{ width: '100%', p: { xs: 3, md: 6 }, borderRadius: 4, background: 'rgba(255,255,255,0.95)', boxShadow: '0 40px 100px rgba(0,0,0,0.06)' }}>
              <Stack spacing={2} sx={{ alignItems: 'stretch' }}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="caption" sx={{ color: '#999', fontWeight: 800, letterSpacing: 1 }}>SELECIONE A ROTA</Typography>
                  <Typography variant="caption" sx={{ color: '#999', fontWeight: 800, letterSpacing: 1 }}>DATA DA VIAGEM</Typography>
                </Stack>

                <TextField select fullWidth value={reserva.origem} onChange={(e) => setReserva({ ...reserva, origem: e.target.value })} variant="standard">
                  <MenuItem value="sjp-the">📍 São João dos Patos → Teresina</MenuItem>
                  <MenuItem value="the-sjp">📍 Teresina → São João dos Patos</MenuItem>
                </TextField>

                <TextField select fullWidth value={reserva.dataIso} onChange={(e) => {
                  const selected = datasDisponiveis.find(d => d.iso === e.target.value);
                  setReserva({ ...reserva, dataIso: e.target.value, dataLabel: selected?.label ?? '' });
                }} variant="standard">
                  {datasDisponiveis.map((dia, idx) => (
                    <MenuItem key={idx} value={dia.iso}>{dia.label}</MenuItem>
                  ))}
                </TextField>

                <TextField type="number" label="Passageiros" value={reserva.passageiros} onChange={(e) => setReserva({ ...reserva, passageiros: Math.max(1, Number(e.target.value || 1)) })} variant="standard" />

                <Stack direction="row" spacing={2}>
                  <Button fullWidth variant="outlined" size="large" onClick={() => setInfoOpen(true)} sx={{ py: 2.2, fontSize: '1.1rem' }}>
                    Informações do Checkout
                  </Button>
                  <Button fullWidth variant="contained" size="large" startIcon={<MessageCircle />} onClick={() => setCheckoutOpen(true)} disabled={!canSubmit()} sx={{ py: 2.2, bgcolor: '#D4AF37', color: '#fff', fontSize: '1.1rem', boxShadow: '0 15px 30px rgba(212, 175, 55, 0.3)', '&:hover': { bgcolor: '#b8962d' } }}>
                    Garantir minha vaga
                  </Button>
                </Stack>

                <Typography variant="caption" sx={{ color: '#999', mt: 1 }}>Nome, CPF/CNPJ e email serão pedidos no próximo passo (modal).</Typography>
              </Stack>
            </Paper>

            {/* Features section - below reservation card */}
            <Box sx={{ width: '100%' }}>
              <Paper sx={{ p: 3, borderRadius: 4 }} elevation={0}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, justifyContent: 'center' }}>
                  {[
                    { icon: <Wifi size={28} />, title: 'Starlink 5G', desc: 'Navegue em alta velocidade durante todo o percurso.' },
                    { icon: <Armchair size={28} />, title: 'Conforto VIP', desc: 'Poltronas macias e espaço planejado para você.' },
                    { icon: <Clock size={28} />, title: 'Pontualidade', desc: 'Compromisso com o horário para sua conveniência.' },
                    { icon: <ShieldCheck size={28} />, title: 'Segurança', desc: 'Veículo revisado e direção profissional.' },
                  ].map((item, i) => (
                    <Box key={i} sx={{ width: { xs: '100%', sm: '45%', md: '22%' }, textAlign: 'center', p: 3, borderRadius: '24px', transition: '0.3s', '&:hover': { bgcolor: 'rgba(255,255,255,0.5)', transform: 'translateY(-5px)' } }}>
                      <Box sx={{ color: '#D4AF37', mb: 2, mx: 'auto', width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '20px', background: '#fff', boxShadow: '0 10px 20px rgba(0,0,0,0.05)' }}>
                        {item.icon}
                        </Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1, color: '#1a1a1a' }}>{item.title}</Typography>
                        <Typography variant="body2" sx={{ color: '#666', lineHeight: 1.6 }}>{item.desc}</Typography>
                      </Box>
                  ))}
                </Box>
              </Paper>
            </Box>

          </Box>
        </Container>

        {/* Footer */}
        <Box sx={{ py: 8, textAlign: 'center', bgcolor: '#fff', borderTop: '1px solid #eee' }}>
          <Typography variant="body2" sx={{ color: '#888', fontWeight: 600 }}>
            W F Transportes &copy; 2025
          </Typography>
          <Typography variant="caption" sx={{ color: '#bbb' }}>
            São João dos Patos ⇄ Teresina
          </Typography>
        </Box>

        {/* Modal com informações de checkout */}
        <Dialog open={infoOpen} onClose={() => setInfoOpen(false)}>
          <DialogTitle>Informações necessárias para o checkout</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Para completar uma reserva pelo checkout são necessárias as seguintes informações:
            </DialogContentText>
            <Box component="ul" sx={{ pl: 3, mt: 1 }}>
              <li><strong>Nome completo</strong> - obrigatório</li>
              <li><strong>CPF/CNPJ</strong> - obrigatório (utilizado para localizar reserva)</li>
              <li><strong>Email</strong> - opcional, recomendado para envio de recibos</li>
              <li><strong>Forma de pagamento</strong> - será processada via Mercado Pago (sandbox em dev)</li>
              <li><strong>Política de cancelamento</strong> - verifique antes de confirmar</li>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setInfoOpen(false)}>Fechar</Button>
          </DialogActions>
        </Dialog>

        {/* Modal de Checkout - coleta Nome, CPF, Email */}
        <Dialog open={checkoutOpen} onClose={() => setCheckoutOpen(false)}>
          <DialogTitle>Finalizar Reserva</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Preencha seus dados para finalizar a reserva. Campos obrigatórios marcados.
            </DialogContentText>
            <Stack spacing={2} sx={{ mt: 2, minWidth: { xs: 260, sm: 360 } }}>
              <TextField label="Nome completo" required value={modalCliente.name} onChange={(e) => setModalCliente({ ...modalCliente, name: e.target.value })} fullWidth />
              <TextField label="CPF/CNPJ" required value={modalCliente.cpfCnpj} onChange={(e) => setModalCliente({ ...modalCliente, cpfCnpj: e.target.value })} fullWidth />
              <TextField label="Email (opcional)" value={modalCliente.email} onChange={(e) => setModalCliente({ ...modalCliente, email: e.target.value })} fullWidth />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCheckoutOpen(false)}>Cancelar</Button>
            <Button onClick={() => submitReservations(modalCliente)} variant="contained" sx={{ bgcolor: '#D4AF37', color: '#fff' }}>
              Confirmar e Pagar
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar open={snack.open} autoHideDuration={6000} onClose={() => setSnack({ open: false })}>
          <Alert onClose={() => setSnack({ open: false })} severity={snack.severity ?? 'info'} sx={{ width: '100%' }}>
            {snack.message}
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
}