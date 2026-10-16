/**
 * Error that carries an HTTP status code.
 * The central error middleware turns it into a JSON response.
 */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export const notFound = (message = 'Recurso no encontrado'): HttpError => new HttpError(404, message);
