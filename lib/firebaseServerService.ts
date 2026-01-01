/**
 * Server-side Firebase service using REST API
 * Uses FIREBASE_API_KEY for all operations
 * Uses user tokens for authentication (no service account needed)
 */

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '';
const FIREBASE_PROJECT_ID = 'wf-transportes';

/**
 * Get Firestore document using REST API with user token
 */
export async function getFirestoreDocument(path: string, userToken: string): Promise<unknown> {
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${path}`,
    {
      headers: {
        'Authorization': `Bearer ${userToken}`,
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
 * Query Firestore collection using REST API with user token
 */
export async function queryFirestoreCollection(collectionPath: string, userToken: string, orderBy?: string): Promise<unknown[]> {
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
        'Authorization': `Bearer ${userToken}`,
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
 * Delete Firestore document using REST API with user token
 */
export async function deleteFirestoreDocument(path: string, userToken: string): Promise<void> {
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${path}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${userToken}`,
      },
    }
  );

  if (!response.ok && response.status !== 404) {
    throw new Error(`Erro ao deletar documento: ${response.statusText}`);
  }
}

/**
 * Create Firestore document using REST API with user token
 */
export async function createFirestoreDocument(collectionPath: string, documentData: unknown, userToken: string): Promise<{ name: string }> {
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${collectionPath}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(documentData),
    }
  );

  if (!response.ok) {
    throw new Error(`Erro ao criar documento: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Batch delete documents
 */
export async function batchDeleteDocuments(paths: string[], userToken: string): Promise<number> {
  let deleted = 0;
  for (const path of paths) {
    try {
      await deleteFirestoreDocument(path, userToken);
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
