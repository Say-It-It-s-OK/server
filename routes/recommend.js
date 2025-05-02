// routes/recommend.js
const express = require("express");
const router = express.Router();
const Order = require("../models/orders");
const { handleRecommend } = require("../controllers/recommendController");

/**
 * @swagger
 * /recommend/cost/low:
 *   get:
 *     summary: 가격/타입 조건으로 메뉴 추천
 *     description: 가격 이하의 메뉴 또는 타입별로 필터링된 추천 메뉴를 반환합니다.
 *     parameters:
 *       - in: query
 *         name: price
 *         schema:
 *           type: number
 *         required: true
 *         description: 가격 상한선 (이 값 이하의 메뉴만 반환)
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [coffee, drink, decaffeine, dessert]
 *         required: false
 *         description: 메뉴 타입 (선택 사항)
 *     responses:
 *       200:
 *         description: 추천 메뉴 목록
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 response:
 *                   type: string
 *                   example: query.recommend
 *                 speech:
 *                   type: string
 *                   example: 3000원 이하의 디저트 메뉴를 추천해드릴게요
 *                 page:
 *                   type: string
 *                   example: recommend_price_low
 *                 items:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       type:
 *                         type: string
 *                       price:
 *                         type: number
 *                       totalOrders:
 *                         type: number
 */

router.get("/cost/low", async (req, res) => {
    const maxPrice = Number(req.query.price);
    const typeKey = req.query.type;
    const menuType = typeKey ? typeMap[typeKey] : null;
  
    if (!maxPrice || isNaN(maxPrice)) {
      return res.status(400).json({ error: "유효한 price 값을 query string으로 포함해주세요." });
    }
  
    const matchStage = {
      "menu.price": { $lte: maxPrice }
    };
    if (menuType) matchStage["menu.type"] = menuType;
  
    try {
      const results = await Order.aggregate([
        {
          $lookup: {
            from: "Menu",
            localField: "menu_id",
            foreignField: "id",
            as: "menu"
          }
        },
        { $unwind: "$menu" },
        { $match: matchStage },
        {
          $group: {
            _id: "$menu_id",
            id: { $first: "$menu.id" },
            name: { $first: "$menu.name" },
            type: { $first: "$menu.type" },
            price: { $first: "$menu.price" },
            totalOrders: { $sum: "$quantity" }
          }
        },
        { $sort: { totalOrders: -1 } }
      ]);
  
      const speechText = menuType
        ? `${maxPrice}원 이하의 ${menuType} 메뉴를 추천해드릴게요`
        : `${maxPrice}원 이하의 메뉴를 추천해드릴게요`;
  
      res.json({
        response: "query.recommend",
        speech: speechText,
        page: "recommend_price_low",
        items: results
      });
    } catch (err) {
      console.error("가격 기반 추천 오류:", err);
      res.status(500).json({ error: "추천 처리 중 오류 발생" });
    }
  });


/**
 * @swagger
 * /recommend:
 *   post:
 *     summary: 조건 기반 메뉴 추천
 *     description: 카테고리, 태그 등을 기준으로 추천된 메뉴를 반환합니다.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               request:
 *                 type: string
 *                 example: query.recommend
 *               payload:
 *                 type: object
 *                 properties:
 *                   categories:
 *                     type: array
 *                     items:
 *                       type: string
 *                     example: ["coffee", "drink"]
 *                   filters:
 *                     type: object
 *                     properties:
 *                       tag:
 *                         type: array
 *                         items:
 *                           type: string
 *                         example: ["popular"]
 *     responses:
 *       200:
 *         description: 추천된 메뉴 리스트
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 response:
 *                   type: string
 *                   example: query.recommend
 *                 speech:
 *                   type: string
 *                 page:
 *                   type: string
 *                 items:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       type:
 *                         type: string
 *                       price:
 *                         type: number
 */
router.post("/", handleRecommend);

module.exports = router;
