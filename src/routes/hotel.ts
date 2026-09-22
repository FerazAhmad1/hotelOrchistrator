import { Router } from "express";
import { getHotels } from "../controllers/hotel";

const router = Router();

router.get("/", getHotels);

export default router;
