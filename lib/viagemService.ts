// Server-side viagem service using Firebase client SDK
import { Viagem, Passagem, Percurso } from "../app/api/types";
import { isValidCPF } from "../app/api/utils";

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

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("Viagem não encontrada");
    const v = Viagem.fromFirestoreDoc({ id: snap.id, data: () => snap.data() as Record<string, unknown> });
    if ((v.passagens?.length || 0) >= max) {
      throw new Error(`Não é possível adicionar passagem. Limite de ${max} lugares atingido.`);
    }
    const newPassagens = [...(v.passagens || []), passagem];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tx.update(ref, { passagens: newPassagens as any });
  });
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

  const docRef = await addDoc(collection(db, "viagens"), viagem);
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
