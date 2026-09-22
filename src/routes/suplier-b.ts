import express from "express";
import { getHotels } from "../controllers/supplier-a";
const router = express.Router();
router.route("/").get(getHotels);
export default router;
