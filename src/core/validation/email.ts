/**
 * Matches backend `IsValidEmail` (`internal/handlers/validators/general.go`).
 * Allows `+` in the local part (e.g. Gmail aliases like `user+tag@gmail.com`).
 */
const EMAIL_PATTERN = /^[\w.+-]+@[\w.-]+\.\w+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email.trim());
}
