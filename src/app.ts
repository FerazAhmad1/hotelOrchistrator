import express from "express";
import suplierARouter from "./routes/suplier-a";
import suplierBRouter from "./routes/suplier-b";
import hotelRouter from "./routes/hotel";
const app = express();

app.use(express.json());

app.use("/api/hotels", hotelRouter);
app.use("/supplierA/hotels", suplierARouter);
app.use("/supplierB/hotels", suplierBRouter);
export default app;
