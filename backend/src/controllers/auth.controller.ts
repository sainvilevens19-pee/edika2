import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../utils/prisma';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../types';

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, tenantSlug } = req.body;

    // Find tenant
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    });

    if (!tenant || !tenant.isActive) {
      sendError(res, 'École non trouvée ou inactive', 404);
      return;
    }

    // Find user in tenant
    const user = await prisma.user.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email } },
    });

    if (!user || !user.isActive) {
      sendError(res, 'Identifiants invalides', 401);
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      sendError(res, 'Identifiants invalides', 401);
      return;
    }

    const payload = {
      userId: user.id,
      tenantId: tenant.id,
      role: user.role,
      email: user.email,
    };

    const accessToken = generateAccessToken(payload);
    const refreshTokenValue = generateRefreshToken(payload);

    // Save refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.refreshToken.create({
      data: {
        id: uuidv4(),
        userId: user.id,
        token: refreshTokenValue,
        expiresAt,
      },
    });

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    sendSuccess(res, {
      accessToken,
      refreshToken: refreshTokenValue,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatar: user.avatar,
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          logo: tenant.logo,
        },
      },
    }, 'Connexion réussie');
  } catch (err) {
    console.error('Login error:', err);
    sendError(res, 'Erreur lors de la connexion', 500);
  }
};

export const superAdminLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findFirst({
      where: { email, role: 'SUPER_ADMIN' },
      include: { tenant: true },
    });

    if (!user) {
      sendError(res, 'Identifiants invalides', 401);
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      sendError(res, 'Identifiants invalides', 401);
      return;
    }

    const payload = {
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role,
      email: user.email,
    };

    const accessToken = generateAccessToken(payload);
    const refreshTokenValue = generateRefreshToken(payload);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.refreshToken.create({
      data: {
        id: uuidv4(),
        userId: user.id,
        token: refreshTokenValue,
        expiresAt,
      },
    });

    sendSuccess(res, {
      accessToken,
      refreshToken: refreshTokenValue,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatar: user.avatar,
      },
    }, 'Connexion super admin réussie');
  } catch (err) {
    console.error('Super admin login error:', err);
    sendError(res, 'Erreur lors de la connexion', 500);
  }
};

export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      sendError(res, 'Refresh token manquant', 400);
      return;
    }

    const storedToken = await prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      sendError(res, 'Refresh token invalide ou expiré', 401);
      return;
    }

    const payload = verifyRefreshToken(token);
    const newAccessToken = generateAccessToken({
      userId: payload.userId,
      tenantId: payload.tenantId,
      role: payload.role,
      email: payload.email,
    });

    sendSuccess(res, { accessToken: newAccessToken }, 'Token rafraîchi');
  } catch {
    sendError(res, 'Refresh token invalide', 401);
  }
};

export const logout = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { refreshToken: token } = req.body;

    if (token) {
      await prisma.refreshToken.deleteMany({ where: { token } });
    }

    sendSuccess(res, null, 'Déconnexion réussie');
  } catch (err) {
    console.error('Logout error:', err);
    sendError(res, 'Erreur lors de la déconnexion', 500);
  }
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: { tenant: true },
    });

    if (!user) {
      sendError(res, 'Utilisateur non trouvé', 404);
      return;
    }

    sendSuccess(res, {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      avatar: user.avatar,
      phone: user.phone,
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
        slug: user.tenant.slug,
        logo: user.tenant.logo,
      },
    });
  } catch (err) {
    console.error('GetMe error:', err);
    sendError(res, 'Erreur serveur', 500);
  }
};
