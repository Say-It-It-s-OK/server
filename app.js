const express = require("express");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./swagger/swagger");

const app = express();

const port = 3000;

app.use(express.json());

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.listen(port, function () {
  console.log(`Connect to ${port} port!`);
  console.log(`Swagger 문서: http://localhost:${port}/api-docs`);
});

app.get("/", function (req, res) {
  res.send("말하면 OK 서버 실행 중");
});
