// controllers/orderController.js
const Menu = require("../models/menu");
const Order = require("../models/orders");
const cache = require("../utils/BackendCache");
const sessionHelper = require("../utils/sessionHelper");

exports.handleOrder = async (req, res) => {
  const sessionId = sessionHelper.ensureSession(req);
  const { request, payload } = req.body;
  const actionType = request.split(".")[2]; // add, update, delete, pay

  try {
    if (actionType === "add") {
      const items = Array.isArray(payload.item) ? payload.item : [payload.item];
    
      for (const item of items) {
        if (!item || !item.name) continue;
    
        // 가격이 없다면 DB에서 메뉴 정보 조회
        if (!item.price) {
          const menu = await Menu.findOne({ name: item.name });
          if (!menu) {
            console.warn(`[WARN] ${item.name} 메뉴를 찾을 수 없습니다.`);
            continue;
          }
          item.price = menu.price;
        }
    
        cache.addToCart(sessionId, item);
      }
    
      return res.json({
        response: request,
        speech: `${items.length}개의 항목을 장바구니에 추가했어요.`,
        sessionId,
        page: "order_add",
      });
    }
    
    if (actionType === "update") {
      const item = payload.item;
      const cart = cache.getCart(sessionId);
      const updatedCart = cart.map(c =>
        c.name === item.name ? { ...c, ...item } : c
      );
      cache.setCart(sessionId, updatedCart);

      return res.json({
        response: request,
        speech: `${item.name}의 옵션을 수정했어요.`,
        sessionId,
        page: "order_update",
      });
    }

    if (actionType === "delete") {
      const item = payload.item;
      const cart = cache.getCart(sessionId);
      const newCart = cart.filter(c => c.name !== item.name);
      cache.setCart(sessionId, newCart);

      return res.json({
        response: request,
        speech: `${item.name}을(를) 장바구니에서 삭제했어요.`,
        sessionId,
        page: "order_delete",
      });
    }

    if (actionType === "pay") {
      const cart = cache.getCart(sessionId);
      const total = cart.reduce((sum, i) => sum + i.price * (i.count || 1), 0);
      cache.clearSession(sessionId);

      return res.json({
        response: request,
        speech: `결제가 완료되었습니다. 총 ${total}원이에요.`,
        sessionId,
        page: "order_pay",
        total,
      });
    }

    return res.status(400).json({ error: "지원하지 않는 order 타입입니다." });
  } catch (err) {
    console.error("order 처리 오류:", err);
    return res.status(500).json({ error: "주문 처리 중 오류가 발생했습니다." });
  }
};
