// Server-side viagem service using Firebase client SDK
import { Viagem, Passagem, Percurso } from "../app/api/types";
import { isValidCPF } from "../app/api/utils";
import type { UpdateData } from 'firebase/firestore';

export type UpsertResult = { action: "created" | "updated"; viagemId: string };

// Initialize Firebase client SDK for server-side use
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let firestore: any = null;

async function getFirestore() {
  if (firestore) return firestore;
  
  const { initializeApp, getApps } = await import('firebase/app');
  const { getFirestore: getFirestoreInstance } = await import('firebase/firestore');
  
  const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: "wf-transportes.firebaseapp.com",
    projectId: "wf-transportes",
    storageBucket: "wf-transportes.firebasestorage.app",
    messagingSenderId: "332399091530",
    appId: "1:332399091530:web:ccb5da2a8c6833d02502d7"
  };

  const apps = getApps();
  const app = apps.length > 0 ? apps[0] : initializeApp(firebaseConfig);
  firestore = getFirestoreInstance(app);
  return firestore;
}

/**
 * Remove propriedades com valor `undefined` de objetos/arrays recursivamente.
 * Firestore rejeita campos com valor undefined, então sanitizamos antes de gravar.
 */
function sanitizeForFirestore<T>(value: T): T {
  if (value === undefined) return value;
  if (value === null) return value;
  if (Array.isArray(value)) {
    return value
      .map((v) => sanitizeForFirestore(v))
      .filter((v) => v !== undefined) as unknown as T;
  }
  if (typeof value === 'object' && value !== null) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === undefined) continue; // skip undefined
      out[k] = sanitizeForFirestore(v as unknown as T);
    }
    return out as T;
  }
  return value;
}

function parseMaxLugares(): number {
  const max = Number(process.env.MAX_LUGARES);
  if (!Number.isFinite(max) || max <= 0) {
    throw new Error('ENV inválida: defina uma variável de ambiente numérica e positiva `MAX_LUGARES`.');
  }
  return max;
}

/**
 * Encontra viagem por id
 */
export async function findViagemById(id: string) {
  const db = await getFirestore();
  const { doc, getDoc } = await import('firebase/firestore');
  
  try {
    const ref = doc(db, "viagens", id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const v = Viagem.fromFirestoreDoc({ id: snap.id, data: () => snap.data() });
    return { ref, snap, viagem: v };
  } catch {
    return null;
  }
}

/**
 * Busca viagem por dataViagem + percurso (retorna primeira encontrada)
 */
export async function findViagemByDateAndPercurso(dataViagem: string, percurso: Percurso) {
  const db = await getFirestore();
  const { collection, query, where, limit, getDocs } = await import('firebase/firestore');
  
  const q = query(
    collection(db, "viagens"),
    where("dataViagem", "==", dataViagem),
    where("percurso", "==", percurso),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const docSnap = snap.docs[0];
  const v = Viagem.fromFirestoreDoc({ id: docSnap.id, data: () => docSnap.data() });
  return { ref: docSnap.ref, snap: docSnap, viagem: v };
}

/**
 * Adiciona uma passagem numa viagem existente usando transação (verifica MAX_LUGARES)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function addPassagemToViagemRef(ref: any, passagem: Passagem) {
  const max = parseMaxLugares();
  const db = await getFirestore();
  const { runTransaction } = await import('firebase/firestore');

  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new Error("Viagem não encontrada");
      const v = Viagem.fromFirestoreDoc({ id: snap.id, data: () => snap.data() as Record<string, unknown> });
      if ((v.passagens?.length || 0) >= max) {
        throw new Error(`Não é possível adicionar passagem. Limite de ${max} lugares atingido.`);
      }
      const newPassagens = [...(v.passagens || []), passagem];
      // Sanitize to remove undefined values (Firestore rejects undefined)
      const sanitized = sanitizeForFirestore(newPassagens);
      try {
        // Build an UpdateData payload to satisfy Firestore types
        const payload = { passagens: sanitized as unknown as unknown[] } as UpdateData<{ passagens: unknown[] }>;
        tx.update(ref, payload);
      } catch (err) {
        console.error('Failed to update passagens on transaction. Payload:', JSON.stringify(sanitized, null, 2));
        throw err;
      }
    });
  } catch (err) {
    console.error('Transaction failed for addPassagemToViagemRef. Ref path:', ref?.path ?? String(ref));
    // Log existing passagens from the doc to help debugging
    try {
      const { getDoc } = await import('firebase/firestore');
      const docSnap = await getDoc(ref);
      if (docSnap.exists()) {
        const docData = docSnap.data() as Record<string, unknown> | undefined;
        console.error('Existing passagens snapshot:', JSON.stringify((docData?.passagens) ?? null, null, 2));
      }
    } catch (e) {
      console.error('Could not read document snapshot for debugging:', e);
    }
    throw err;
  }
}

/**
 * Cria uma nova viagem com a passagem (garante MAX_LUGARES)
 */
export async function createViagemWithPassagem(dataViagem: string, percurso: Percurso, passagem: Passagem): Promise<string> {
  const max = parseMaxLugares();
  
  // valida cpf
  if (!isValidCPF(passagem.cliente?.cpfCnpj)) {
    throw new Error("CPF/CNPJ inválido para a passagem");
  }
  
  if (1 > max) throw new Error(`Limite de lugares (${max}) não permite incluir passagem`);

  const db = await getFirestore();
  const { collection, addDoc } = await import('firebase/firestore');
  
  const viagem = {
    dataViagem,
    percurso,
    passagens: [passagem],
  };

  const viagemSanitized = sanitizeForFirestore(viagem);
  const docRef = await addDoc(collection(db, "viagens"), viagemSanitized as unknown as Record<string, unknown>);
  return docRef.id;
}

/**
 * Upsert: cria ou atualiza viagem adicionando a passagem. Retorna action e viagemId.
 */
export async function upsertPassagem(options: { viagemId?: string; dataViagem?: string; percurso?: Percurso; passagem: Passagem; }): Promise<UpsertResult> {
  const { viagemId, dataViagem, percurso, passagem } = options;

  if (!passagem || !passagem.cliente) throw new Error("passagem.cliente é obrigatório");
  if (!passagem.cliente.name) throw new Error("passagem.cliente.name é obrigatório");
  if (!passagem.cliente.cpfCnpj) throw new Error("passagem.cliente.cpfCnpj é obrigatório");
  if (!isValidCPF(passagem.cliente.cpfCnpj)) throw new Error("CPF/CNPJ inválido");

  if (viagemId) {
    const found = await findViagemById(viagemId);
    if (found) {
      await addPassagemToViagemRef(found.ref, passagem);
      return { action: "updated", viagemId };
    }
    // If not found, create new
    if (!dataViagem || !percurso) throw new Error("dataViagem e percurso são obrigatórios");
    const id = await createViagemWithPassagem(dataViagem, percurso, passagem);
    return { action: "created", viagemId: id };
  }

  // no viagemId: try find by date+percurso
  if (!dataViagem || !percurso) throw new Error("dataViagem e percurso são obrigatórios quando viagemId não é informado");
  const foundBy = await findViagemByDateAndPercurso(dataViagem, percurso);
  if (foundBy) {
    await addPassagemToViagemRef(foundBy.ref, passagem);
    return { action: "updated", viagemId: foundBy.viagem.id || '' };
  }

  // create new
  const id = await createViagemWithPassagem(dataViagem, percurso, passagem);
  return { action: "created", viagemId: id };
}

/**
 * Encontra a primeira viagem que contenha passagens com `externalReference` igual ao valor informado.
 */
export async function findViagemByExternalReference(externalReference: string) {
  const db = await getFirestore();
  const { collection, getDocs } = await import('firebase/firestore');

  const col = collection(db, 'viagens');
  const snap = await getDocs(col);
  for (const doc of snap.docs) {
    const data = doc.data();
    const passagens: Passagem[] = Array.isArray(data.passagens) ? data.passagens as Passagem[] : [];
    if (passagens.some(p => p.externalReference === externalReference)) {
      const v = Viagem.fromFirestoreDoc({ id: doc.id, data: () => data });
      return { ref: doc.ref, viagem: v };
    }
  }
  return null;
}

/**
 * Marca todas as passagens com `externalReference` igual ao valor informado como pagas.
 * Retorna o número de passagens atualizadas.
 */
export async function markPassagensPaidByExternalReference(externalReference: string, options?: { paymentId?: string; by?: string; }) {
  const db = await getFirestore();
  const { runTransaction } = await import('firebase/firestore');

  let updated = 0;
  await runTransaction(db, async (tx) => {
    const { collection, getDocs } = await import('firebase/firestore');
    const col = collection(db, 'viagens');
    const snap = await getDocs(col);
    for (const doc of snap.docs) {
      const data = doc.data();
      const passagens: Passagem[] = Array.isArray(data.passagens) ? data.passagens as Passagem[] : [];
      let changed = false;
      const newPassagens = passagens.map((p) => {
        if (p.externalReference === externalReference && !p.paga) {
          changed = true;
          updated += 1;
          const checkoutInfo = {
            id: options?.paymentId || 'manual-confirm',
            status: 'paid',
            dateCreated: new Date().toISOString()
          } as any;
          return { ...p, paga: true, checkout: checkoutInfo } as Passagem;
        }
        return p;
      });
      if (changed) {
        await tx.update(doc.ref, { passagens: sanitizeForFirestore(newPassagens) });
      }
    }
  });
  return updated;
}
