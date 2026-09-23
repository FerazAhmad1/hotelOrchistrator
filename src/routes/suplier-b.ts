import express from "express";
import { getHotels } from "../controllers/suplier-b";
const router = express.Router();
router.route("/").get(getHotels);
export default router;
