const express = require("express");
const Menu = require("../models/menu");

const router = express.Router();

let cachedData = null;

/**
 * @swagger
 * /menus:
 *   get:
 *     summary: 모든 메뉴 조회
 *     description: 등록된 모든 메뉴 정보를 반환합니다
 *     responses:
 *       200:
 *         description: 메뉴 리스트 반환
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   type:
 *                     type: string
 *                     enum: [커피, 디카페인, 음료, 티, 디저트]
 *                   price:
 *                     type: number
 *                   options:
 *                     type: object
 *                     properties:
 *                       온도:
 *                         type: array
 *                         items:
 *                           type: string
 *                       샷:
 *                         type: array
 *                         items:
 *                           type: string
 *                       샷 추가:
 *                         type: array
 *                         items:
 *                           type: string
 *                       크기:
 *                         type: array
 *                         items:
 *                           type: string
 *                   ingredient:
 *                     type: array
 *                     items:
 *                       type: string
 */

router.get("/", async (req, res) => {
  try {
    const menus = await Menu.find();

    if (!cachedData || JSON.stringify(menus) !== JSON.stringify(cachedData)) {
      cachedData = menus;
      return res.json(menus);
    }

    return res.json(cachedData);
  } catch (err) {
    res.status(500).json({ error: "메뉴 불러오기 실패" });
  }
});

module.exports = router;
