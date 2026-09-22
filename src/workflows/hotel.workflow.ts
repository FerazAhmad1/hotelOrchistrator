import { proxyActivities } from "@temporalio/workflow";

import type * as activities from "../activities/hotel.activities";
import type { Hotel } from "../types/hotel";

const { fetchSupplierA, fetchSupplierB } = proxyActivities<typeof activities>({
  startToCloseTimeout: "10 seconds",
});

export async function hotelWorkflow(city: string): Promise<Hotel[]> {
  const [supplierAHotels, supplierBHotels] = await Promise.all([
    fetchSupplierA(city),
    fetchSupplierB(city),
  ]);

  const hotels = new Map<string, Hotel>();

  for (const hotel of [...supplierAHotels, ...supplierBHotels]) {
    const existing = hotels.get(hotel.name);

    if (!existing || hotel.price < existing.price) {
      hotels.set(hotel.name, hotel);
    }
  }

  return Array.from(hotels.values());
}
