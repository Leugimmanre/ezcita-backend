// src/routes/debugTenantRoutes.js
import { Router } from "express";
import { tenantMiddleware } from "../middlewares/multi-tenancy/tenantMiddleware.js";

const router = Router();
router.use(tenantMiddleware);

router.get("/whoami", (req, res) => {
  res.json({
    ok: true,
    tenantId: req.tenantId,
  });
});

export default router;
