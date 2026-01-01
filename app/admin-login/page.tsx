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
  TextField,
  Stack,
} from '@mui/material';
import { auth } from '../../lib/firebaseAuth';
import { useAuth, AuthProvider } from '../../lib/AuthContext';
import theme from '../theme';

function AdminLoginContent() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    // If already authenticated, redirect to admin panel
    if (!authLoading && user) {
      router.push('/admin-panel');
    }
  }, [user, authLoading, router]);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!auth) {
      setError('Firebase Auth não está configurado corretamente.');
      return;
    }

    if (!email || !password) {
      setError('Por favor, preencha email e senha.');
      return;
    }

    setError(null);
    setSigningIn(true);
    
    try {
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      await signInWithEmailAndPassword(auth, email, password);
      // Redirect will happen via useEffect
    } catch (err: unknown) {
      console.error('Error signing in with email:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      
      // Provide user-friendly error messages
      if (errorMessage.includes('user-not-found') || errorMessage.includes('wrong-password')) {
        setError('Email ou senha incorretos.');
      } else if (errorMessage.includes('invalid-email')) {
        setError('Email inválido.');
      } else if (errorMessage.includes('too-many-requests')) {
        setError('Muitas tentativas. Tente novamente mais tarde.');
      } else {
        setError('Erro ao fazer login. Por favor, tente novamente.');
      }
      setSigningIn(false);
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
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.8), rgba(240,242,245,1))',
        }}
      >
        <Container maxWidth="sm">
          <Paper
            elevation={3}
            sx={{
              p: 6,
              borderRadius: 4,
              background: 'rgba(255, 255, 255, 0.95)',
              boxShadow: '0 40px 100px rgba(0,0,0,0.1)',
            }}
          >
            <Typography
              variant="h4"
              sx={{
                mb: 2,
                fontWeight: 700,
                color: '#1a1a1a',
                textAlign: 'center',
              }}
            >
              Painel Administrativo
            </Typography>
            <Typography
              variant="body1"
              sx={{
                mb: 4,
                color: '#666',
                textAlign: 'center',
              }}
            >
              Faça login com email e senha para acessar o painel administrativo
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            <form onSubmit={handleEmailSignIn}>
              <Stack spacing={3}>
                <TextField
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  fullWidth
                  required
                  autoComplete="email"
                  disabled={signingIn}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '&:hover fieldset': {
                        borderColor: '#D4AF37',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#D4AF37',
                      },
                    },
                    '& .MuiInputLabel-root.Mui-focused': {
                      color: '#D4AF37',
                    },
                  }}
                />
                <TextField
                  label="Senha"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  fullWidth
                  required
                  autoComplete="current-password"
                  disabled={signingIn}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '&:hover fieldset': {
                        borderColor: '#D4AF37',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#D4AF37',
                      },
                    },
                    '& .MuiInputLabel-root.Mui-focused': {
                      color: '#D4AF37',
                    },
                  }}
                />
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  fullWidth
                  disabled={signingIn}
                  sx={{
                    py: 2,
                    bgcolor: '#D4AF37',
                    color: '#fff',
                    fontSize: '1rem',
                    fontWeight: 600,
                    boxShadow: '0 15px 30px rgba(212, 175, 55, 0.3)',
                    '&:hover': {
                      bgcolor: '#b8962d',
                    },
                    '&:disabled': {
                      bgcolor: '#ccc',
                    },
                  }}
                >
                  {signingIn ? (
                    <CircularProgress size={24} sx={{ color: '#fff' }} />
                  ) : (
                    'Entrar'
                  )}
                </Button>
              </Stack>
            </form>

            <Typography
              variant="caption"
              sx={{
                mt: 3,
                display: 'block',
                color: '#999',
                textAlign: 'center',
              }}
            >
              Acesso restrito a administradores
            </Typography>
          </Paper>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

// Note: Each admin page has its own AuthProvider wrapper instead of wrapping at the root level.
// This is intentional to avoid loading Firebase Auth context on non-admin pages and API routes,
// which could cause build-time issues. Firebase Auth maintains a single session across the app,
// so each AuthProvider will correctly see the same authenticated user.
export default function AdminLoginPage() {
  return (
    <AuthProvider>
      <AdminLoginContent />
    </AuthProvider>
  );
}
