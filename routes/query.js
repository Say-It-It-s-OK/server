const express = require("express");
const queryController = require("../controllers/queryController");

/**
 * @swagger
 * /query:
 *   post:
 *     summary: 메뉴 추천 및 조회 처리
 *     description: 사용자의 추천 요청에 따라 메뉴를 조회하고 추천을 반환합니다.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               request:
 *                 type: string
 *                 enum:
 *                   - query.recommend.popular
 *                   - query.recommend.cafe
 *                   - query.recommend.decafein
 *                   - query.recommend.dessert
 *                   - query.confirm.menu
 *                   - query.confirm.order
 *                   - query.confirm.cost
 *                   - query.choose_temperature
 *                   - query.choose_size
 *                   - query.choose_strength
 *                   - query.cancel.order
 *                   - query.exit
 *
 *     responses:
 *       200:
 *         description: 요청에 따른 응답 텍스트 및 버튼 정보
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 text:
 *                   type: string
 *                 buttons:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       label:
 *                         type: string
 *                       action:
 *                         type: string
 */

const router = express.Router();

router.post("/", queryController.handleQuery);

module.exports = router;
