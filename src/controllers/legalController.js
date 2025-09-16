// src/controllers/legalController.js
import LegalDoc from "../models/LegalDocModel.js";

const MAX_LEN = 200_000; // límite de contenido para evitar abusos

function getTenantId(req) {
  return (
    req.headers["x-tenant-id"] || process.env.DEFAULT_TENANT_ID || "default"
  );
}

function normalizeType(type) {
  return type === "privacy" ? "privacy" : "terms";
}

export class LegalController {
  // GET /legal/:type  (público)
  static async getDoc(req, res) {
    try {
      const tenantId = getTenantId(req);
      const type = normalizeType(req.params.type);

      let doc = await LegalDoc.findOne({ tenantId, type });
      if (!doc) {
        // Crea un doc vacío inicial si no existe (para que el admin pueda editar de inmediato)
        doc = await LegalDoc.create({ tenantId, type });
      }
      return res.json(doc.toDTO());
    } catch (e) {
      return res.status(500).json({ message: "Error fetching legal doc" });
    }
  }

  // PUT /legal/:type  (admin)
  static async upsertDoc(req, res) {
    try {
      const tenantId = getTenantId(req);
      const type = normalizeType(req.params.type);

      const {
        content = "",
        version = "1.0",
        effectiveDate, // string ISO o YYYY-MM-DD
      } = req.body || {};

      if (typeof content !== "string" || content.length > MAX_LEN) {
        return res.status(400).json({ message: "Invalid content" });
      }
      if (typeof version !== "string" || !version.trim()) {
        return res.status(400).json({ message: "Invalid version" });
      }

      let eff = new Date();
      if (effectiveDate) {
        const tmp = new Date(effectiveDate);
        if (isNaN(tmp.getTime())) {
          return res.status(400).json({ message: "Invalid effectiveDate" });
        }
        eff = tmp;
      }

      const updated = await LegalDoc.findOneAndUpdate(
        { tenantId, type },
        {
          $set: {
            content,
            version,
            effectiveDate: eff,
            updatedBy: req.user?.id || req.user?._id || null,
          },
        },
        { new: true, upsert: true }
      );

      return res.json(updated.toDTO());
    } catch (e) {
      // conflictos de índice único u otros
      return res.status(500).json({ message: "Error updating legal doc" });
    }
  }
}
