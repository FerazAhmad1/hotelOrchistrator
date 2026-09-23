import type { Request, Response } from "express";
import supplierBService from "../suppliers/supplier-b.service";
export const getHotels = async (req: Request, res: Response) => {
  try {
    const city = String(req.query.city || "").trim();

    if (!city) {
      return res.status(400).json({
        success: false,
        message: "city is required",
      });
    }
    const response = await supplierBService.getHotels(city);
    res.status(200).json({
      success: true,
      data: response,
      message: "",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Something went wrong";

    res.status(500).json({
      success: false,
      message,
    });
  }
};
