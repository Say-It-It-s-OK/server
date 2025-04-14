const Menu = require("../models/menu");

exports.handleOrder = async (req, res) => {
  const { request, type, options, items, cart } = req.body;

  const typeMap = {
    coffee: "커피",
    decaffeine: "디카페인",
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
    return res.json({
      response: "query.order.pay",
      speech: "결제를 진행합니다",
      page: "payment",
    });
  }

  return res.status(400).json({ error: "지원하지 않는 요청입니다." });
};
