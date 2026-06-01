export type PasswordValidationResult = {
  valid: boolean;
  reasons: string[];
};

/** Aligned with backend `ValidatePassword`. */
export function validatePassword(password: string): PasswordValidationResult {
  const reasons: string[] = [];
  if (password.length < 8) {
    reasons.push('Al menos 8 caracteres');
  }
  if (!/[A-Z]/.test(password)) {
    reasons.push('Al menos una mayúscula');
  }
  if (!/[a-z]/.test(password)) {
    reasons.push('Al menos una minúscula');
  }
  if (!/\d/.test(password)) {
    reasons.push('Al menos un dígito');
  }
  if (!/[\p{P}\p{S}]/u.test(password)) {
    reasons.push('Al menos un carácter especial');
  }
  return { valid: reasons.length === 0, reasons };
}
