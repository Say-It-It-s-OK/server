import * as chai from "chai";
import supertest from "supertest";
const { expect } = chai;

describe("GET /menus", () => {
  it("should return the menu data from DB when no cache is available", async () => {
    const response = await request(app).get("/menus");
    expect(response.status).to.equal(200);
    expect(response.body).to.have.property("id");
    expect(response.body).to.have.property("name");
  });

  it("should return cached data after the first request", async () => {
    const response = await request(app).get("/menus");
    expect(response.status).to.equal(200);
    expect(response.body).to.have.property("id");
    expect(response.body).to.have.property("name");
  });

  it("should return new data when the DB data changes", async () => {
    const response = await request(app).get("/menus");
    expect(response.status).to.equal(200);
    expect(response.body).not.to.deep.equal(oldData); // 예전 데이터와 비교
  });
});
