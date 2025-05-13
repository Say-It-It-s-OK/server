// controllers/orderController.js
const menu = require("../models/menu");
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
      const required_option_keys = ["온도", "크기"];
      // const missingOptionItems = [];

      // const drinkTypes = ["coffee", "decaffeine", "drink"];

      // const typeMap = {
      //   커피: "coffee",
      //   디카페인: "decaffeine",
      //   음료: "drink",
      //   디저트: "dessert",
      // };

      for (const item of items) {
        if (!item || !item.name) continue;

        // item.type = typeMap[item.type] || item.type;

        // // 가격이 없다면 DB에서 메뉴 정보 조회
        // if (!item.price || !item.type || !drinkTypes.includes(item.type)) {
        const menu = await Menu.findOne({ name: item.name });
        if (!menu) {
          console.warn(`[WARN] ${item.name} 메뉴를 찾을 수 없습니다.`);
          continue;
        }

        if (!item.price) item.price = menu.price;
        item.type = menu.type;

        // 디저트는 옵션 없이 바로 추가
        if (menu.type === "디저트") {
          item.selectedOptions = {};
          cache.addToCart(sessionId, item);
          addedItems.push(item);
          continue;
        }

        const options = menu.options || {};
        const fixedOptions = {};
        const requiredOptions = [];

        console.log("menu.options => ", menu.options);

        for (const key of Object.keys(options._doc || {})) {
          const values = options[key];

          if (!Array.isArray(values) || values.length === 0) continue;

          if (values.length === 1) {
            fixedOptions[key] = values[0];
          }

          if (required_option_keys.includes(key)) {
            requiredOptions.push(key);
          }
          console.log(
            "[DEBUG] 현재 key:",
            key,
            "| isRequired:",
            required_option_keys.includes(key)
          );
        }

        for (const key of Object.keys(fixedOptions)) {
          item[key] = fixedOptions[key];
        }

        const missing = requiredOptions.filter((opt) => !item[opt]);

        console.log("[DEBUG] 메뉴 옵션:", options);
        console.log("[DEBUG] 필수 옵션:", requiredOptions);
        console.log("[DEBUG] 누락된 옵션:", missing);

        if (missing.length > 0) {
          console.log("[DEBUG] 옵션 누락 감지됨, pendingOrder로 이동");

          cache.setPendingOrder(sessionId, {
            currentAction: "order.add",
            pendingItem: item,
            needOptions: missing,
            allOptions: options,
          });

          return res.json({
            response: request,
            sessionId,
            page: "order_option_required",
            speech: `${item.name}의 ${missing.join("와 ")}를 선택해주세요`,
            item: { name: item.name },
            needOptions: missing,
            options,
          });
        }

        item.selectedOptions = {};
        for (const key of requiredOptions) {
          item.selectedOptions[key] = item[key];
        }

        cache.addToCart(sessionId, item);
        addedItems.push(item);
        cache.clearPendingOrder(sessionId);
      }

      return res.json({
        response: request,
        sessionId,
        page: "order_add",
        speech: `${addedItems.length}개의 항목을 장바구니에 추가했어요`,
        items: addedItems,
      });
    }

    if (actionType === "update") {
      const item = payload.item || {};
      const changes = payload.changes || {};
      const pending = cache.getPendingOrder(sessionId);

      console.log("[DEBUG] pendingOrder 상태:", pending);

      if (pending?.currentAction === "order.add" && pending?.pendingItem) {
        console.log("[DEBUG] 옵션 추가 흐름 진입");

        const updatedItem = { ...pending.pendingItem, ...item, ...changes };
        const stillMissing = pending.needOptions.filter(
          (opt) => !updatedItem[opt]
        );

        if (stillMissing.length === 0) {
          // option이 모두 채워진 경우 -> selectedOptions 구성 후 장바구니에 추가
          updatedItem.selectedOptions = {};
          for (const opt of pending.needOptions) {
            updatedItem.selectedOptions[opt] = updatedItem[opt];
          }

          cache.addToCart(sessionId, updatedItem);
          cache.clearPendingOrder(sessionId);

          return res.json({
            response: "query.order.add",
            sessionId,
            speech: `${updatedItem.name}를 장바구니에 추가했어요`,
            page: "order_add",
            items: [updatedItem],
          });
        } else {
          // 옵션 선택이 완료되지 않은 경우 -> 다시 pending에 저장
          cache.setPendingOrder(sessionId, {
            ...pending,
            pendingItem: updatedItem,
            needOptions: stillMissing,
          });

          return res.json({
            response: "query.order.add".sessionId,
            speech: `${updatedItem.name}의 ${stillMissing.join(
              "와 "
            )}를 더 선택해주세요`,
            page: "order_option_required",
            item: { name: updatedItem.name },
            needOptions: stillMissing,
            options: pending.allOptions,
          });
        }
      }

      // 기존 장바구니 항목 수정 로직
      const cart = cache.getCart(sessionId);
      const name = item.name || changes.name;
      let targetIndex = -1;

      console.log("[DEBUG] 기존 장바구니:", cart);
      console.log("[DEBUG] 업데이트 요청 항목 (changes):", changes);

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
