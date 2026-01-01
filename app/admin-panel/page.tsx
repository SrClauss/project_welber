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
} from '@mui/material';
import { auth } from '../../lib/firebaseAuth';
import { useAuth, AuthProvider } from '../../lib/AuthContext';
import theme from '../theme';

function AdminPanelContent() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [clearing, setClearing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    // If not authenticated, redirect to login
    if (!authLoading && !user) {
      router.push('/admin-login');
    }
  }, [user, authLoading, router]);

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
        <Container maxWidth="md">
          <Paper
            elevation={3}
            sx={{
              p: 4,
              borderRadius: 4,
              background: 'rgba(255, 255, 255, 0.95)',
              boxShadow: '0 40px 100px rgba(0,0,0,0.1)',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
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

            <Box sx={{ mb: 4 }}>
              <Typography variant="body1" sx={{ color: '#666', mb: 1 }}>
                Bem-vindo, <strong>{user.displayName || user.email}</strong>
              </Typography>
              <Typography variant="caption" sx={{ color: '#999' }}>
                {user.email}
              </Typography>
            </Box>

            {message && (
              <Alert severity={message.type} sx={{ mb: 3 }}>
                {message.text}
              </Alert>
            )}

            <Paper
              variant="outlined"
              sx={{
                p: 3,
                borderRadius: 2,
                borderColor: '#eee',
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  mb: 2,
                  fontWeight: 600,
                  color: '#1a1a1a',
                }}
              >
                Gerenciamento do Banco de Dados
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  mb: 3,
                  color: '#666',
                }}
              >
                Esta ação irá remover todas as viagens e passagens do banco de dados. Esta operação não pode ser desfeita.
              </Typography>
              <Button
                variant="contained"
                color="error"
                onClick={() => setConfirmOpen(true)}
                disabled={clearing}
                sx={{
                  py: 1.5,
                  px: 3,
                }}
              >
                {clearing ? (
                  <>
                    <CircularProgress size={20} sx={{ color: '#fff', mr: 1 }} />
                    Limpando...
                  </>
                ) : (
                  'Limpar Banco de Dados'
                )}
              </Button>
            </Paper>
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

export default function AdminPanelPage() {
  return (
    <AuthProvider>
      <AdminPanelContent />
    </AuthProvider>
  );
}
