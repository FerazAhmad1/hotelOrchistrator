import express from "express";
import suplierARouter from "./routes/suplier-a";
import suplierBRouter from "./routes/suplier-b";
const app = express();

app.use(express.json());

app.use("/supplierA/hotels", suplierARouter);
app.use("/supplierB/hotels", suplierBRouter);
export default app;
