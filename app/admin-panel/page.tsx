'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  ThemeProvider,
  CssBaseline,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Stack,
  Card,
  CardContent,
  MenuItem,
} from '@mui/material';
import { auth } from '../../lib/firebaseAuth';
import { useAuth, AuthProvider } from '../../lib/AuthContext';
import theme from '../theme';

interface Cliente {
  name: string;
  cpfCnpj: string;
  email?: string;
}

interface Passagem {
  cliente: Cliente;
  paga: boolean;
  externalReference?: string;
}

interface Viagem {
  id: string;
  dataViagem: string;
  percurso: string;
  passagens: Passagem[];
}

function AdminPanelContent() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [clearing, setClearing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [viagens, setViagens] = useState<Viagem[]>([]);
  const [filteredViagens, setFilteredViagens] = useState<Viagem[]>([]);
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [availableDates, setAvailableDates] = useState<string[]>([]);

  useEffect(() => {
    // If not authenticated, redirect to login
    if (!authLoading && !user) {
      router.replace('/admin-login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    // Load viagens data and current price
    if (user) {
      loadViagens();
      (async () => {
        try {
          const { getIdToken } = await import('firebase/auth');
          const idToken = await getIdToken(user);
          const res = await fetch('/api/admin/valor-passagem', { headers: { 'Authorization': `Bearer ${idToken}` } });
          const json = await res.json();
          if (res.ok && json.valor_passagem !== null && json.valor_passagem !== undefined) {
            const el = document.getElementById('admin-valor-passagem');
            if (el) el.textContent = Number(json.valor_passagem).toFixed(2);
            (window as any).__admin_valor_passagem = Number(json.valor_passagem);
          } else {
            const fallback = Number(process.env.NEXT_PUBLIC_VALOR_PASSAGEM ?? 50);
            const el = document.getElementById('admin-valor-passagem');
            if (el) el.textContent = Number(fallback).toFixed(2);
            (window as any).__admin_valor_passagem = fallback;
          }
        } catch (err) {
          console.error('Failed loading price', err);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    // Filter viagens by date
    if (dateFilter === 'all') {
      setFilteredViagens(viagens);
    } else {
      setFilteredViagens(viagens.filter(v => v.dataViagem === dateFilter));
    }
  }, [dateFilter, viagens]);

  const loadViagens = async () => {
    setLoading(true);
    try {
      if (!auth || !user) {
        setMessage({ type: 'error', text: 'Usuário não autenticado' });
        setLoading(false);
        return;
      }

      const { getIdToken } = await import('firebase/auth');
      const idToken = await getIdToken(user);

      const response = await fetch('/api/admin/viagens', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao carregar viagens');
      }

      const data = await response.json();
      const viagensData: Viagem[] = data.viagens || [];
      
      setViagens(viagensData);
      
      // Extract unique dates for filter
      const dates = [...new Set(viagensData.map((v: Viagem) => v.dataViagem))].sort();
      setAvailableDates(dates);
      
    } catch (err) {
      console.error('Error loading viagens:', err);
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Erro ao carregar viagens' });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string, format: 'full' | 'short' = 'full') => {
    const date = new Date(dateString);
    if (format === 'short') {
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    }
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  const handleSignOut = async () => {
    if (!auth) {
      router.replace('/admin-login');
      return;
    }
    try {
      const { signOut } = await import('firebase/auth');
      await signOut(auth);
      router.replace('/admin-login');
    } catch (err) {
      console.error('Error signing out:', err);
      setMessage({ type: 'error', text: 'Erro ao fazer logout' });
    }
  };

  const handleClearDatabase = async () => {
    setConfirmOpen(false);
    setClearing(true);
    setMessage(null);

    try {
      if (!auth || !user) {
        setMessage({ type: 'error', text: 'Usuário não autenticado' });
        setClearing(false);
        return;
      }

      const { getIdToken } = await import('firebase/auth');
      const idToken = await getIdToken(user);

      const response = await fetch('/api/admin/clear-database', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: data.message || 'Banco de dados limpo com sucesso!' });
        // Reload data after clearing
        await loadViagens();
      } else {
        setMessage({ type: 'error', text: data.error || 'Erro ao limpar banco de dados' });
      }
    } catch (err) {
      console.error('Error clearing database:', err);
      setMessage({ type: 'error', text: 'Erro ao conectar com o servidor' });
    } finally {
      setClearing(false);
    }
  };

  const getStats = () => {
    const totalViagens = filteredViagens.length;
    const totalPassagens = filteredViagens.reduce((sum, v) => sum + v.passagens.length, 0);
    const totalPagas = filteredViagens.reduce((sum, v) => 
      sum + v.passagens.filter(p => p.paga).length, 0);
    const totalPendentes = totalPassagens - totalPagas;
    
    return { totalViagens, totalPassagens, totalPagas, totalPendentes };
  };

  const stats = getStats();

  if (authLoading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: '#f0f2f5',
          }}
        >
          <CircularProgress />
        </Box>
      </ThemeProvider>
    );
  }

  if (!user) {
    return null; // Will redirect via useEffect
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: '#f0f2f5',
          py: 6,
        }}
      >
        <Container maxWidth="lg">
          {/* Header */}
          <Paper
            elevation={3}
            sx={{
              p: 4,
              borderRadius: 4,
              background: 'rgba(255, 255, 255, 0.95)',
              boxShadow: '0 40px 100px rgba(0,0,0,0.1)',
              mb: 4,
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  color: '#1a1a1a',
                }}
              >
                Painel Administrativo
              </Typography>

              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Box>
                  <Typography variant="caption" sx={{ display: 'block', color: '#666' }}>Valor atual por passageiro</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    R$ <span id="admin-valor-passagem">—</span>
                  </Typography>
                </Box>

                <Button
                  variant="outlined"
                  onClick={handleSignOut}
                  sx={{
                    borderColor: '#D4AF37',
                    color: '#D4AF37',
                    '&:hover': {
                      borderColor: '#b8962d',
                      bgcolor: 'rgba(212, 175, 55, 0.1)',
                    },
                  }}
                >
                  Sair
                </Button>
              </Box>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="body1" sx={{ color: '#666', mb: 1 }}>
                Bem-vindo, <strong>{user.displayName || user.email}</strong>
              </Typography>
              <Typography variant="caption" sx={{ color: '#999' }}>
                {user.email}
              </Typography>

              <Box sx={{ mt: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
                <TextField
                  label="Valor por passageiro (R$)"
                  type="number"
                  size="small"
                  value={(window as any).__admin_valor_passagem ?? ''}
                  onChange={(e) => (window as any).__admin_valor_passagem = e.target.value}
                  sx={{ width: 200 }}
                />
                <Button variant="contained" onClick={async () => {
                  try {
                    setLoading(true);
                    const { getIdToken } = await import('firebase/auth');
                    const idToken = await getIdToken(user);
                    const valor = Number((window as any).__admin_valor_passagem);
                    const res = await fetch('/api/admin/valor-passagem', {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
                      body: JSON.stringify({ valor_passagem: valor })
                    });
                    const json = await res.json();
                    if (!res.ok) throw new Error(json?.error || 'Erro ao atualizar');
                    setMessage({ type: 'success', text: `Valor atualizado para R$ ${json.valor_passagem}` });
                    // update displayed value
                    const el = document.getElementById('admin-valor-passagem');
                    if (el) el.textContent = json.valor_passagem.toFixed(2);
                  } catch (err) {
                    setMessage({ type: 'error', text: err instanceof Error ? err.message : String(err) });
                  } finally {
                    setLoading(false);
                  }
                }}>
                  Salvar
                </Button>
              </Box>
            </Box>
          </Paper>

          {message && (
            <Alert severity={message.type} sx={{ mb: 3 }}>
              {message.text}
            </Alert>
          )}

          {/* Statistics Cards */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
            <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
              <Card>
                <CardContent>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#D4AF37', mb: 1 }}>
                    {stats.totalViagens}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#666' }}>
                    Total de Viagens
                  </Typography>
                </CardContent>
              </Card>
            </Box>
            <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
              <Card>
                <CardContent>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#1976d2', mb: 1 }}>
                    {stats.totalPassagens}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#666' }}>
                    Total de Passagens
                  </Typography>
                </CardContent>
              </Card>
            </Box>
            <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
              <Card>
                <CardContent>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#4caf50', mb: 1 }}>
                    {stats.totalPagas}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#666' }}>
                    Passagens Pagas
                  </Typography>
                </CardContent>
              </Card>
            </Box>
            <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
              <Card>
                <CardContent>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#ff9800', mb: 1 }}>
                    {stats.totalPendentes}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#666' }}>
                    Passagens Pendentes
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          </Box>

          {/* Filters and Actions */}
          <Paper
            elevation={2}
            sx={{
              p: 3,
              borderRadius: 4,
              mb: 3,
            }}
          >
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
              <TextField
                select
                label="Filtrar por Data"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                sx={{ minWidth: 250 }}
              >
                <MenuItem value="all">Todas as Datas</MenuItem>
                {availableDates.map((date) => (
                  <MenuItem key={date} value={date}>
                    {formatDate(date)}
                  </MenuItem>
                ))}
              </TextField>
              
              <Box sx={{ flexGrow: 1 }} />
              
              <Button
                variant="outlined"
                onClick={loadViagens}
                disabled={loading}
                sx={{ minWidth: 120 }}
              >
                {loading ? <CircularProgress size={20} /> : 'Atualizar'}
              </Button>
              
              <Button
                variant="contained"
                color="error"
                onClick={() => setConfirmOpen(true)}
                disabled={clearing}
              >
                {clearing ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : 'Limpar Banco'}
              </Button>
            </Stack>
          </Paper>

          {/* Viagens Table */}
          <Paper
            elevation={2}
            sx={{
              borderRadius: 4,
              overflow: 'hidden',
            }}
          >
            <Box sx={{ p: 3, bgcolor: '#fafafa', borderBottom: '1px solid #eee' }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Viagens e Passagens
              </Typography>
              <Typography variant="caption" sx={{ color: '#666' }}>
                {filteredViagens.length} viagem(ns) encontrada(s)
              </Typography>
            </Box>

            {loading ? (
              <Box sx={{ p: 6, display: 'flex', justifyContent: 'center' }}>
                <CircularProgress />
              </Box>
            ) : filteredViagens.length === 0 ? (
              <Box sx={{ p: 6, textAlign: 'center' }}>
                <Typography variant="body1" sx={{ color: '#999' }}>
                  Nenhuma viagem encontrada
                </Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Data</strong></TableCell>
                      <TableCell><strong>Percurso</strong></TableCell>
                      <TableCell align="center"><strong>Passagens</strong></TableCell>
                      <TableCell align="center"><strong>Pagas</strong></TableCell>
                      <TableCell align="center"><strong>Pendentes</strong></TableCell>
                      <TableCell><strong>Passageiros</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredViagens.map((viagem) => {
                      const pagas = viagem.passagens.filter(p => p.paga).length;
                      const pendentes = viagem.passagens.length - pagas;
                      
                      return (
                        <TableRow key={viagem.id} hover>
                          <TableCell>
                            {formatDate(viagem.dataViagem, 'short')}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                              {viagem.percurso}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Chip 
                              label={viagem.passagens.length} 
                              size="small" 
                              color="primary"
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Chip 
                              label={pagas} 
                              size="small" 
                              color="success"
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Chip 
                              label={pendentes} 
                              size="small" 
                              color="warning"
                            />
                          </TableCell>
                          <TableCell>
                            <Box>
                              {viagem.passagens.map((passagem, idx) => (
                                <Box 
                                  key={idx} 
                                  sx={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: 1, 
                                    mb: 0.5,
                                    fontSize: '0.875rem'
                                  }}
                                >
                                  <Typography variant="caption" sx={{ minWidth: 150 }}>
                                    {passagem.cliente.name}
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: '#999', minWidth: 120 }}>
                                    {passagem.cliente.cpfCnpj}
                                  </Typography>
                                  <Chip
                                    label={passagem.paga ? 'Paga' : 'Pendente'}
                                    size="small"
                                    color={passagem.paga ? 'success' : 'warning'}
                                    sx={{ height: 20, fontSize: '0.7rem' }}
                                  />
                                </Box>
                              ))}
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Container>
      </Box>

      {/* Confirmation Dialog */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Confirmar Limpeza do Banco de Dados</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Tem certeza que deseja limpar todo o banco de dados? Esta ação irá remover todas as viagens e passagens e não pode ser desfeita.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancelar</Button>
          <Button onClick={handleClearDatabase} color="error" variant="contained">
            Confirmar Limpeza
          </Button>
        </DialogActions>
      </Dialog>
    </ThemeProvider>
  );
}

// Note: Each admin page has its own AuthProvider wrapper instead of wrapping at the root level.
// This is intentional to avoid loading Firebase Auth context on non-admin pages and API routes,
// which could cause build-time issues. Firebase Auth maintains a single session across the app,
// so each AuthProvider will correctly see the same authenticated user.
export default function AdminPanelPage() {
  return (
    <AuthProvider>
      <AdminPanelContent />
    </AuthProvider>
  );
}
