import { redis } from "../redis";
import type { Hotel } from "../types/hotel";

class HotelRedisService {
  private getDataKey(city: string) {
    return `hotels:${city.toLowerCase()}:data`;
  }

  private getPriceKey(city: string) {
    return `hotels:${city.toLowerCase()}:price`;
  }

  /**
   * Check whether we already have a cached hotel snapshot for the city.
   */
  async hasHotels(city: string): Promise<boolean> {
    const dataKey = this.getDataKey(city);

    const exists = await redis.exists(dataKey);

    return exists === 1;
  }

  /**
   * Save the complete deduplicated hotel list to Redis.
   *
   * Hash:
   * hotels:delhi:data
   *   Holtin  -> JSON
   *   Radison -> JSON
   *
   * Sorted Set:
   * hotels:delhi:price
   *   5340 -> Holtin
   *   5900 -> Radison
   */
  async saveHotels(city: string, hotels: Hotel[]): Promise<void> {
    const dataKey = this.getDataKey(city);
    const priceKey = this.getPriceKey(city);

    // Remove the previous snapshot.
    await redis.del(dataKey, priceKey);

    if (hotels.length === 0) {
      return;
    }

    const pipeline = redis.pipeline();

    for (const hotel of hotels) {
      // Store complete hotel object.
      pipeline.hset(dataKey, hotel.name, JSON.stringify(hotel));

      // Store price as the sorted-set score.
      pipeline.zadd(priceKey, hotel.price, hotel.name);
    }

    await pipeline.exec();
  }

  /**
   * Get hotels from Redis.
   *
   * Price filtering is performed by Redis using the Sorted Set.
   */
  async getHotelsByPrice(
    city: string,
    minPrice?: number,
    maxPrice?: number,
  ): Promise<Hotel[]> {
    const dataKey = this.getDataKey(city);
    const priceKey = this.getPriceKey(city);

    const min = minPrice !== undefined ? String(minPrice) : "-inf";
    const max = maxPrice !== undefined ? String(maxPrice) : "+inf";

    // Redis performs the price filtering here.
    const hotelNames = await redis.zrange(priceKey, min, max, "BYSCORE");

    if (hotelNames.length === 0) {
      return [];
    }

    // Fetch the complete hotel objects from the Hash.
    const hotelData = await redis.hmget(dataKey, ...hotelNames);

    return hotelData
      .filter((hotel): hotel is string => hotel !== null)
      .map((hotel) => JSON.parse(hotel) as Hotel);
  }

  /**
   * Delete the cached hotel data for a city.
   */
  async deleteHotels(city: string): Promise<void> {
    const dataKey = this.getDataKey(city);
    const priceKey = this.getPriceKey(city);

    await redis.del(dataKey, priceKey);
  }
}

export default new HotelRedisService();
