const Menu = require("../models/menu");
const Order = require("../models/orders");

exports.handleRecommend = async (req, res) => {
<<<<<<< HEAD
    const { request } = req.body;
=======
  const { request, payload } = req.body;
>>>>>>> main

  const typeMap = {
    coffee: "커피",
    drink: "음료",
    decaffeine: "디카페인",
    dessert: "디저트",
  };

  if (request === "query.recommend") {
    const { categories = [], filters = {} } = payload || {};
    const {
      tag = [],
      caffeine,
      price = {},
      include_ingredients = [],
      exclude_ingredients = []
    } = filters;

    const matchType = categories.map(c => typeMap[c] || c);
    const includePopular = tag.includes("popular");
    const filteredTags = tag.filter(t => t !== "popular");

    const buildMatchStage = () => {
      const andConditions = [];

      if (matchType.length > 0) andConditions.push({ type: { $in: matchType } });
      if (filteredTags.length > 0) andConditions.push({ tag: { $in: filteredTags } });

      if (caffeine) {
        const caffeineMap = { decaffeine: "decaffeine", caffeine: "caffeine" };
        andConditions.push({ caffeine: caffeineMap[caffeine] || caffeine });
      }

      if (include_ingredients.length > 0) {
        andConditions.push({ ingredient: { $all: include_ingredients } });
      }

      if (exclude_ingredients.length > 0) {
        andConditions.push({ ingredient: { $not: { $in: exclude_ingredients } } });
      }

      if (price.min || price.max) {
        const priceFilter = {};
        if (price.min) priceFilter.$gte = price.min;
        if (price.max) priceFilter.$lte = price.max;
        andConditions.push({ price: priceFilter });
      }

      return andConditions.length > 0 ? { $and: andConditions } : {};
    };

    try {
      // popular 태그가 있는 경우 → 판매량 기준 추천
      if (tag.length > 0 && includePopular) {
        const match = buildMatchStage();

        const menuMatch = match.$and
          ? {
              $and: match.$and.map(condition => {
                const remap = {};
                for (const key in condition) {
                  remap[`menu.${key}`] = condition[key];
                }
                return remap;
              }),
            }
          : {};

        const results = await Order.aggregate([
          {
            $lookup: {
              from: "Menu",
              localField: "menu_id",
              foreignField: "id",
              as: "menu",
            },
          },
          { $unwind: "$menu" },
          { $match: menuMatch },
          {
            $group: {
              _id: "$menu.id",
              id: { $first: "$menu.id" },
              name: { $first: "$menu.name" },
              type: { $first: "$menu.type" },
              price: { $first: "$menu.price" },
              totalOrders: { $sum: "$quantity" },
            },
          },
          { $sort: { totalOrders: -1 } },
          { $limit: 1 },
        ]);

        return res.json({
          response: "query.recommend",
          speech: "인기 기준으로 추천해드릴게요.",
          page: "recommend_custom",
          items: results,
        });
      } else {
        // popular 없을 때: 필터 조건 기반 랜덤 추천
        const match = buildMatchStage();
        const pipeline = [];

        if (Object.keys(match).length > 0) pipeline.push({ $match: match });

        if (price.sort === "asc") {
          pipeline.push({ $sort: { price: 1 } });
        } else if (price.sort === "desc") {
          pipeline.push({ $sort: { price: -1 } });
        }

        if (price.sort) pipeline.push({ $limit: 1 });
        else pipeline.push({ $sample: { size: 1 } });

        const results = await Menu.aggregate(pipeline);

        return res.json({
          response: "query.recommend",
          speech: "조건에 맞춰 추천해드릴게요.",
          page: "recommend_custom",
          items: results,
        });
      }
    } catch (err) {
      console.error("추천 오류:", err);
      return res.status(500).json({ error: "추천 처리 중 오류가 발생했습니다." });
    }
  }

  return res.status(400).json({ error: "지원하지 않는 request입니다." });
};