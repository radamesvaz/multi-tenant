/** Matches backend `IsValidEmail` (`internal/handlers/validators/general.go`). */
const EMAIL_PATTERN = /^[\w.-]+@[\w.-]+\.\w+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email.trim());
}
