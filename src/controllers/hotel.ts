import type { Request, Response } from "express";
import { getTemporalClient } from "../temporal/client";

export const getHotels = async (req: Request, res: Response) => {
  try {
    const city = String(req.query.city || "").trim();

    if (!city) {
      return res.status(400).json({
        success: false,
        message: "city is required",
      });
    }

    const client = await getTemporalClient();

    const result = await client.workflow.execute("hotelWorkflow", {
      taskQueue: "hotel-task-queue",
      workflowId: `hotel-${city}`,
      args: [city],
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Something went wrong";

    return res.status(500).json({
      success: false,
      message,
    });
  }
};
