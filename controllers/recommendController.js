const { v4: uuidv4 } = require("uuid");
const Menu = require("../models/menu");
const Order = require("../models/orders");
const cache = require("../utils/BackendCache");
const sessionHelper = require("../utils/sessionHelper");


exports.handleRecommend = async (req, res) => {
  const sessionId = sessionHelper.ensureSession(req); 
  const { request, payload, action } = req.body;
  const currentSessionId = sessionId;
  cache.initSession(currentSessionId);

  const typeMap = {
    coffee: "커피",
    drink: "음료",
    decaffeine: "디카페인",
    dessert: "디저트",
  };

  // action: retry (이전 추천 조건 재사용)
  if (request === "query.recommend" || action === "retry") {
    let filtersPayload = payload;
    if (action === "retry") {
      filtersPayload = cache.getLastFilters(currentSessionId);
      if (!filtersPayload) {
        return res.status(400).json({ error: "재추천을 위한 조건이 없습니다." });
      }
    }

    const { categories = [], filters = {} } = filtersPayload || {};
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

    const excluded = cache.getRecommendedIds(currentSessionId, filtersPayload);

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

      if (excluded.length > 0) {
        andConditions.push({ id: { $nin: excluded } });
      }

      return andConditions.length > 0 ? { $and: andConditions } : {};
    };

    try {
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
              options: { $first: "$menu.options" },
              ingredient: { $first: "$menu.ingredient" },
              totalOrders: { $sum: "$quantity" },
            },
          },
          { $sort: { totalOrders: -1 } },
          { $limit: 1 },
        ]);

        if (results.length > 0) {
          cache.addRecommendations(currentSessionId, filtersPayload, results);
        }

        return res.json({
          response: "query.recommend",
          speech: "인기 기준으로 추천해드릴게요.",
          page: "recommend_custom",
          sessionId: currentSessionId,
          items: results,
        });
      } else {
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

        if (results.length > 0) {
          cache.addRecommendations(currentSessionId, filtersPayload, results);
        }

        return res.json({
          response: "query.recommend",
          speech: "조건에 맞춰 추천해드릴게요.",
          page: "recommend_custom",
          sessionId: currentSessionId,
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
