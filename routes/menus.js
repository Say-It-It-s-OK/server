const express = require("express");
const router = express.Router();
const Menu = require("../models/menu");

router.get("/", async (req, res) => {
  try {
    const menus = await Menu.find();
    res.json(menus);
  } catch (err) {
    res.status(500).json({ error: "메뉴 불러오기 실패" });
  }
});

module.exports = router;
