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
  if (error instanceof AppError) return error.message;

  if (error instanceof Error) {
    if (error.message.toLowerCase().includes('network')) {
      return 'No fue posible conectarse. Revisa tu conexión e inténtalo nuevamente.';
    }
  }

  return fallback;
}
