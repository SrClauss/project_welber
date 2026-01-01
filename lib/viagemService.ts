// firestore é requerido dinamicamente para evitar erro quando firebase-admin não estiver instalado
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let firestore: any;
try {
   
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  firestore = require('./firebaseAdmin').firestore;
} catch {
  firestore = {
    collection() {
      throw new Error('firebase-admin não configurado (instale/configure FIREBASE_SA_BASE64)');
    }
  };
}
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
  const ref = firestore.collection("viagens").doc(id);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const v = Viagem.fromFirestoreDoc({ id: snap.id, data: () => snap.data() });
  return { ref, snap, viagem: v };
}

/**
 * Busca viagem por dataViagem + percurso (retorna primeira encontrada)
 */
export async function findViagemByDateAndPercurso(dataViagem: string, percurso: Percurso) {
  const q = firestore.collection("viagens").where("dataViagem", "==", dataViagem).where("percurso", "==", percurso).limit(1);
  const snap = await q.get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  const v = Viagem.fromFirestoreDoc({ id: doc.id, data: () => doc.data() });
  return { ref: doc.ref, snap: doc, viagem: v };
}

/**
 * Adiciona uma passagem numa viagem existente usando transação (verifica MAX_LUGARES)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function addPassagemToViagemRef(ref: any, passagem: Passagem) {
  const max = parseMaxLugares();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await firestore.runTransaction(async (tx: any) => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
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

  const ref = firestore.collection("viagens").doc();
  const viagem = {
    dataViagem,
    percurso,
    passagens: [passagem],
  };
  await ref.set(viagem);
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
      const ref = firestore.collection("viagens").doc(viagemId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await firestore.runTransaction(async (tx: any) => {
        const snap = await tx.get(ref);
        if (snap.exists) {
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
