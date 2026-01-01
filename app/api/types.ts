/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Interface para criar/atualizar cliente no Asaas (conforme docs: https://docs.asaas.com/reference/criar-novo-cliente)
 * Campos obrigatórios: `name`, `cpfCnpj`.
 */
export interface Cliente {

  /** Nome do cliente */
  name: string;
  /** CPF ou CNPJ */
  cpfCnpj: string;

  /** Email do cliente */
  email?: string;
  /** Telefone fixo */
  phone?: string;
  /** Telefone móvel */
  mobilePhone?: string;

  /** Logradouro */
  address?: string;
  /** Número do endereço */
  addressNumber?: string;
  /** Complemento do endereço (máx. 255 caracteres) */
  complement?: string;
  /** Bairro */
  province?: string;
  /** CEP */
  postalCode?: string;

  /** Identificador no seu sistema */
  externalReference?: string;
  /** true para desabilitar envio de notificações de cobrança */
  notificationDisabled?: boolean;
  /** Emails adicionais separados por "," */
  additionalEmails?: string;

  /** Inscrição municipal */
  municipalInscription?: string;
  /** Inscrição estadual */
  stateInscription?: string;
  /** Observações adicionais */
  observations?: string;
  /** Nome do grupo ao qual o cliente pertence */
  groupName?: string;
  /** Empresa */
  company?: string;
  /** Informe true caso seja pagador estrangeiro */
  foreignCustomer?: boolean;
}


export type Percurso = "São João dos Patos - Teresina" | "Teresina - São João dos Patos";

const HORA_SAIDA_MAP: Record<Percurso, string> = {
  "São João dos Patos - Teresina": "04:30",
  "Teresina - São João dos Patos": "14:00",
};


export interface CheckoutItem {
  name: string;
  description?: string;
  quantity: number;
  value: number; // valor unitário em centavos ou na unidade que você usa
}

export interface CheckoutCallback {
  cancelUrl?: string;
  successUrl?: string;
  expiredUrl?: string;
}

export interface CheckoutInfo {
  id: string;
  link?: string | null;
  status?: string;
  minutesToExpire?: number;
  billingTypes?: string[];
  chargeTypes?: string[];
  callback?: CheckoutCallback;
  items?: CheckoutItem[];
  subscription?: unknown;
  installment?: unknown;
  split?: unknown[];
  customer?: string;
  customerData?: Record<string, unknown>;
  dateCreated?: string;
}

export interface Passagem {
  cliente: Cliente;
  paga: boolean;
  /** Referência usada ao criar o checkout para mapear esta passagem */
  externalReference?: string;
  /** Dados do checkout quando aplicável (preenchido via webhook CHECKOUT_PAID) */
  checkout?: CheckoutInfo;
}
export class Viagem {
  constructor(
    public dataViagem: string,
    public percurso: Percurso,
    public passagens: Passagem[] = [],
    public id?: string
  ) {}

  horaSaida(): string {
    return HORA_SAIDA_MAP[this.percurso] ?? "";
  }

  static fromFirestoreDoc(doc: { id: string; data(): Record<string, unknown> }): Viagem {
    const data = doc.data();
    const passagens: Passagem[] = Array.isArray(data.passagens)
      ? data.passagens.map((p: Record<string, unknown>) => ({
          cliente: (p as any).cliente,
          paga: Boolean((p as any).paga),
          externalReference: (p as any).externalReference,
          checkout: (p as any).checkout,
        }))
      : [];
    return new Viagem(data.dataViagem, data.percurso as Percurso, passagens, doc.id);
  }

  toFirestore() {
    return {
      dataViagem: this.dataViagem,
      percurso: this.percurso,
      passagens: this.passagens,
    } as const;
  }

  /**
   * Associa um checkout (objeto vindo do webhook CHECKOUT_* ) a passagens.
   * - tenta casar por `externalReference` do checkout -> `passagem.externalReference`
   * - se não encontrar, tenta casar por customerData (ex.: cpf/cnpj) comparando com `passagem.cliente.cpfCnpj`
   * Marca `paga = true` quando o evento indicar pagamento e anexa `checkout` na `passagem`.
   * Retorna número de passagens atualizadas.
   */
  applyCheckout(checkout: CheckoutInfo & { externalReference?: string }): number {
    const amount = (checkout.items ?? []).reduce((s, it) => s + (Number(it.value) || 0) * (Number(it.quantity) || 1), 0);
    const datePaid = checkout.dateCreated ?? new Date().toISOString();

    // 1) match by externalReference
    const byExternal = (checkout.externalReference && this.passagens.filter(p => p.externalReference === checkout.externalReference)) || [];

    // 2) fallback: match by cpfCnpj in customerData
    const cpf = checkout.customerData?.cpfCnpj || checkout.customerData?.cpf;
    const byCpf = cpf ? this.passagens.filter(p => p.cliente?.cpfCnpj === cpf) : [];

    // 3) fallback: match by customer id
    const byCustomerId = checkout.customer ? this.passagens.filter(p => p.cliente?.externalReference === checkout.customer) : [];

    const matches = [...new Set([...byExternal, ...byCpf, ...byCustomerId])];

    matches.forEach(p => {
      p.paga = true;
      p.checkout = {
        id: checkout.id,
        link: checkout.link,
        status: checkout.status,
        minutesToExpire: checkout.minutesToExpire,
        billingTypes: checkout.billingTypes,
        chargeTypes: checkout.chargeTypes,
        callback: checkout.callback,
        items: checkout.items,
        subscription: checkout.subscription,
        installment: checkout.installment,
        split: checkout.split,
        customer: checkout.customer,
        customerData: checkout.customerData,
        dateCreated: datePaid,
        // store computed amount (convenience)
        // note: amount is in same unit as `value` in items
        // we keep it optional
        amount: amount,
      } as CheckoutInfo;
    });

    return matches.length;
  }
  /**
   * Verifica se é possível adicionar `n` passagens sem exceder MAX_LUGARES.
   * Lê `process.env.MAX_LUGARES` (deve ser inteiro positivo).
   */
  canAddPassagem(n: number = 1): boolean {
    const max = Number(process.env.MAX_LUGARES);
    if (!Number.isFinite(max) || max <= 0) {
      throw new Error('ENV inválida: defina uma variável de ambiente numérica e positiva `MAX_LUGARES`.');
    }
    return this.passagens.length + n <= max;
  }

  addPassagem(p: Passagem) {
    if (!this.canAddPassagem(1)) {
      const max = Number(process.env.MAX_LUGARES);
      throw new Error(`Não é possível adicionar passagem: limite de ${max} lugares excedido.`);
    }
    this.passagens.push(p);
  }

  countPassagens(): number {
    return this.passagens.length;
  }

  countPassagensPagas(): number {
    return this.passagens.filter((p) => p.paga).length;
  }
}