/**
 * Server-side Firebase service using REST API
 * Uses a single FIREBASE_API_KEY for all operations
 * Maintains a service token for Firestore access
 */

// Service credentials - these should be set as environment variables
const SERVICE_EMAIL = process.env.FIREBASE_SERVICE_EMAIL || 'admin@wf-transportes.firebaseapp.com';
const SERVICE_PASSWORD = process.env.FIREBASE_SERVICE_PASSWORD || '';
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '';
const FIREBASE_PROJECT_ID = 'wf-transportes';

interface AuthResponse {
  idToken: string;
  refreshToken: string;
  expiresIn: string;
  localId: string;
}

interface ServiceToken {
  idToken: string;
  refreshToken: string;
  expiresAt: number;
}

let serviceToken: ServiceToken | null = null;

/**
 * Authenticate service account and get token
 */
async function authenticateService(): Promise<string> {
  if (!FIREBASE_API_KEY) {
    throw new Error('FIREBASE_API_KEY não configurada');
  }

  if (!SERVICE_PASSWORD) {
    throw new Error('FIREBASE_SERVICE_PASSWORD não configurada');
  }

  // Check if we have a valid token
  if (serviceToken && serviceToken.expiresAt > Date.now()) {
    return serviceToken.idToken;
  }

  // If we have a refresh token, try to refresh
  if (serviceToken?.refreshToken) {
    try {
      const refreshResponse = await fetch(
        `https://securetoken.googleapis.com/v1/token?key=${FIREBASE_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            grant_type: 'refresh_token',
            refresh_token: serviceToken.refreshToken,
          }),
        }
      );

      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        serviceToken = {
          idToken: data.id_token,
          refreshToken: data.refresh_token,
          expiresAt: Date.now() + (parseInt(data.expires_in) * 1000) - 60000, // 1 min buffer
        };
        return serviceToken.idToken;
      }
    } catch (error) {
      console.error('Error refreshing token:', error);
    }
  }

  // Authenticate with email/password
  const authResponse = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: SERVICE_EMAIL,
        password: SERVICE_PASSWORD,
        returnSecureToken: true,
      }),
    }
  );

  if (!authResponse.ok) {
    const error = await authResponse.json();
    throw new Error(`Falha na autenticação do serviço: ${error.error?.message || 'Unknown error'}`);
  }

  const authData: AuthResponse = await authResponse.json();
  
  serviceToken = {
    idToken: authData.idToken,
    refreshToken: authData.refreshToken,
    expiresAt: Date.now() + (parseInt(authData.expiresIn) * 1000) - 60000, // 1 min buffer
  };

  return serviceToken.idToken;
}

/**
 * Get Firestore document using REST API
 */
export async function getFirestoreDocument(path: string): Promise<unknown> {
  const token = await authenticateService();
  
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${path}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Erro ao buscar documento: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Query Firestore collection using REST API
 */
export async function queryFirestoreCollection(collectionPath: string, orderBy?: string): Promise<unknown[]> {
  const token = await authenticateService();
  
  const requestBody: { structuredQuery: { from: { collectionId: string }[]; orderBy?: { field: { fieldPath: string }; direction: string }[] } } = {
    structuredQuery: {
      from: [{ collectionId: collectionPath }],
    },
  };

  if (orderBy) {
    requestBody.structuredQuery.orderBy = [
      {
        field: { fieldPath: orderBy },
        direction: 'DESCENDING',
      },
    ];
  }

  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents:runQuery`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    }
  );

  if (!response.ok) {
    throw new Error(`Erro ao consultar coleção: ${response.statusText}`);
  }

  const results = await response.json();
  return results
    .filter((r: { document?: unknown }) => r.document)
    .map((r: { document: unknown }) => r.document);
}

/**
 * Delete Firestore document using REST API
 */
export async function deleteFirestoreDocument(path: string): Promise<void> {
  const token = await authenticateService();
  
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${path}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  if (!response.ok && response.status !== 404) {
    throw new Error(`Erro ao deletar documento: ${response.statusText}`);
  }
}

/**
 * Batch delete documents
 */
export async function batchDeleteDocuments(paths: string[]): Promise<number> {
  let deleted = 0;
  for (const path of paths) {
    try {
      await deleteFirestoreDocument(path);
      deleted++;
    } catch (error) {
      console.error(`Erro ao deletar ${path}:`, error);
    }
  }
  return deleted;
}

/**
 * Verify user token (from client authentication)
 */
export async function verifyUserToken(idToken: string): Promise<{ uid: string; email?: string }> {
  if (!FIREBASE_API_KEY) {
    throw new Error('FIREBASE_API_KEY não configurada');
  }

  // Verify token using Firebase Auth REST API
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    }
  );

  if (!response.ok) {
    throw new Error('Token inválido ou expirado');
  }

  const data = await response.json();
  if (!data.users || data.users.length === 0) {
    throw new Error('Token inválido');
  }

  const user = data.users[0];
  return {
    uid: user.localId,
    email: user.email,
  };
}

export { authenticateService };
