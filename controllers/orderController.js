const Menu = require("../models/menu");
const Order = require("../models/orders");

exports.handleOrder = async (req, res) => {
  const { request, type, options, items, cart, order } = req.body;

  const typeMap = {
    coffee: "커피",
    decaffein: "디카페인",
    drink: "음료",
    dessert: "디저트",
  };

  // query.order.add
  if (request === "query.order.add") {
    const menuType = typeMap[type?.[0]];

    if (!menuType) {
      return res.status(400).json({ error: "유효하지 않은 메뉴 타입입니다" });
    }

    return res.json({
      response: "query.order.add",
      speech: `${menuType} 메뉴를 장바구니에 추가했습니다`,
      page: "cart",
      type,
      options,
    });
  }

  // query.order.update
  if (request === "query.order.update") {
    const menuType = typeMap[type?.[0]];

    if (!menuType) {
      return res.status(400).json({ error: "유효하지 않은 메뉴 타입입니다" });
    }

    return res.json({
      response: "query.order.update",
      speech: `${menuType} 옵션을 변경하였습니다`,
      page: "option",
      type,
      options,
    });
  }

  // query.order.delete
  if (request === "query.order.delete") {
    return res.json({
      response: "query.order.delete",
      speech: "선택한 상품을 장바구니에서 삭제했습니다",
      page: "cart",
      items,
    });
  }

  // query.order.pay
  if (request === "query.order.pay") {
    if (!Array.isArray(items) || items.length === 0) {
      return res
        .status(400)
        .json({ error: "유효한 주문 데이터가 필요합니다." });
    }

    const orderTime = new Date();
    const orderId = `ORD${orderTime.getTime()}`;

    // items 배열을 menu_id 기준으로 그룹핑 (수량 계산)
    const itemMap = new Map();
    items.forEach((item) => {
      const menuId = item.id;
      if (itemMap.has(menuId)) {
        itemMap.set(menuId, itemMap.get(menuId) + 1);
      } else {
        itemMap.set(menuId, 1);
      }
    });

    const orderDocs = Array.from(itemMap).map(([menu_id, quantity]) => ({
      order_id: orderId,
      order_date: orderTime,
      menu_id,
      quantity,
    }));

    try {
      await Order.insertMany(orderDocs);

      return res.json({
        response: "query.order.pay",
        speech: "결제를 진행합니다",
        page: "payment",
        order_id: orderId,
      });
    } catch (err) {
      console.error("주문 저장 오류:", err);
      return res
        .status(500)
        .json({ error: "주문 처리 중 오류가 발생했습니다." });
    }
  }

  return res.status(400).json({ error: "지원하지 않는 요청입니다." });
};
