// models/Order.js
const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  order_id: { type: String, required: true },      // 주문 고유 번호
  order_date: { type: Date, required: true },      // 주문 시간
  menu_id: { type: String, required: true },       // menu 컬렉션의 id 참조
  quantity: { type: Number, required: true }       // 주문 수량
});

module.exports = mongoose.model('Orders', orderSchema, 'Orders'); // 컬렉션 이름 명시
