import type { Request, Response } from "express";
import supplierAService from "../suppliers/supplier-a.service";
export const getHotels = async (req: Request, res: Response) => {
  try {
    const city = req.query.city || "";
    const response = await supplierAService.getHotels(city);
    res.status(200).json({
      success: true,
      data: response,
      message: "",
    });
  } catch (error) {
    res.status(500).json({
      sucess: false,
      message: error.message || "something went wrong ",
    });
  }
};
