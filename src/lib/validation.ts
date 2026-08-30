export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function isValidPhone(phone: string): boolean {
  return /^[0-9+\s-]{7,15}$/.test(phone.trim());
}

export function isStrongEnoughPassword(password: string): boolean {
  return password.length >= 8;
}