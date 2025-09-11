// src/index.js
import server from "./server.js";
import colors from "colors";

const port = process.env.PORT || 4000;

server.listen(port, () => {
  console.log(colors.cyan.bold(`Server running on port ${port}`));
});
