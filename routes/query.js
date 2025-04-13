const express = require("express");
const queryController = require("../controllers/queryController");
const Menu = require("../models/menu");
const router = express.Router();

/**
 * @swagger
 * /query/confirm/menu/{type}:
 *   get:
 *     summary: 특정 메뉴 카테고리 조회
 *     description: 클라이언트에서 요청한 메뉴 카테고리 데이터를 반환합니다.
 *     parameters:
 *       - in: path
 *         name: type
 *         description: 메뉴 카테고리 (커피, 음료, 디카페인, 디저트)
 *         required: true
 *         schema:
 *           type: string
 *           enum: [coffee, drink, decafein, dessert]
 *     responses:
 *       200:
 *         description: 메뉴 목록 반환
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 response:
 *                   type: string
 *                   example: query.confirm
 *                 speech:
 *                   type: string
 *                   example: 고객님 요청에 따라 [메뉴명] 메뉴를 보여드립니다
 *                 page:
 *                   type: string
 *                   enum: [coffee, drink, decafein, dessert]
 *                   example: coffee
 *                 items:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       price:
 *                         type: number
 */

router.get("/confirm/menu/:type", async (req, res) => {
  const { type } = req.params;
  const typeMap = {
    coffee: "커피",
    drink: "음료",
    decafein: "디카페인",
    dessert: "디저트",
  };

  const menuType = typeMap[type];

  try {
    const menus = await Menu.find({ type: menuType });
    return res.json({
      response: "query.confirm",
      speech: `고객님 요청에 따라 ${menuType} 메뉴를 보여드립니다`,
      page: type,
      items: menus,
    });
  } catch (err) {
    return res.status(500).json({ error: "메뉴 조회 실패" });
  }
});

/**
 * @swagger
 * /query/confirm/cart:
 *   get:
 *     summary: 장바구니 조회
 *     description: 클라이언트에서 요청한 장바구니 데이터를 반환합니다.
 *     responses:
 *       200:
 *         description: 장바구니 목록 반환
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 response:
 *                   type: string
 *                   example: query.confirm
 *                 speech:
 *                   type: string
 *                   example: 고객님 요청에 따라 장바구니를 보여드립니다
 *                 page:
 *                   type: string
 *                   example: cart
 */

router.get("/confirm/cart", async (req, res) => {
  return res.json({
    response: "query.confirm",
    speech: "고객님 요청에 따라 장바구니를 보여드립니다",
    page: "cart",
  });
});

/**
 * @swagger
 * /query/confirm/details:
 *   get:
 *     summary: 결제 내역 조회
 *     description: 클라이언트에서 요청한 결제 내역을 반환합니다.
 *     responses:
 *       200:
 *         description: 결제 내역 반환
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 response:
 *                   type: string
 *                   example: query.confirm
 *                 speech:
 *                   type: string
 *                   example: 고객님 요청에 따라 결제 내용을 보여드립니다
 *                 page:
 *                   type: string
 *                   example: details
 */

router.get("/confirm/details", async (req, res) => {
  return res.json({
    response: "query.cofirm",
    speech: "고객님 요청에 따라 결제 내용을 보여드립니다",
    page: "details",
  });
});


router.post("/", queryController.handleQuery);

module.exports = router;
