// routes/cart.js
const express = require("express");
const router = express.Router();
const cartController = require("../controllers/cartController.js");

// 장바구니에 항목 추가
router.post("/add", cartController.add);

// 장바구니 항목 수정 (selectedOptions 기준)
router.post("/update", cartController.update);

// 장바구니 항목 삭제
router.post("/delete", cartController.delete);

// 장바구니 조회
router.post("/fetch", cartController.fetch);

// 결제 요청
router.post("/pay", cartController.pay);

module.exports = router;
