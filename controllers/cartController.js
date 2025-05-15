const cache = require("../utils/BackendCache");

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
    speech: `${item.name}을(를) 장바구니에 추가했어요.`,
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
    speech: `${cart[cartIndex].name}의 옵션을 수정했어요.`,
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
    speech: `${deleted[0].name}을(를) 장바구니에서 삭제했어요.`,
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
exports.pay = (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) {
    return res.status(400).json({ error: "sessionId가 없습니다." });
  }

  const cart = cache.getCart(sessionId);
  const total = cart.reduce((sum, i) => sum + i.price * (i.count || 1), 0);

  console.log("[CART] PAY:", { sessionId, total });

  cache.clearSession(sessionId);

  return res.json({
    response: "cart.pay",
    sessionId,
    speech: `결제가 완료되었습니다. 총 ${total}원이에요.`,
    page: "order_pay",
    total,
  });
};
