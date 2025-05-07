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
router.post("/", handleRecommend);

module.exports = router;
