const { response } = require("express");
const Menu = require("../models/menu");
const Order = require("../models/orders");
const cache = require("../utils/BackendCache");
const sessionHelper = require("../utils/sessionHelper");
const { v4: uuidv4 } = require("uuid");
const { options } = require("../routes/order");

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
  const selectedOptions = {};

  ["온도", "크기", "샷"].forEach((key) => {
    if (rawItem[key]) {
      selectedOptions[key] = rawItem[key];
      delete rawItem[key];
    }
  });

  if (
    (menu.type === "커피" || menu.type === "디카페인") &&
    !selectedOptions["샷"] &&
    options["샷"]?.length
  ) {
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

exports.handleOrder = async (req, res) => {
  const sessionId = sessionHelper.ensureSession(req);
  const { request, payload } = req.body;
  const actionType = request.split(".")[2];

  mapKeys(payload.item);
  mapKeys(payload.changes);

  try {
    // if (actionType === "add") {
    //   const items = Array.isArray(payload.item) ? payload.item : [payload.item];
    //   const addedItems = [];

    //   for (const item of items) {
    //     if (!item || !item.name) continue;

    //     const menu = await Menu.findOne({ name: item.name });
    //     if (!menu) continue;

    //     const options = menu.options || {};
    //     const requiredOptions = [];

    //     if (menu.type === "커피" || menu.type === "디카페인") {
    //       requiredOptions.push("온도", "크기");
    //     } else if (menu.type === "음료") {
    //       if (Array.isArray(options["온도"]) && options["온도"].length === 1) {
    //         if (!item["온도"]) item["온도"] = options["온도"][0];
    //         requiredOptions.push("크기");
    //       } else {
    //         requiredOptions.push("온도", "크기");
    //       }
    //     }

    //     const missing = requiredOptions.filter((opt) => !item[opt]);

    //     if (missing.length > 0) {
    //       const pendingId = uuidv4();
    //       cache.setPendingOrder(sessionId, {
    //         currentAction: "order.add",
    //         pendingItem: item,
    //         needOptions: missing,
    //         allOptions: options,
    //       });

    //       console.log(pendingId);

    //       return res.json({
    //         response: request,
    //         sessionId,
    //         page: "order_option_required",
    //         speech: `${item.name}의 ${missing.join("와 ")}를 선택해주세요`,
    //         item: { name: item.name },
    //         needOptions: missing,
    //         options,
    //         pendingid: pendingId,
    //       });
    //     }

    //     const finalizedItem = await finalizeItem(item);
    //     cache.addToCart(sessionId, finalizedItem);
    //     addedItems.push(finalizedItem);
    //   }

    //   return res.json({
    //     response: request,
    //     sessionId,
    //     page: "order_add",
    //     speech: `${addedItems.length}개의 항목을 장바구니에 추가했어요`,
    //     items: addedItems,
    //   });
    // }

    if (actionType === "add") {
      const items = payload.items.flatMap(
        ({ name, count, selectedOptions }) => {
          return Array(count || 1).fill({ name, selectedOptions });
        }
      );

      const pendingQueue = [];
      const addedItems = [];

      for (const item of items) {
        const menu = await Menu.findOne({ name: item.name });
        if (!menu) continue;

        const requiredOptions = [];
        if (["커피", "디카페인", "음료"].includes(menu.type)) {
          requiredOptions.push("온도", "크기");
        }

        const selected = item.selectedOptions || {};
        const missingOptions = requiredOptions.filter((opt) => !selected[opt]);

        if (missingOptions.length === 0) {
          const finalizedItem = await finalizeItem({ ...item, ...selected });
          cache.addToCart(sessionId, finalizedItem);
          addedItems.push(finalizedItem);
        } else {
          pendingQueue.push({
            id: uuidv4(),
            item: item,
            needOptions: missingOptions,
            allOptions: menu.options,
          });
        }
      }

      if (pendingQueue.length > 0) {
        cache.setPendingOrder(sessionId, pendingQueue);

        const firstPending = pendingQueue.shift();
        return res.json({
          response: request,
          sessionId,
          page: "order_option_required",
          speech: `${
            addedItems.length > 0 ? `${addedItems.length}개는 담았어요. ` : ""
          }${firstPending.item.name}의 ${firstPending.needOptions.join(
            "와 "
          )}를 선택해주세요`,
          item: { name: firstPending.item.name },
          needOptions: firstPending.needOptions,
          options: firstPending.allOptions,
          pendingId: firstPending.id,
        });
      }

      return res.json({
        response: request,
        sessionId,
        page: "order_add",
        speech: `${addedItems.length}개의 항목을 장바구니에 추가했어요`,
        items: addedItems,
      });
    }

    // update
    if (actionType === "update") {
      //   const item = payload.item || {};
      //   const changes = payload.changes || {};
      //   const pendingId = payload.id;

      //   const pendingOrders = cache.getPendingOrder(sessionId);
      //   let pending;

      //   // pendingId 있을 때 id로 찾기
      //   if (pendingId) {
      //     pending = pendingOrders.find((p) => p.id === pendingId);
      //   }

      //   // pendingId 없을 때는 최근 pending 하나를 가져옴
      //   if (!pending && pendingOrders && pendingOrders.length > 0) {
      //     pending = pendingOrders[pendingOrders.length - 1];
      //   }

      //   if (pending) {
      //     const updatedItem = { ...pending.pendingItem, ...item, ...changes };
      //     const stillMissing = pending.needOptions.filter(
      //       (opt) => !updatedItem[opt]
      //     );

      //     console.log("[DEBUG] pending 데이터 업데이트 중", {
      //       updatedItem,
      //       stillMissing,
      //       pending,
      //     });

      //     if (stillMissing.length === 0) {
      //       const finalizedItem = await finalizeItem(updatedItem);
      //       cache.addToCart(sessionId, finalizedItem);
      //       cache.removePendingOrder(sessionId, pending.id);
      //       cache.clearPendingOrder(sessionId);

      //       return res.json({
      //         response: "query.order.add",
      //         sessionId,
      //         speech: `${finalizedItem.name}를 장바구니에 추가했어요.`,
      //         page: "order_add",
      //         items: [finalizedItem],
      //       });
      //     } else {
      //       cache.updatePendingOrder(sessionId, pending.id, {
      //         ...pending,
      //         pendingItem: updatedItem,
      //         needOptions: stillMissing,
      //       });

      //       return res.json({
      //         response: "query.order.add",
      //         sessionId,
      //         speech: `${updatedItem.name}의 ${stillMissing.join(
      //           "와 "
      //         )}를 더 선택해주세요.`,
      //         page: "order_option_required",
      //         item: { name: updatedItem.name },
      //         needOptions: stillMissing,
      //         options: pending.allOptions,
      //         id: pending.id,
      //       });
      //     }
      //   }

      //   // cart 수정 블록
      //   const cart = cache.getCart(sessionId);
      //   const name = item.name || changes.name;
      //   let targetIndex = -1;

      //   if (name) {
      //     targetIndex = cart.findIndex((c) => c.name === name);
      //   } else if (cart.length === 1) {
      //     targetIndex = 0;
      //   }

      //   if (targetIndex === -1) {
      //     console.warn("[WARN] 수정할 항목 없음", {
      //       sessionId,
      //       item,
      //       changes,
      //       cart,
      //     });
      //     return res.status(400).json({
      //       error: "수정할 항목을 찾을 수 없습니다. 이름을 명시해주세요.",
      //     });
      //   }

      //   for (const k in item) {
      //     const mapped = keyMap[k];
      //     if (mapped) {
      //       item[mapped] = item[k];
      //       delete item[k];
      //     }
      //   }

      //   for (const k in changes) {
      //     const mapped = keyMap[k];
      //     if (mapped) {
      //       changes[mapped] = changes[k];
      //       delete changes[k];
      //     }
      //   }

      //   // ✅ item + changes 병합 후 update
      //   const mergedChanges = { ...item, ...changes };
      //   console.log("[DEBUG] apply mergedChanges to cart:", mergedChanges);
      //   cache.updateCartItem(sessionId, targetIndex, mergedChanges);

      //   return res.json({
      //     response: request,
      //     speech: `${cart[targetIndex].name}의 옵션을 수정했어요.`,
      //     sessionId,
      //     page: "order_update",
      //   });

      const pendingQueue = cache.getPendingIrder(sessionId);
      const { item, changes } = payload;

      if (!pendingQueue || pendingQueue.length === 0) {
        return res
          .status(400)
          .json({ error: "장바구니에 담긴 주문이 없습니다" });
      }

      const currentPending = pendingQueue.shift();
      const updatedOptions = {
        ...currentPending.item.selectedOptions,
        ...item,
        ...changes,
      };
      const missingOptions = currentPending.needOptions.filter(
        (opt) => !updatedOptions[opt]
      );

      if (missingOptions.length === 0) {
        const finalizedItem = await finalizeItem({
          ...currentPending.item,
          ...updatedOptions,
        });
        cache.addToCart(sessionId, finalizedItem);

        if (pendingQueue.length > 0) {
          cache.setPendingOrder(sessionId, pendingQueue);
          const nextPending = pendingQueue[0];

          return res.json({
            response: request,
            sessionId,
            page: "order_option_required",
            speech: `${finalizedItem.name}를 장바구니에 담았어요. 다음 ${
              nextPending.item.name
            }의 ${nextPending.needOptions.join("와 ")}를 선택해주세요`,
            item: { name: nextPending.item.name },
            needOptions: nextPending.allOptions,
            options: nextPending.allOptions,
            pendingId: nextPending.id,
          });
        } else {
          cache.clearPendingOrder(sessionId);

          return res.json({
            response: request,
            sessionId,
            page: "order_add",
            speech: `${finalizedItem.name}를 장바구니에 담았어요. 모든 주문이 완료되었습니다.`,
            items: [finalizedItem],
          });
        }
      } else {
        currentPending.item.selectedOptions = updatedOptions;
        currentPending.needOptions = missingOptions;
        pendingQueue.unshift(currentPending);
        cache.setPendingOrder(sessionId, pendingQueue);

        return res.json({
          response: request,
          sessionId,
          page: "order_option_required",
          speech: `${currentPending.item.name}의 ${missingOptions.join(
            "와 "
          )}를 마저 선택해주세요`,
          item: { name: currentPending.item.name },
          needOptions: missingOptions,
          options: currentPending.allOptions,
          pendingId: currentPending.id,
        });
      }
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
