// controllers/orderController.js
const Menu = require("../models/menu");
const Order = require("../models/orders");
const cache = require("../utils/BackendCache");
const sessionHelper = require("../utils/sessionHelper");
const { v4: uuidv4 } = require("uuid");

const keyMap = {
  temperature: "온도",
  size: "크기",
  shot: "샷",
  shot_add: "샷 추가",
};

const mapKeys = (obj) => {
  if (!obj) return;
  for (const k in obj) {
    const mapped = keyMap[k];
    if (mapped) {
      obj[mapped] = obj[k];
      delete obj[k];
    }
  }
};

const finalizeItem = async (rawItem) => {
  const menu = await Menu.findOne({ name: rawItem.name });
  if (!menu) return null;

  const options = menu.options || {};
  const selectedOptions = { ...(rawItem.selectedOptions || {}) };

  if (rawItem.options) {
    mapKeys(rawItem.options);
    ["온도", "크기", "샷"].forEach((key) => {
      if (rawItem.options[key]) {
        selectedOptions[key] = rawItem.options[key];
      }
    });
  }

  if ((menu.type === "커피" || menu.type === "디카페인") && !selectedOptions["샷"] && options["샷"]?.length) {
    selectedOptions["샷"] = "보통";
  }

  return {
    ...rawItem,
    selectedOptions,
    options,
    ingredient: menu.ingredient,
    tag: menu.tag,
    id: menu.id,
    caffeine: menu.caffeine,
    price: menu.price,
    _id: menu._id,
  };
};

const handleNextItem = async (sessionId, request, res) => {
  console.log("[handleNextItem] 호출됨");

  const session = await sessionHelper.getSession(sessionId);
  const queue = session.itemQueue || [];

  if (queue.length === 0) {
    const cart = cache.getCart(sessionId);
    const names = cart.map(item => item.name);
    const counted = {};

    names.forEach(name => {
      counted[name] = (counted[name] || 0) + 1;
    });

    const nameList = Object.entries(counted)
      .map(([name, count]) => `${name}${count > 1 ? ` ${count}개` : ""}`)
      .join(", ");

    console.log("[handleNextItem] 모든 항목 처리 완료 → order_add 응답");
    return res.json({
      response: "query.sequence",
      sessionId,
      results: [
        {
          response: request,
          page: "order_add",
          speech: `${nameList} 장바구니에 추가했어요.`
        }
      ]
    });
  }

  const item = queue[0];
  const menu = await Menu.findOne({ name: item.name });

  if (!menu) {
    console.log("[handleNextItem] 메뉴 정보 없음 → 건너뜀");
    queue.shift();
    await sessionHelper.saveSession(sessionId, session);
    return handleNextItem(sessionId, request, res); // 다음 항목으로 재귀
  }

  const options = menu.options || {};
  item.options = item.options || {};
  mapKeys(item.options);

  const required = [];
  if (menu.type === "커피" || menu.type === "디카페인") {
    required.push("온도", "크기");
  } else if (menu.type === "음료") {
    if (Array.isArray(options["온도"]) && options["온도"].length === 1) {
      if (!item.options["온도"]) {
        item.options["온도"] = options["온도"][0];
      }
      required.push("크기");
    } else {
      required.push("온도", "크기");
    }
  }

  const missing = required.filter((key) => !item.options[key]);
  if (missing.length > 0) {
    const pendingId = uuidv4();
    cache.setPendingOrder(sessionId, {
      currentAction: "order.add",
      pendingItem: item,
      needOptions: missing,
      allOptions: options,
      id: pendingId
    });

    await sessionHelper.saveSession(sessionId, session);

    console.log("[handleNextItem] 옵션 누락 → pending 상태로 전환");
    return res.json({
      response: "query.sequence",
      sessionId,
      results: [
        {
          response: request,
          page: "order_option_required",
          speech: `${item.name}의 ${missing.join("와 ")}을(를) 선택해주세요.`,
          item: await finalizeItem(item),
          needOptions: missing,
          options,
          pendingid: pendingId
        }
      ]
    });
  }

  // ✅ 옵션이 모두 입력된 경우
  const finalizedItem = await finalizeItem(item);
  cache.addToCart(sessionId, finalizedItem);
  queue.shift();
  await sessionHelper.saveSession(sessionId, session);

  console.log("[handleNextItem] 옵션 완료 → 장바구니 추가 및 개별 응답");

  return res.json({
    response: "query.sequence",
    sessionId,
    results: [
      {
        response: request,
        page: "order_add",
        speech: `${finalizedItem.name}을(를) 장바구니에 추가했어요.`,
        items: [finalizedItem]
      }
    ]
  });
};

exports.handleOrder = async (req, res) => {
  const sessionId = sessionHelper.ensureSession(req);
  const { request, payload } = req.body;
  const actionType = request.split(".")[2];

  if (actionType === "add") {
    const items = payload.items || [];
    const results = [];

    for (const item of items) {
      const menu = await Menu.findOne({ name: item.name });
      if (!menu) {
        results.push({
          response: request,
          speech: `${item.name}은(는) 존재하지 않는 메뉴입니다.`,
          page: "order_error"
        });
        continue;
      }

      const options = menu.options || {};
      mapKeys(item.options);

      const required = [];
      if (menu.type === "커피" || menu.type === "디카페인") {
        required.push("온도", "크기");
      } else if (menu.type === "음료") {
        if (Array.isArray(options["온도"]) && options["온도"].length === 1) {
          if (!item.options?.["온도"]) {
            item.options["온도"] = options["온도"][0];
          }
          required.push("크기");
        } else {
          required.push("온도", "크기");
        }
      }

      const missing = required.filter((key) => !item.options?.[key]);

      if (missing.length > 0) {
        const pendingId = uuidv4();
        cache.setPendingOrder(sessionId, {
          currentAction: "order.add",
          pendingItem: item,
          needOptions: missing,
          allOptions: options,
          id: pendingId
        });

        results.push({
          response: request,
          page: "order_option_required",
          speech: `${item.name}의 ${missing.join("와 ")}을(를) 선택해주세요.`,
          item: await finalizeItem(item),
          needOptions: missing,
          options,
          pendingid: pendingId
        });
      } else {
        const finalizedItem = await finalizeItem(item);
        cache.addToCart(sessionId, finalizedItem);
        results.push({
          response: request,
          page: "order_add",
          speech: `${item.name}을(를) 장바구니에 추가했어요.`,
          items: [finalizedItem]
        });
      }
    }

    return res.json({
      response: "query.sequence",
      sessionId,
      results
    });
  }
  
  if (actionType === "update") {
    const itemList = payload.items || [];
    const item = itemList[0] || {};
    const pendingId = payload.id;
    const session = await sessionHelper.getSession(sessionId);

    const pendingOrders = cache.getPendingOrder(sessionId);
    const cart = cache.getCart(sessionId);

    // 옵션을 한글 key로 매핑
    itemList.forEach(item => {
      if (item.options) mapKeys(item.options);
    });

    // 1️⃣ pending 처리 (옵션만 보완한 경우)
    if (!item.name) {
      if (pendingOrders.length > 0) {
        let pending = pendingOrders.find((p) => p.id === pendingId) || pendingOrders[pendingOrders.length - 1];

        const updatedItem = {
          ...pending.pendingItem,
          selectedOptions: {
            ...(pending.pendingItem.selectedOptions || {}),
            ...(item.options || {})
          }
        };

        const stillMissing = pending.needOptions.filter(
          (opt) =>
            !updatedItem.selectedOptions ||
            updatedItem.selectedOptions[opt] === undefined ||
            updatedItem.selectedOptions[opt] === null
        );

        if (stillMissing.length === 0) {
          const finalizedItem = await finalizeItem(updatedItem);
          cache.addToCart(sessionId, finalizedItem);
          cache.removePendingOrder(sessionId, pending.id);
          cache.clearPendingOrder(sessionId);
          session.itemQueue.shift();
          await sessionHelper.saveSession(sessionId, session);

          // ✅ 다음 항목으로 자동 이동 ❌ → 여기서 한 항목만 응답
          return res.json({
            response: "query.sequence",
            sessionId,
            results: [
              {
                response: "query.order.add",
                page: "order_add",
                speech: `${finalizedItem.name}을(를) 장바구니에 추가했어요.`,
                items: [finalizedItem]
              }
            ]
          });
        } else {
          cache.updatePendingOrder(sessionId, pending.id, {
            ...pending,
            pendingItem: updatedItem,
            needOptions: stillMissing,
          });

          const finalizedInfo = await finalizeItem(updatedItem);

          return res.json({
            response: "query.order.add",
            sessionId,
            speech: `${updatedItem.name}의 ${stillMissing.join("와 ")}를 더 선택해주세요.`,
            page: "order_option_required",
            item: finalizedInfo,
            needOptions: stillMissing,
            options: pending.allOptions,
            pendingid: pending.id,
          });
        }
      }

      return res.json({
        response: request,
        speech: "어떤 메뉴를 변경하시겠어요?",
        sessionId,
        page: "order_update_require_menu"
      });
    }

    // 2️⃣ 장바구니 직접 수정 (이름+옵션 명시한 경우)
    let isCartUpdated = false;

    for (const targetItem of itemList) {
      const cartItem = cart.find(c => {
        if (c.name !== targetItem.name) return false;
        return Object.entries(targetItem.options || {}).every(
          ([key, value]) => c.selectedOptions[key] !== undefined
        ) || Object.keys(targetItem.options || {}).length === 0;
      });

      if (cartItem) {
        cartItem.selectedOptions = {
          ...(cartItem.selectedOptions || {}),
          ...(targetItem.options || {})
        };
        isCartUpdated = true;
      }
    }

    if (isCartUpdated) {
      cache.setCart(sessionId, cart);
      return res.json({
        response: request,
        sessionId,
        speech: `장바구니의 메뉴 옵션을 변경했어요.`,
        page: "order_update"
      });
    }

    return res.status(400).json({ error: "변경할 메뉴를 찾을 수 없습니다." });
  }


  if (actionType === "delete") {
    const items = payload.items || [];

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "삭제할 항목이 없습니다." });
    }

    const cart = cache.getCart(sessionId);
    const updatedCart = [...cart]; // 복사본

    for (const target of items) {
      mapKeys(target.options); // keyMap 적용

      // 항목 하나씩 찾아서 삭제
      const index = updatedCart.findIndex(cartItem => {
        if (cartItem.name !== target.name) return false;

        const selOpts = cartItem.selectedOptions || {};
        const tgtOpts = target.options || {};

        // 옵션이 있는 경우 정확히 일치해야 삭제
        return Object.keys(tgtOpts).every(
          key => selOpts[key] === tgtOpts[key]
        );
      });

      // 일치하는 항목 삭제
      if (index !== -1) {
        updatedCart.splice(index, 1);
      }
    }

    cache.setCart(sessionId, updatedCart);

    return res.json({
      response: request,
      speech: `${items.length}개 항목을 장바구니에서 삭제했어요.`,
      sessionId,
      page: "order_delete"
    });
  }

  if (actionType === "pay") {
    const cart = cache.getCart(sessionId);
    const now = new Date();
    const orderId = "ORD" + now.toISOString().replace(/[-T:\.Z]/g, "").slice(0, 14);

    // ✅ 메뉴별로 그룹핑 후 수량 계산
    const itemMap = new Map();

    for (const item of cart) {
      const key = item.id;
      if (!itemMap.has(key)) {
        itemMap.set(key, { ...item, quantity: 1 });
      } else {
        itemMap.get(key).quantity += 1;
      }
    }

    for (const [, item] of itemMap) {
      // 👉 콘솔에 저장될 데이터 출력
      console.log("[DB 저장 예정]", {
      order_id: orderId,
      order_date: now,
      menu_id: item.id,
      quantity: item.quantity
      });

      await Order.create({
        order_id: orderId,
        order_date: now,
        menu_id: item.id,
        quantity: item.quantity
      });
    }

    // ✅ 총액 계산: price × quantity 반영
    const total = [...itemMap.values()].reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    cache.clearSession(sessionId);

    return res.json({
      response: request,
      speech: `결제가 완료되었습니다. 총 ${total}원이에요.`,
      sessionId,
      page: "order_pay",
      total
    });
  }

  return res.status(400).json({ error: "지원하지 않는 order 타입입니다." });
};
