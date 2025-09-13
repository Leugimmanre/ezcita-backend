import { Router } from "express";
import Activity from "../models/ActivityModel.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { tenantMiddleware } from "../middlewares/multi-tenancy/tenantMiddleware.js";
import { requireVerified } from "../middlewares/requireVerified.js";

const router = Router();
router.use(authMiddleware);
router.use(tenantMiddleware);
router.use(requireVerified);

// 🇪🇸 GET recientes: /api/activity?limit=8&category=Servicios
router.get("/", async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 10, 50);
    const category = (req.query.category || "").trim();

    const filter = { tenantId: req.tenantId };
    if (category) filter.category = category;

    const items = await Activity.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const lastUpdateAt = items[0]?.createdAt || null;

    res.json({ ok: true, items, lastUpdateAt });
  } catch (err) {
    next(err);
  }
});

export default router;
