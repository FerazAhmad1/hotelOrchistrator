import type { Request, Response } from "express";
import supplierAService from "../suppliers/supplier-a.service";
export const getHotels = async (req: Request, res: Response) => {
  try {
    const city = String(req.query.city || "").trim();

    if (!city) {
      return res.status(400).json({
        success: false,
        message: "city is required",
      });
    }
    const response = await supplierAService.getHotels(city);
    res.status(200).json({
      success: true,
      data: response,
      message: "",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Something went wrong";

    res.status(500).json({
      sucess: false,
      message,
    });
  }
};
