import { getFirestoreInstance } from "./firestoreClient";
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  query, 
  where, 
  limit, 
  runTransaction,
  DocumentReference
} from 'firebase/firestore';
import { Viagem, Passagem, Percurso } from "../app/api/types";
import { isValidCPF } from "../app/api/utils";

export type UpsertResult = { action: "created" | "updated"; viagemId: string };

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
  const db = await getFirestoreInstance();
  const ref = doc(db, "viagens", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const v = Viagem.fromFirestoreDoc({ id: snap.id, data: () => snap.data() });
  return { ref, snap, viagem: v };
}

/**
 * Busca viagem por dataViagem + percurso (retorna primeira encontrada)
 */
export async function findViagemByDateAndPercurso(dataViagem: string, percurso: Percurso) {
  const db = await getFirestoreInstance();
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
export async function addPassagemToViagemRef(ref: DocumentReference, passagem: Passagem) {
  const max = parseMaxLugares();
  const db = await getFirestoreInstance();

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) {
      throw new Error("Viagem não encontrada na transação");
    }
    const data = snap.data() || {};
    const passagens: Passagem[] = Array.isArray(data.passagens) ? data.passagens : [];
    if (passagens.length + 1 > max) {
      throw new Error(`Limite de lugares (${max}) excedido`);
    }
    // validar cpf
    if (!isValidCPF(passagem.cliente?.cpfCnpj)) {
      throw new Error("CPF/CNPJ inválido para a passagem");
    }

    const nova = [...passagens, passagem];
    tx.update(ref, { passagens: nova });
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

  const db = await getFirestoreInstance();
  const ref = doc(collection(db, "viagens"));
  const viagem = {
    dataViagem,
    percurso,
    passagens: [passagem],
  };
  await setDoc(ref, viagem);
  return ref.id;
}

/**
 * Upsert: cria ou atualiza viagem adicionando a passagem. Retorna action e viagemId.
 * - Se `viagemId` for fornecido, usa ela; caso contrário tenta achar por data+percurso.
 */
export async function upsertPassagem(options: { viagemId?: string; dataViagem?: string; percurso?: Percurso; passagem: Passagem; }): Promise<UpsertResult> {
  const { viagemId, dataViagem, percurso, passagem } = options;

  if (!passagem || !passagem.cliente) throw new Error("passagem.cliente é obrigatório");
  if (!passagem.cliente.name) throw new Error("passagem.cliente.name é obrigatório");
  if (!passagem.cliente.cpfCnpj) throw new Error("passagem.cliente.cpfCnpj é obrigatório");
  if (!isValidCPF(passagem.cliente.cpfCnpj)) throw new Error("CPF/CNPJ inválido");

  if (viagemId) {
    const found = await findViagemById(viagemId);
    if (!found) {
      // cria nova viagem usando id especificado
      const db = await getFirestoreInstance();
      const ref = doc(db, "viagens", viagemId);
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(ref);
        if (snap.exists()) {
          // add to existing
          const data = snap.data() || {};
          const passagens: Passagem[] = Array.isArray(data.passagens) ? data.passagens : [];
          const max = parseMaxLugares();
          if (passagens.length + 1 > max) throw new Error(`Limite de lugares (${max}) excedido`);
          tx.update(ref, { passagens: [...passagens, passagem] });
        } else {
          const max = parseMaxLugares();
          if (1 > max) throw new Error(`Limite de lugares (${max}) não permite incluir passagem`);
          tx.set(ref, { dataViagem: dataViagem ?? new Date().toISOString(), percurso: percurso ?? "São João dos Patos - Teresina", passagens: [passagem] });
        }
      });
      return { action: "created", viagemId };
    }
    // exists: add
    await addPassagemToViagemRef(found.ref, passagem);
    return { action: "updated", viagemId: found.ref.id };
  }

  // no viagemId: try find by date+percurso
  if (!dataViagem || !percurso) throw new Error("dataViagem e percurso são obrigatórios quando viagemId não é informado");
  const foundBy = await findViagemByDateAndPercurso(dataViagem, percurso);
  if (foundBy) {
    await addPassagemToViagemRef(foundBy.ref, passagem);
    return { action: "updated", viagemId: foundBy.ref.id };
  }

  // create new
  const id = await createViagemWithPassagem(dataViagem, percurso, passagem);
  return { action: "created", viagemId: id };
}
