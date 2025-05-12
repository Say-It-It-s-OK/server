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
      const addedItems = [];
      const missingOptionItems = [];

      const drinkTypes = ["coffee", "decaffeine", "drink"];

      const typeMap = {
        커피: "coffee",
        디카페인: "decaffeine",
        음료: "drink",
        디저트: "dessert",
      };

      for (const item of items) {
        if (!item || !item.name) continue;

        item.type = typeMap[item.type] || item.type;

        // 가격이 없다면 DB에서 메뉴 정보 조회
        if (!item.price || !item.type || !drinkTypes.includes(item.type)) {
          const menu = await Menu.findOne({ name: item.name });

          if (!menu) {
            console.warn(`[WARN] ${item.name} 메뉴를 찾을 수 없습니다.`);
            continue;
          }
          item.price = menu.price;
          item.type = typeMap[menu.type] || menu.type; // DB에서 타입 안채워도 되면 이 줄은 삭제
        }

        const isDrink = drinkTypes.includes(item.type);

        if (isDrink) {
          const missing = [];
          if (!item.size) missing.push("사이즈");
          if (!item.temperature) missing.push("온도");

          if (missing.length > 0) {
            missingOptionItems.push({ name: item.name, missing });
          }
        }

        cache.addToCart(sessionId, item);
        addedItems.push(item);
      }

      let speech = `${addedItems.length}개의 항목을 장바구니에 추가했어요.`;
      let page = "order_add";
      const response = {
        response: request,
        speech,
        sessionId,
        page,
        items: addedItems,
      };

      if (missingOptionItems.length > 0) {
        const prompts = missingOptionItems.map(
          (item) => `${item.name}의 ${item.missing.join("와 ")}`
        );
        response.speech += ` ${prompts.join(", ")}를 선택해 주세요.`;
        response.page = "order_option_request";
        response.needOptions = missingOptionItems;
      }

      console.log("[DEBUG] 장바구니 상태:", cache.getCart(sessionId));
      return res.json(response);
    }

    if (actionType === "update") {
      const item = payload.item || {};
      const changes = payload.changes || {};
      const cart = cache.getCart(sessionId);

      console.log("[DEBUG] 기존 장바구니:", cart);
      console.log("[DEBUG] 업데이트 요청 항목 (changes):", changes);

      // 우선순위: item.name > changes.name > cart.length === 1
      let targetIndex = -1;
      const name = item.name || changes.name;

      if (name) {
        targetIndex = cart.findIndex((c) => c.name === name);
      } else if (cart.length === 1) {
        targetIndex = 0;
      }

      if (targetIndex === -1) {
        return res.status(400).json({
          error: "수정할 항목을 찾을 수 없습니다. 이름을 명시해주세요.",
        });
      }

      const updatedItem = { ...cart[targetIndex], ...item, ...changes };
      cart[targetIndex] = updatedItem;
      cache.setCart(sessionId, cart);

      console.log("[DEBUG] 수정 후 장바구니:", cache.getCart(sessionId));

      return res.json({
        response: request,
        speech: `${updatedItem.name}의 옵션을 수정했어요.`,
        sessionId,
        page: "order_update",
      });
    }

    if (actionType === "delete") {
      const item = payload.item;
      const cart = cache.getCart(sessionId);
      const newCart = cart.filter((c) => c.name !== item.name);
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
