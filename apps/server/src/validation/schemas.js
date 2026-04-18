import { z } from "zod";

const baseRole = z.enum(["client", "agent_bancaire", "responsable_decisionnel"]);
const adminRole = z.enum(["client", "agent_bancaire", "responsable_decisionnel", "admin"]);

export const authRegisterBodySchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(190),
    password: z.string().min(6).max(128),
    role: baseRole.optional(),
    address: z.string().trim().max(255).optional().nullable(),
    phone: z.string().trim().max(40).optional().nullable(),
    matricule: z.string().trim().max(80).optional().nullable(),
    department: z.string().trim().max(120).optional().nullable(),
  })
  .strict();

export const authLoginBodySchema = z
  .object({
    email: z.string().trim().email().max(190),
    password: z.string().min(1).max(128),
  })
  .strict();

export const idParamSchema = z
  .object({
    id: z.coerce.number().int().positive(),
  })
  .strict();

export const adminListUsersQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(500).optional(),
  })
  .strict();

export const adminListScrapeSitesQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(200).optional(),
  })
  .strict();

export const propertyListQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(5000).optional(),
    city: z.string().trim().max(120).optional(),
  })
  .strict();

export const favoriteListQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(500).optional(),
  })
  .strict();

export const adminCreateUserBodySchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(190),
    password: z.string().min(6).max(128),
    role: adminRole.optional(),
    address: z.string().trim().max(255).optional().nullable(),
    phone: z.string().trim().max(40).optional().nullable(),
    matricule: z.string().trim().max(80).optional().nullable(),
    department: z.string().trim().max(120).optional().nullable(),
  })
  .strict();

export const adminUpdateUserBodySchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    email: z.string().trim().email().max(190).optional(),
    password: z.string().min(6).max(128).optional(),
    role: adminRole.optional(),
    address: z.string().trim().max(255).optional().nullable(),
    phone: z.string().trim().max(40).optional().nullable(),
    matricule: z.string().trim().max(80).optional().nullable(),
    department: z.string().trim().max(120).optional().nullable(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

const scrapeSiteBaseSchema = {
  name: z.string().trim().min(2).max(120),
  spider_name: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .regex(/^[a-zA-Z0-9_-]+$/, "Invalid spider identifier"),
  base_url: z.string().trim().url().max(255).optional().nullable(),
  start_url: z.string().trim().url().max(255).optional().nullable(),
  description: z.string().trim().max(1000).optional().nullable(),
  is_active: z.boolean().optional(),
};

export const adminCreateScrapeSiteBodySchema = z
  .object(scrapeSiteBaseSchema)
  .strict();

export const adminUpdateScrapeSiteBodySchema = z
  .object({
    name: scrapeSiteBaseSchema.name.optional(),
    spider_name: scrapeSiteBaseSchema.spider_name.optional(),
    base_url: scrapeSiteBaseSchema.base_url,
    start_url: scrapeSiteBaseSchema.start_url,
    description: scrapeSiteBaseSchema.description,
    is_active: scrapeSiteBaseSchema.is_active,
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });
