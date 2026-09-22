import { Hotel } from "../types/hotel";

export interface HotelSupplier {
  getHotels(city: string): Promise<Hotel[]>;
}
