const mongoose = require("mongoose");

const optionSchema = new mongoose.Schema(
  {
    온도: {
      type: [String],
      enum: ["핫", "아이스"],
    },
    샷: {
      type: [String],
      enum: ["연하게", "보통", "진하게"],
    },
    "샷 추가": {
      type: [String],
      enum: ["1샷 추가", "2샷 추가", "3샷 추가"],
    },
    크기: {
      type: [String],
      enum: ["S", "M", "L"],
    },
  },
  { _id: false }
);

const menuSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ["커피", "디카페인", "음료", "티", "디저트"],
      required: true,
    },
    price: { type: Number, required: true },
    options: {
      type: optionSchema,
      required: true,
    },

    ingredient: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Menu", menuSchema, "Menu");
