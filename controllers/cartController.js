const cache = require("../utils/BackendCache");
const Order = require("../models/orders"); 

const buildOptionUpdateSpeech = (itemName, options) => {
  if (!options || Object.keys(options).length === 0) return `${itemName} 옵션을 변경했어요.`;

  const phrases = [];

  for (const [key, value] of Object.entries(options)) {
    if (key === "온도") {
      if (value.includes("따뜻") || value === "핫") {
        phrases.push("따뜻한 걸로 바꿔드릴게요");
      } else if (value.includes("아이스") || value === "차가운") {
        phrases.push("아이스로 바꿔드릴게요");
      } else {
        phrases.push(`${value}로 바꿔드릴게요`);
      }
    } else if (key === "크기") {
      phrases.push(`${value} 사이즈로 바꿔드릴게요`);
    } else if (key === "샷") {
      if (value === "없음" || value === "0") {
        phrases.push("샷 빼드릴게요");
      } else {
        phrases.push(`샷 ${value}로 해드릴게요`);
      }
    } else {
      phrases.push(`${key}을(를) ${value}로 바꿔드릴게요`);
    }
  }

  return `${itemName}, ${phrases.join(", ")}.`;
};

// ✅ 장바구니 추가
exports.add = (req, res) => {
  const { sessionId, item } = req.body;
  if (!sessionId || !item) {
    return res.status(400).json({ error: "sessionId 또는 item이 없습니다." });
  }

  console.log("[CART] ADD:", { sessionId, item });

  cache.addToCart(sessionId, item);
  return res.json({
    response: "cart.add",
    sessionId,
    speech: `${item.name} 추가했어요.`,
    page: "order_add",
    items: [item],
  });
};

// ✅ 장바구니 항목 수정
exports.update = (req, res) => {
  const { sessionId, item } = req.body;
  const cartIndex = item?.cartIndex;

  if (!sessionId || cartIndex === undefined) {
    return res.status(400).json({ error: "sessionId 또는 cartIndex가 없습니다." });
  }

  const cart = cache.getCart(sessionId);
  if (!cart[cartIndex]) {
    return res.status(404).json({ error: "해당 인덱스의 항목이 존재하지 않습니다." });
  }

  const selectedOptions = item.selectedOptions || {};
  if (Object.keys(selectedOptions).length === 0) {
    return res.status(400).json({ error: "선택된 옵션이 없습니다." });
  }

  console.log("[CART] UPDATE:", { sessionId, cartIndex, selectedOptions });

  cart[cartIndex].selectedOptions = {
    ...cart[cartIndex].selectedOptions,
    ...selectedOptions,
  };

  cache.setCart(sessionId, cart);

  return res.json({
    response: "cart.update",
    sessionId,
    speech: `${cart[cartIndex].name}, 말씀하신 대로 옵션 바꿨어요.`,

    page: "order_update",
    item: cart[cartIndex],
  });
};

// ✅ 장바구니 항목 삭제
exports.delete = (req, res) => {
  const { sessionId, index } = req.body;

  if (!sessionId || index === undefined) {
    return res.status(400).json({ error: "sessionId 또는 index가 없습니다." });
  }

  const cart = cache.getCart(sessionId);
  if (!cart[index]) {
    return res.status(404).json({ error: "해당 인덱스의 항목이 존재하지 않습니다." });
  }

  const deleted = cart.splice(index, 1);
  cache.setCart(sessionId, cart);

  console.log("[CART] DELETE:", { sessionId, index });

  return res.json({
    response: "cart.delete",
    sessionId,
    speech: `${deleted[0].name}, 장바구니에서 빼드렸어요.`,
    page: "order_delete",
  });
};

// ✅ 장바구니 조회
exports.fetch = (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) {
    return res.status(400).json({ error: "sessionId가 없습니다." });
  }

  const cart = cache.getCart(sessionId);

  console.log("[CART] FETCH:", { sessionId, cart });

  return res.json({
    response: "cart.fetch",
    sessionId,
    page: "order_cart",
    items: cart,
  });
};

// ✅ 결제 처리
exports.pay = async (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) {
    return res.status(400).json({ error: "sessionId가 없습니다." });
  }

  const cart = cache.getCart(sessionId.sessionId);
  const now = new Date();
  const orderId = "ORD" + now.toISOString().replace(/[-T:\.Z]/g, "").slice(0, 14);

  // 메뉴별로 그룹핑 후 수량 계산
  const itemMap = new Map();

  for (const item of cart) {
    const key = item.id;
    if (!itemMap.has(key)) {
      itemMap.set(key, { ...item, quantity: 1 });
    } else {
      itemMap.get(key).quantity += 1;
    }
  }

  // DB 저장 + 로그 출력
  for (const [, item] of itemMap) {
    console.log("[CART → DB 저장]", {
      order_id: orderId,
      order_date: now,
      menu_id: item.id,
      quantity: item.quantity,
    });

    await Order.create({
      order_id: orderId,
      order_date: now,
      menu_id: item.id,
      quantity: item.quantity,
    });
  }

  const total = cart.reduce((sum, i) => sum + i.price, 0);

  cache.clearSession(sessionId.sessionId);

  return res.json({
    response: "cart.pay",
    sessionId,
    speech: `총 ${total}원입니다. 감사합니다!`,
    page: "order_pay",
    total,
  });
};
