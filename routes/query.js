const express = require("express");
const router = express.Router();
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
 *                   - query.recommend.zero
 *                   - query.recommend.cafe
 *                   - query.recommend.decafein
 *                   - query.recommend.smoothie
 *                   - query.recommend.tea
 *                   - query.recommend.dessert
 *                   - query.confirm.menu
 *                   - query.confirm.order
 *                   - query.confirm.cost
 *                   - query.exit
 *                   - query.cancel.order  # 초기 화면으로 돌아가기 추가
 *                   - query.choose_temperature  # Hot/Cold 옵션
 *                   - query.choose_size  # 사이즈 선택 (Small/Medium/Large)
 *                   - query.choose_strength  # 커피 진한 정도 (진하게/보통/연하게)
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

router.post("/", queryController.handleQuery);

module.exports = router;
