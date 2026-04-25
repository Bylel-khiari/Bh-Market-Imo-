import { z } from "zod";

const adminRole = z.enum(["client", "agent_bancaire", "admin"]);

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

export const adminStartScraperBodySchema = z
  .object({
    interval_days: z.coerce.number().int().min(1).max(365).optional(),
  })
  .strict();

export const adminUpdateScraperControlBodySchema = z
  .object({
    interval_days: z.coerce.number().int().min(1).max(365).optional(),
    is_enabled: z.boolean().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export const adminListPropertiesQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(5000).optional(),
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

const adminPropertyBaseSchema = {
  title: z.string().trim().min(2).max(255),
  price_raw: z.string().trim().max(255).optional().nullable(),
  price_value: z.number().finite().min(0).optional().nullable(),
  location_raw: z.string().trim().max(255).optional().nullable(),
  city: z.string().trim().max(120).optional().nullable(),
  country: z.string().trim().max(120).optional().nullable(),
  image: z.string().trim().max(2000).optional().nullable(),
  description: z.string().trim().max(5000).optional().nullable(),
  source: z.string().trim().max(120).optional().nullable(),
  url: z.string().trim().max(2000).optional().nullable(),
  scraped_at: z.string().trim().max(50).optional().nullable(),
  is_active: z.boolean().optional(),
};

const propertyReportCategorySchema = z.enum([
  "cannot_open_site",
  "bad_owner_experience",
  "bad_agency_experience",
  "scam_suspicion",
  "incorrect_information",
  "other",
]);

const propertyReportStatusSchema = z.enum(["unread", "in_review", "resolved", "rejected"]);
const creditApplicationStatusSchema = z.enum([
  "SOUMIS",
  "DOCUMENTS_MANQUANTS",
  "EN_VERIFICATION",
  "EN_ETUDE",
  "ACCEPTE",
  "REFUSE",
]);

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

export const adminCreatePropertyBodySchema = z
  .object(adminPropertyBaseSchema)
  .strict();

export const adminUpdatePropertyBodySchema = z
  .object({
    title: adminPropertyBaseSchema.title.optional(),
    price_raw: adminPropertyBaseSchema.price_raw,
    price_value: adminPropertyBaseSchema.price_value,
    location_raw: adminPropertyBaseSchema.location_raw,
    city: adminPropertyBaseSchema.city,
    country: adminPropertyBaseSchema.country,
    image: adminPropertyBaseSchema.image,
    description: adminPropertyBaseSchema.description,
    source: adminPropertyBaseSchema.source,
    url: adminPropertyBaseSchema.url,
    scraped_at: adminPropertyBaseSchema.scraped_at,
    is_active: adminPropertyBaseSchema.is_active,
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export const propertyReportCreateBodySchema = z
  .object({
    category: propertyReportCategorySchema,
    message: z.string().trim().min(6).max(2000),
  })
  .strict();

export const adminListPropertyReportsQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(2000).optional(),
    status: z.union([z.literal("all"), propertyReportStatusSchema]).optional(),
  })
  .strict();

export const adminUpdatePropertyReportStatusBodySchema = z
  .object({
    status: z.enum(["in_review", "resolved", "rejected"]),
    admin_note: z.string().trim().max(2000).optional().nullable(),
  })
  .strict();

export const creditApplicationCreateBodySchema = z
  .object({
    property_id: z.coerce.number().int().positive().optional(),
    full_name: z.string().trim().min(2).max(160),
    email: z.string().trim().email().max(190),
    phone: z.string().trim().min(8).max(40),
    cin: z.string().trim().min(4).max(40),
    rib: z.string().trim().min(8).max(64),
    funding_type: z.string().trim().max(64).optional().nullable(),
    socio_category: z.string().trim().max(64).optional().nullable(),
    property_title: z.string().trim().max(255).optional().nullable(),
    property_location: z.string().trim().max(255).optional().nullable(),
    property_price_value: z.coerce.number().finite().min(0).optional().nullable(),
    property_price_raw: z.string().trim().max(255).optional().nullable(),
    requested_amount: z.coerce.number().finite().min(0).optional().nullable(),
    personal_contribution: z.coerce.number().finite().min(0).optional().nullable(),
    gross_income: z.coerce.number().finite().min(0).optional().nullable(),
    income_period: z.enum(["monthly", "annual"]).optional().nullable(),
    duration_months: z.coerce.number().int().min(12).max(360).optional().nullable(),
    estimated_monthly_payment: z.coerce.number().finite().min(0).optional().nullable(),
    estimated_rate: z.coerce.number().finite().min(0).max(100).optional().nullable(),
    debt_ratio: z.coerce.number().finite().min(0).max(100).optional().nullable(),
    documents: z.array(z.string().trim().min(1).max(200)).max(40).optional(),
  })
  .strict();

export const creditApplicationListQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(200).optional(),
  })
  .strict();

export const agentListCreditApplicationsQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(500).optional(),
    status: z.union([z.literal("all"), creditApplicationStatusSchema]).optional(),
    search: z.string().trim().max(190).optional(),
  })
  .strict();

export const agentUpdateCreditApplicationBodySchema = z
  .object({
    status: creditApplicationStatusSchema.optional(),
    compliance_score: z.coerce.number().int().min(0).max(100).optional().nullable(),
    compliance_summary: z.string().trim().max(4000).optional().nullable(),
    agent_note: z.string().trim().max(4000).optional().nullable(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });
