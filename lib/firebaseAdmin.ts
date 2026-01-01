/* eslint-disable @typescript-eslint/no-explicit-any */
// Módulo seguro que tenta inicializar firebase-admin quando disponível.
// Em ambientes de dev sem firebase-admin instalado, expõe stub que falha ao usar.
let admin: any = null;
try {
  // require para evitar erro de tipagem caso o pacote não esteja instalado
  // em alguns ambientes de CI/local.
   
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  admin = require('firebase-admin');
} catch {
  admin = null;
}

if (admin && !admin.apps?.length) {
  const saBase64 = process.env.FIREBASE_SA_BASE64;
  if (!saBase64) {
    // Não inicializa sem credenciais; deixamos admin disponível mas sem app
    console.warn('FIREBASE_SA_BASE64 não encontrada: firebase-admin não foi inicializado.');
  } else {
    try {
      const saJson = Buffer.from(saBase64, 'base64').toString('utf-8');
      const serviceAccount = JSON.parse(saJson);
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    } catch (err) {
      console.error('Erro ao inicializar firebase-admin:', err);
    }
  }
}

export const firestore: any = admin && admin.firestore ? admin.firestore() : {
  collection() {
    throw new Error('firebase-admin não configurado (instale/configure FIREBASE_SA_BASE64)');
  }
};
export default admin;