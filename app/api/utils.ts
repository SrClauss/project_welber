// Validador de CPF simples e confiável
// - remove máscara
// - verifica tamanho e repetições inválidas
// - calcula dígitos verificadores
export function isValidCPF(value?: string | null): boolean {
  if (!value) return false;

  // remove tudo que não é dígito
  const cpf = String(value).replace(/\D/g, "");
  if (cpf.length !== 11) return false;

  // elimina CPFs com todos os dígitos iguais (ex.: 00000000000)
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const digits = cpf.split("").map(d => parseInt(d, 10));

  // Validação do primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += digits[i] * (10 - i);
  }
  let rev = (sum * 10) % 11;
  if (rev === 10) rev = 0;
  if (rev !== digits[9]) return false;

  // Validação do segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += digits[i] * (11 - i);
  }
  rev = (sum * 10) % 11;
  if (rev === 10) rev = 0;
  if (rev !== digits[10]) return false;

  return true;
}

/* Exemplos de uso:
console.log(isValidCPF('123.456.789-09')) // false
console.log(isValidCPF('935.411.347-80')) // true (exemplo válido)
*/