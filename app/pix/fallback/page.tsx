"use client";
import React from 'react';
import { Box, Paper, Typography, Button } from '@mui/material';
import Link from 'next/link';

export default function PixFallbackPage() {
  return (
    <main style={{ padding: 24 }}>
      <Paper sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
        <Typography variant="h5" sx={{ mb: 2 }}>PIX removido</Typography>
        <Typography sx={{ mb: 2 }}>O fluxo de PIX foi removido do site. Por favor, utilize o Checkout padrão para concluir sua compra.</Typography>
        <Button variant="contained" component={Link} href="/">Ir para início</Button>
      </Paper>
    </main>
  );
}