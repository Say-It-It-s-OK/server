// 메모리 기반 세션 캐시 저장소
const { v4: uuidv4 } = require("uuid");
const { init } = require("../models/menu");
const sessions = {};

function initSession(sessionId) {
  if (!sessions[sessionId]) {
    sessions[sessionId] = {
      cart: [],
      filters: {},
      recommended: {},
      pendingOrders: [],
    };
  }
}

function ensureSession(req) {
  let sessionId = req.body.sessionId;
  if (!sessionId) {
    sessionId = uuidv4();
    req.body.sessionId = sessionId;
  }
  initSession(sessionId);
  return sessionId;
}

function addPendingOrder(sessionId, pendingData) {
  initSession(sessionId);
  sessions[sessionId].pendingOrders.push(pendingData);
}

function getPendingOrder(sessionId) {
  initSession(sessionId);
  return sessions[sessionId].pendingOrders;
}

function updatePendingOrder(sessionId, id, updatedData) {
  initSession(sessionId);
  const idx = sessions[sessionId].pendingOrders.findIndex((p) => p.id === id);
  if (idx !== -1) sessions[sessionId].pendingOrders[idx] = updatedData;
}

function removePendingOrder(sessionId, id) {
  initSession(sessionId);
  sessions[sessionId].pendingOrders = sessions[sessionId].pendingOrders.filter(
    (p) => p.id !== id
  );
}

// 🛒 장바구니 관련 함수
function addToCart(sessionId, item) {
  initSession(sessionId);
  sessions[sessionId].cart.push(item);
}

function getCart(sessionId) {
  initSession(sessionId);
  return sessions[sessionId].cart;
}

function setCart(sessionId, cartItems) {
  initSession(sessionId);
  sessions[sessionId].cart = cartItems;
}

// 🧠 추천 관련 캐시
function addRecommendations(sessionId, filters, items) {
  initSession(sessionId);
  const key = JSON.stringify(filters);
  const newIds = items.map((item) => item.id);
  const existingIds = sessions[sessionId].recommended[key] || [];

  // 중복 없이 누적
  const merged = [...new Set([...existingIds, ...newIds])];
  sessions[sessionId].recommended[key] = merged;

  sessions[sessionId].filters = filters; // 최신 조건 저장

  console.log(`[추천 캐시 저장] 세션: ${sessionId}`);
  console.log(`- 조건: ${key}`);
  console.log(`- 추천된 메뉴 ID 누적:`, merged);
}

function getRecommendedIds(sessionId, filters) {
  initSession(sessionId);
  const key = JSON.stringify(filters);
  return sessions[sessionId].recommended[key] || [];
}

function getLastFilters(sessionId) {
  initSession(sessionId);
  return sessions[sessionId].filters;
}

function clearSession(sessionId) {
  delete sessions[sessionId];
}

// 디버깅용 전체 상태 조회
function getAllSessions() {
  return sessions;
}

module.exports = {
  initSession,
  ensureSession,
  addToCart,
  getCart,
  setCart,
  addRecommendations,
  getRecommendedIds,
  getLastFilters,
  clearSession,
  getAllSessions,
  addPendingOrder,
  updatePendingOrder,
  removePendingOrder,
  getPendingOrder,
};
