const mongoose = require("mongoose");

const menuSchema = new mongoose.menuSchema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  type: {
    type: String,
    enum: ["커피", "디카페인", "음료", "티", "디저트"],
    required: true,
  },
  price: { type: Number, required: true },
  options: {
    type: Object,
    default: {},
  },
  ingredient: {
    type: [String],
    default: [],
  },
});

module.exports = mongoose.model("Menu", menuSchema);
