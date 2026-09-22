import type { Hotel } from "../types/hotel";

class HotelAggregationService {
  aggregate(supplierAHotels: Hotel[], supplierBHotels: Hotel[]): Hotel[] {
    const hotels = new Map<string, Hotel>();

    for (const hotel of [...supplierAHotels, ...supplierBHotels]) {
      const existingHotel = hotels.get(hotel.name);

      if (!existingHotel || hotel.price < existingHotel.price) {
        hotels.set(hotel.name, hotel);
      }
    }

    return Array.from(hotels.values());
  }
}

export default new HotelAggregationService();
