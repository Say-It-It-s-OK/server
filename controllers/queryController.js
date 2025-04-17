const Menu = require("../models/menu");
const Order = require('../models/orders');

exports.handleQuery = async (req, res) => {
  const { request } = req.body;

  const typeMap = {
    coffee: "커피",
    drink: "음료",
    decaffein: "디카페인",
    dessert: "디저트",
  };

  
  // query.confirm.menu
  if (request.startsWith("query.confirm.menu.")) {
    const typeKey = request.split(".")[3];
    const menuType = typeMap[typeKey];

    if (!menuType) {
      return res
        .status(400)
        .json({ error: "유효하지 않은 메뉴 카테고리입니다." });
    }

    try {
      const menus = await Menu.find({ type: menuType });
      return res.json({
        response: "query.confirm",
        speech: `고객님 요청에 따라 ${menuType} 메뉴를 보여드립니다`,
        page: typeKey,
        items: menus,
      });
    } catch (err) {
      return res.status(500).json({ error: "메뉴 조회 실패" });
    }
  }

  // query.confirm.cart
  if (request === "query.confirm.cart") {
    return res.json({
      response: "query.confirm",
      speech: "고객님 요청에 따라 장바구니를 보여드립니다",
      page: "cart",
    });
  }

  // query.confirm.details
  if (request === "query.confirm.details") {
    return res.json({
      response: "query.confirm",
      speech: "고객님 요청에 따라 결제 내용을 보여드립니다",
      page: "details",
    });
  } 

  return res.status(400).json({ error: "지원하지 않는 request 타입입니다." });
};
