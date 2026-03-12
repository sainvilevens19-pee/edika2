import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response';

export const notFound = (req: Request, res: Response): void => {
  sendError(res, `Route ${req.originalUrl} non trouvée`, 404);
};

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void => {
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);

  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  sendError(res, err.message || 'Erreur interne du serveur', statusCode);
};
