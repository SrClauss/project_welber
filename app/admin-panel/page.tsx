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
      router.push('/admin-login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    // Load viagens data
    if (user) {
      loadViagens();
    }
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
      const { getFirestoreInstance } = await import('../../lib/firestoreClient');
      const { collection, getDocs, query, orderBy } = await import('firebase/firestore');
      
      const db = await getFirestoreInstance();
      const viagensCollection = collection(db, 'viagens');
      const q = query(viagensCollection, orderBy('dataViagem', 'desc'));
      const snapshot = await getDocs(q);
      
      const viagensData: Viagem[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          dataViagem: data.dataViagem || '',
          percurso: data.percurso || '',
          passagens: data.passagens || [],
        };
      });
      
      setViagens(viagensData);
      
      // Extract unique dates for filter
      const dates = [...new Set(viagensData.map(v => v.dataViagem))].sort();
      setAvailableDates(dates);
      
    } catch (err) {
      console.error('Error loading viagens:', err);
      setMessage({ type: 'error', text: 'Erro ao carregar viagens' });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (!auth) {
      router.push('/admin-login');
      return;
    }
    try {
      const { signOut } = await import('firebase/auth');
      await signOut(auth);
      router.push('/admin-login');
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
      // Get the user's ID token
      if (!auth || !user) {
        setMessage({ type: 'error', text: 'Usuário não autenticado' });
        setClearing(false);
        return;
      }

      // Perform the database clear operation directly on the client side
      // This is secure because Firestore security rules enforce access control
      const { getFirestoreInstance } = await import('../../lib/firestoreClient');
      const { collection, getDocs, writeBatch } = await import('firebase/firestore');
      
      const db = await getFirestoreInstance();
      const viagensCollection = collection(db, 'viagens');
      const viagensSnapshot = await getDocs(viagensCollection);

      if (viagensSnapshot.empty) {
        setMessage({ type: 'success', text: 'Banco de dados já está vazio' });
        setClearing(false);
        return;
      }

      // Delete all documents in a batch
      const batch = writeBatch(db);
      let deleteCount = 0;

      viagensSnapshot.docs.forEach((docSnap) => {
        batch.delete(docSnap.ref);
        deleteCount++;
      });

      await batch.commit();

      setMessage({ 
        type: 'success', 
        text: `Banco de dados limpo com sucesso! ${deleteCount} viagem(ns) deletada(s).` 
      });
      
      // Reload data
      await loadViagens();
    } catch (err) {
      console.error('Error clearing database:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro ao limpar banco de dados';
      setMessage({ type: 'error', text: errorMessage });
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

            <Box sx={{ mb: 2 }}>
              <Typography variant="body1" sx={{ color: '#666', mb: 1 }}>
                Bem-vindo, <strong>{user.displayName || user.email}</strong>
              </Typography>
              <Typography variant="caption" sx={{ color: '#999' }}>
                {user.email}
              </Typography>
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
                    {new Date(date).toLocaleDateString('pt-BR', { 
                      day: '2-digit', 
                      month: 'long', 
                      year: 'numeric' 
                    })}
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
                            {new Date(viagem.dataViagem).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
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
