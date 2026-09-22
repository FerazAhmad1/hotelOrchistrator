import { HotelSupplier } from "./hotel-supplier.interface";
import { Hotel } from "../types/hotel";

class SupplierAService implements HotelSupplier {
  async getHotels(city: string): Promise<Hotel[]> {
    // Mock supplier API
    return [
      {
        hotelId: "a1",
        name: "Holtin",
        price: 6000,
        city,
        commissionPct: 10,
      },
      {
        hotelId: "a2",
        name: "Radison",
        price: 5900,
        city,
        commissionPct: 13,
      },
      {
        hotelId: "a3",
        name: "Taj",
        price: 7500,
        city,
        commissionPct: 12,
      },
    ];
  }
}
const supplierAService = new SupplierAService();

export default supplierAService;
