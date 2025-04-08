const express = require("express");
const router = express.Router();
const Menu = require("../models/menu");

/**
 * @swagger
 * /menus:
 *   get:
 *     summary: 전체 메뉴 조회
 *     description: 등록된 모든 메뉴 데이터를 반환합니다
 *     responses:
 *       200:
 *         description: 메뉴 리스트 응답
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   type:
 *                     type: string
 *                   price:
 *                     type: number
 *                   options:
 *                     type: object
 *                   ingredient:
 *                     type: array
 *                     items:
 *                       type: string
 */

router.get("/", async (req, res) => {
  try {
    const menus = await Menu.find();
    res.json(menus);
  } catch (err) {
    res.status(500).json({ error: "메뉴 불러오기 실패" });
  }
});

module.exports = router;
