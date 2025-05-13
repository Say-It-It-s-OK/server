const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");

/**
 * @swagger
 * /order:
 *   post:
 *     summary: 주문 관련 요청 처리
 *     description: 음성 기반 주문 처리 요청을 받아 적절한 응답을 반환합니다.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               request:
 *                 type: string
 *                 enum: [query.order.add, query.order.update, query.order.delete, query.order.pay]
 *               payload:
 *                 type: object
 *                 example:
 *                   item:
 *                     name: 아메리카노
 *                     size: M
 *                     temperature: 아이스
 *                   sessionId: test-session-001
 *     responses:
 *       200:
 *         description: 주문 요청에 대한 처리 결과
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 response:
 *                   type: string
 *                 speech:
 *                   type: string
 *                 page:
 *                   type: string
 *                 sessionId:
 *                   type: string
 *                 items:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       type:
 *                         type: string
 *                       price:
 *                         type: number
 *                       selectedOptions:
 *                         type: object
 *                 needOptions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       missing:
 *                         type: array
 *                         items: { type: string }
 *                 options:
 *                   type: object
 *             example:
 *               response: query.order.add
 *               speech: "아메리카노의 사이즈와 온도를 선택해주세요"
 *               sessionId: test-session-001
 *               page: order_option_required
 *               item:
 *                 name: 아메리카노
 *               needOptions:
 *                 - name: 아메리카노
 *                   missing: [사이즈, 온도]
 *               options:
 *                 사이즈: [S, M, L]
 *                 온도: [핫, 아이스]
 */

router.post("/", orderController.handleOrder);

module.exports = router;
