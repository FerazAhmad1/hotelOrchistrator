import { HotelSupplier } from "./hotel-supplier.interface";
import { Hotel } from "../types/hotel";

class SupplierBService implements HotelSupplier {
  async getHotels(city: string): Promise<Hotel[]> {
    // Mock supplier API
    return [
      {
        hotelId: "b1",
        name: "Holtin",
        price: 5340,
        city,
        commissionPct: 20,
      },
      {
        hotelId: "b2",
        name: "Radison",
        price: 6200,
        city,
        commissionPct: 15,
      },
      {
        hotelId: "b3",
        name: "Leela",
        price: 6800,
        city,
        commissionPct: 18,
      },
    ];
  }
}
const supplierBService = new SupplierBService();

export default supplierBService;
