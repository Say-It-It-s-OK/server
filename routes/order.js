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
 *                 enum:
 *                   - query.order.add
 *                   - query.order.update
 *                   - query.order.delete
 *                   - query.order.pay
 *               type:
 *                 type: array
 *                 items:
 *                   type: string
 *               options:
 *                 type: object
 *                 properties:
 *                   size:
 *                     type: array
 *                     items: { type: string }
 *                   shot:
 *                     type: array
 *                     items: { type: string }
 *                   temperature:
 *                     type: array
 *                     items: { type: string }
 *                   sugar:
 *                     type: array
 *                     items: { type: string }
 *               items:
 *                 type: array
 *                 items: { type: string }
 *               cart:
 *                 type: array
 *                 items: { type: string }
 *               order:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     menu_id:
 *                       type: string
 *                     quantity:
 *                       type: number
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
 *                 type:
 *                   type: array
 *                   items: { type: string }
 *                 options:
 *                   type: object
 *                 items:
 *                   type: array
 *                   items: { type: string }
 *                 order_id:
 *                   type: string
 */

router.post("/", orderController.handleOrder);

module.exports = router;
