const express = require("express");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./swagger/swagger");
const menusRouter = require("./routes/menus");
const queryRoutes = require('./routes/query');
const orderRoutes = require("./routes/order");
const recommendRoutes = require('./routes/recommend');

require("./db");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.use(
    cors({
        origin: "http://localhost:3001",
        credentials: true,
    })
);

app.use("/menus", menusRouter);
app.use('/query', queryRoutes);
app.use('/recommend', recommendRoutes);
app.use("/order", orderRoutes);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

if (process.env.NODE_ENV !== "test") {
    app.listen(port, function () {
        console.log(`Connect to ${port} port!`);
        console.log(`Swagger 문서: http://localhost:${port}/api-docs`);
    });
}

// app.get("/", function (req, res) {
//   res.send("말하면 OK 서버 실행 중");
// });

// sample data 삽입 테스트 후 삭제 예정 -> 일단 지금은 주석처리
// const devRoutes = require("./routes/.dev");
// app.use("/dev", devRoutes);

module.exports = app;
