import { slugifyTenant } from "./slugifyTenant.js";

export const cloudFolder = (tenantId, kind = "misc") => {
  const slug = slugifyTenant(tenantId || "");
  if (!slug) throw new Error("Invalid tenantId for Cloudinary folder");
  return `ezcita/${slug}/${kind}`;
};
