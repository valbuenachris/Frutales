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

/**
 * Creates a 404 Not Found error.
 * @param {string} message - The error message.
 * @returns {HttpError} The created error.
 */
export const notFound = (message = 'Recurso no encontrado'): HttpError => new HttpError(404, message);

/**
 * Creates a 400 Bad Request error.
 * @param {string} message - The error message.
 * @returns {HttpError} The created error.
 */
export const badRequest = (message: string): HttpError => new HttpError(400, message);

/**
 * Creates a 401 Unauthorized error.
 * @param {string} message - The error message.
 * @returns {HttpError} The created error.
 */
export const unauthorized = (message = 'Debes iniciar sesión para continuar'): HttpError =>
  new HttpError(401, message);

/**
 * Creates a 403 Forbidden error.
 * @param {string} message - The error message.
 * @returns {HttpError} The created error.
 */
export const forbidden = (message = 'No tienes permisos para realizar esta acción'): HttpError =>
  new HttpError(403, message);
