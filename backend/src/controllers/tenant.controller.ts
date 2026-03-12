import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../utils/prisma';
import { sendSuccess, sendError, getPaginationParams } from '../utils/response';
import { AuthRequest, PaginationQuery } from '../types';

// ─── Super Admin: Lister tous les tenants ────────────────────────────────────
export const getAllTenants = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page, limit, search } = req.query as PaginationQuery;
    const { skip, take, page: pageNum, limit: limitNum } = getPaginationParams(page, limit);

    const where = search
      ? { OR: [{ name: { contains: search } }, { email: { contains: search } }] }
      : {};

    const [tenants, total] = await Promise.all([
      prisma.tenant.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { users: true, students: true, teachers: true } },
        },
      }),
      prisma.tenant.count({ where }),
    ]);

    sendSuccess(res, {
      data: tenants,
      pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (err) {
    console.error('GetAllTenants error:', err);
    sendError(res, 'Erreur serveur', 500);
  }
};

// ─── Super Admin: Créer un tenant (école) ────────────────────────────────────
export const createTenant = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, slug, email, phone, address, city, country, plan, adminEmail, adminPassword, adminFirstName, adminLastName } = req.body;

    const existingTenant = await prisma.tenant.findFirst({
      where: { OR: [{ slug }, { email }] },
    });

    if (existingTenant) {
      sendError(res, 'Un tenant avec ce slug ou email existe déjà', 409);
      return;
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    const tenant = await prisma.tenant.create({
      data: {
        id: uuidv4(),
        name,
        slug,
        email,
        phone,
        address,
        city,
        country: country || 'SN',
        plan: plan || 'FREE',
        users: {
          create: {
            id: uuidv4(),
            email: adminEmail,
            password: hashedPassword,
            firstName: adminFirstName,
            lastName: adminLastName,
            role: 'ADMIN',
          },
        },
      },
      include: {
        users: {
          where: { role: 'ADMIN' },
          select: { id: true, email: true, firstName: true, lastName: true, role: true },
        },
      },
    });

    sendSuccess(res, tenant, 'École créée avec succès', 201);
  } catch (err) {
    console.error('CreateTenant error:', err);
    sendError(res, 'Erreur lors de la création de l\'école', 500);
  }
};

// ─── Super Admin: Obtenir un tenant ──────────────────────────────────────────
export const getTenantById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true, students: true, teachers: true, classes: true },
        },
      },
    });

    if (!tenant) {
      sendError(res, 'École non trouvée', 404);
      return;
    }

    sendSuccess(res, tenant);
  } catch (err) {
    console.error('GetTenantById error:', err);
    sendError(res, 'Erreur serveur', 500);
  }
};

// ─── Super Admin: Mettre à jour un tenant ────────────────────────────────────
export const updateTenant = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, email, phone, address, city, country, plan, isActive, logo } = req.body;

    const tenant = await prisma.tenant.update({
      where: { id },
      data: { name, email, phone, address, city, country, plan, isActive, logo },
    });

    sendSuccess(res, tenant, 'École mise à jour avec succès');
  } catch (err) {
    console.error('UpdateTenant error:', err);
    sendError(res, 'Erreur lors de la mise à jour', 500);
  }
};

// ─── Admin: Obtenir son propre tenant ────────────────────────────────────────
export const getMyTenant = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.user!.tenantId },
      include: {
        _count: {
          select: { users: true, students: true, teachers: true, classes: true },
        },
      },
    });

    if (!tenant) {
      sendError(res, 'École non trouvée', 404);
      return;
    }

    sendSuccess(res, tenant);
  } catch (err) {
    console.error('GetMyTenant error:', err);
    sendError(res, 'Erreur serveur', 500);
  }
};

// ─── Admin: Mettre à jour son propre tenant ──────────────────────────────────
export const updateMyTenant = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, phone, address, city, logo } = req.body;

    const tenant = await prisma.tenant.update({
      where: { id: req.user!.tenantId },
      data: { name, phone, address, city, logo },
    });

    sendSuccess(res, tenant, 'École mise à jour avec succès');
  } catch (err) {
    console.error('UpdateMyTenant error:', err);
    sendError(res, 'Erreur lors de la mise à jour', 500);
  }
};
