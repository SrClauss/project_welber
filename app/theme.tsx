import { createTheme } from '@mui/material/styles';

// Tema Glassmorphism Claro/Dourado Premium (exportado em arquivo separado)
export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#D4AF37' },
    background: { default: '#f5f5f7' },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", sans-serif',
    h1: { fontWeight: 900, letterSpacing: '-0.02em' },
    h4: { fontWeight: 800 },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '16px',
          padding: '14px 28px',
          fontWeight: 700,
          textTransform: 'none',
          transition: 'all 0.3s ease',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: '24px',
          border: '1px solid rgba(255, 255, 255, 0.7)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '16px',
            backgroundColor: 'rgba(255, 255, 255, 0.5)',
          },
        },
      },
    },
  },
});

export default theme;
