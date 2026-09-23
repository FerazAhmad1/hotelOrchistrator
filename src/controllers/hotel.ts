import type { Request, Response } from "express";
import { getTemporalClient } from "../temporal/client";
import hotelRedisService from "../services/hotel-redis.service";

export const getHotels = async (req: Request, res: Response) => {
  try {
    const city = String(req.query.city || "").trim();

    if (!city) {
      return res.status(400).json({
        success: false,
        message: "city is required",
      });
    }

    const minPrice =
      req.query.minPrice !== undefined ? Number(req.query.minPrice) : undefined;

    const maxPrice =
      req.query.maxPrice !== undefined ? Number(req.query.maxPrice) : undefined;

    if (
      (minPrice !== undefined && Number.isNaN(minPrice)) ||
      (maxPrice !== undefined && Number.isNaN(maxPrice))
    ) {
      return res.status(400).json({
        success: false,
        message: "minPrice and maxPrice must be valid numbers",
      });
    }

    if (
      minPrice !== undefined &&
      maxPrice !== undefined &&
      minPrice > maxPrice
    ) {
      return res.status(400).json({
        success: false,
        message: "minPrice cannot be greater than maxPrice",
      });
    }

    /*
     * -----------------------------------------
     * 1. Check Redis cache
     * -----------------------------------------
     */

    const hasCache = await hotelRedisService.hasHotels(city);

    /*
     * -----------------------------------------
     * 2. Cache MISS
     * -----------------------------------------
     */

    if (!hasCache) {
      const client = await getTemporalClient();

      const result = await client.workflow.execute("hotelWorkflow", {
        taskQueue: "hotel-task-queue",
        workflowId: `hotel-${city}-${Date.now()}`,
        args: [city],
      });

      /*
       * Save deduplicated result to Redis.
       */
      await hotelRedisService.saveHotels(city, result);
    }

    /*
     * -----------------------------------------
     * 3. Cache HIT or freshly populated cache
     * -----------------------------------------
     *
     * Filtering happens inside Redis.
     */

    const hotels = await hotelRedisService.getHotelsByPrice(
      city,
      minPrice,
      maxPrice,
    );

    return res.status(200).json({
      success: true,
      data: hotels,
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
