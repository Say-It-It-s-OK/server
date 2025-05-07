// routes/recommend.js
const express = require("express");
const recommendController = require("../controllers/recommendController");
const router = express.Router();
const Order = require("../models/orders");
const { handleRecommend } = require("../controllers/recommendController");

/**
 * @swagger
 * /recommend:
 *   post:
 *     summary: 통합 조건 기반 메뉴 추천
 *     description: 카테고리, 태그, 가격, 카페인, 포함/제외 재료를 고려하여 추천 메뉴를 반환합니다.
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
 *                     example: ["coffee", "dessert"]
 *                   filters:
 *                     type: object
 *                     properties:
 *                       tag:
 *                         type: array
 *                         items:
 *                           type: string
 *                         example: ["popular", "sweet"]
 *                       caffeine:
 *                         type: string
 *                         example: "decaffeine"
 *                       price:
 *                         type: object
 *                         properties:
 *                           min:
 *                             type: number
 *                             example: 2000
 *                           max:
 *                             type: number
 *                             example: 5000
 *                           sort:
 *                             type: string
 *                             enum: [asc, desc]
 *                       include_ingredients:
 *                         type: array
 *                         items:
 *                           type: string
 *                         example: ["딸기", "우유"]
 *                       exclude_ingredients:
 *                         type: array
 *                         items:
 *                           type: string
 *                         example: ["커피"]
 *     responses:
 *       200:
 *         description: 조건 기반 메뉴 추천 결과
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
 *                   example: 조건에 맞춰 추천해드릴게요.
 *                 page:
 *                   type: string
 *                   example: recommend_custom
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
<<<<<<< HEAD

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
 *     summary: 추천 요청 처리
 *     description: 사용자의 자연어 쿼리를 분석하여 적절한 응답을 반환합니다.
 *     responses:
 *       200:
 *         description: 추천 처리 결과 반환
 */
router.post("/", recommendController.handleRecommend);

=======
router.post("/", handleRecommend);
>>>>>>> main

module.exports = router;
