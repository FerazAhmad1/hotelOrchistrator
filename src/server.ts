import app from "./app";
import { config } from "./config/env";
app.listen(config.port, () => {
  console.log("server running on 8000 port");
});
