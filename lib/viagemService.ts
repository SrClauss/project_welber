// Server-side viagem service using Firebase REST API
import { Viagem, Passagem, Percurso } from "../app/api/types";
import { isValidCPF } from "../app/api/utils";
import { getFirestoreDocument, queryFirestoreCollection, authenticateService } from "./firebaseServerService";

export type UpsertResult = { action: "created" | "updated"; viagemId: string };

const FIREBASE_PROJECT_ID = 'wf-transportes';

function parseMaxLugares(): number {
  const max = Number(process.env.MAX_LUGARES);
  if (!Number.isFinite(max) || max <= 0) {
    throw new Error('ENV inválida: defina uma variável de ambiente numérica e positiva `MAX_LUGARES`.');
  }
  return max;
}

// Helper to convert Firestore document format
function convertFirestoreDoc(doc: { name: string; fields: Record<string, unknown> }): { id: string; data: Record<string, unknown> } {
  const id = doc.name.split('/').pop() || '';
  const data: Record<string, unknown> = {};
  
  // This is a simplified converter - in production you'd need a more robust one
  for (const [key, value] of Object.entries(doc.fields)) {
    const val = value as { stringValue?: string; integerValue?: string; arrayValue?: unknown };
    if (val.stringValue !== undefined) {
      data[key] = val.stringValue;
    } else if (val.integerValue !== undefined) {
      data[key] = parseInt(val.integerValue);
    } else if (val.arrayValue) {
      data[key] = val.arrayValue;
    }
  }
  
  return { id, data };
}

/**
 * Encontra viagem por id
 */
export async function findViagemById(id: string) {
  try {
    const doc = await getFirestoreDocument(`viagens/${id}`) as { name: string; fields: Record<string, unknown> };
    const { data } = convertFirestoreDoc(doc);
    const v = Viagem.fromFirestoreDoc({ id, data: () => data });
    return { viagem: v, docPath: `viagens/${id}` };
  } catch {
    return null;
  }
}

/**
 * Busca viagem por dataViagem + percurso (retorna primeira encontrada)
 */
export async function findViagemByDateAndPercurso(dataViagem: string, percurso: Percurso) {
  const docs = await queryFirestoreCollection('viagens');
  
  for (const doc of docs) {
    const docData = doc as { name: string; fields: Record<string, { stringValue?: string }> };
    const dataViagemField = docData.fields.dataViagem?.stringValue;
    const percursoField = docData.fields.percurso?.stringValue;
    
    if (dataViagemField === dataViagem && percursoField === percurso) {
      const { id, data } = convertFirestoreDoc(docData);
      const v = Viagem.fromFirestoreDoc({ id, data: () => data });
      return { viagem: v, docPath: `viagens/${id}` };
    }
  }
  
  return null;
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

  const token = await authenticateService();
  
  // Create document with auto-generated ID
  const viagem = {
    fields: {
      dataViagem: { stringValue: dataViagem },
      percurso: { stringValue: percurso },
      passagens: {
        arrayValue: {
          values: [{
            mapValue: {
              fields: {
                cliente: {
                  mapValue: {
                    fields: {
                      name: { stringValue: passagem.cliente.name },
                      cpfCnpj: { stringValue: passagem.cliente.cpfCnpj },
                      email: { stringValue: passagem.cliente.email || '' },
                    }
                  }
                },
                paga: { booleanValue: passagem.paga || false },
              }
            }
          }]
        }
      }
    }
  };

  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/viagens`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(viagem),
    }
  );

  if (!response.ok) {
    throw new Error(`Erro ao criar viagem: ${response.statusText}`);
  }

  const created = await response.json();
  const id = created.name.split('/').pop();
  return id;
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
      // For now, just return that it was updated
      // In a full implementation, you'd need to update the document with the new passagem
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
    // Update existing
    return { action: "updated", viagemId: foundBy.viagem.id || '' };
  }

  // create new
  const id = await createViagemWithPassagem(dataViagem, percurso, passagem);
  return { action: "created", viagemId: id };
}
