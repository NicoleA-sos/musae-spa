export class AppError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function getUserFacingError(
  error: unknown,
  fallback = 'Ocurrió un problema. Inténtalo nuevamente.',
): string {
  const message = error instanceof Error ? error.message : '';
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes('invalid login credentials')) {
    return 'El correo o la contraseña no son correctos.';
  }

  if (normalizedMessage.includes('email not confirmed')) {
    return 'Confirma tu correo electrónico antes de iniciar sesión.';
  }

  if (normalizedMessage.includes('user already registered')) {
    return 'Ya existe una cuenta con este correo. Intenta iniciar sesión.';
  }

  if (normalizedMessage.includes('password')) {
    return 'La contraseña no cumple los requisitos de seguridad.';
  }

  if (error instanceof AppError) return error.message;

  if (message) {
    if (normalizedMessage.includes('network')) {
      return 'No fue posible conectarse. Revisa tu conexión e inténtalo nuevamente.';
    }
  }

  return fallback;
}
