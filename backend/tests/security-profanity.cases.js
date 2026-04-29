const { assertSafePlainText } = require("../src/utils/xss");
const { hasProfanity, normalizeCompact, normalizeForWords } = require("../src/utils/profanity-filter");

describe("backend security hardening - profanity filter", () => {
  test("normalizes obfuscated latin text", () => {
    expect(normalizeForWords("F.U.C.K")).toBe("f u c k");
    expect(normalizeCompact("F.U.C.K")).toBe("fuck");
  });

  test("detects clear English profanity", () => {
    expect(hasProfanity("bad fuck text")).toBe(true);
    expect(hasProfanity("f.u.c.k text")).toBe(true);
    expect(() => assertSafePlainText("bad fuck text", "name")).toThrow("ข้อความมีคำไม่เหมาะสม กรุณาแก้ไขก่อนบันทึก");
  });

  test("detects clear Thai profanity", () => {
    expect(hasProfanity("เมนูเหี้ยมาก")).toBe(true);
    expect(hasProfanity("ค ว ย")).toBe(true);
    expect(() => assertSafePlainText("เมนูเหี้ยมาก", "productName")).toThrow("ข้อความมีคำไม่เหมาะสม กรุณาแก้ไขก่อนบันทึก");
  });

  test("allows known safe words that contain risky latin fragments", () => {
    expect(hasProfanity("passion fruit")).toBe(false);
    expect(hasProfanity("classic assam tea")).toBe(false);
    expect(assertSafePlainText("classic assam tea", "productName")).toBe("classic assam tea");
  });

  test("allows known safe Thai menu words that contain blocked fragments", () => {
    expect(hasProfanity("โปรตีนเชค")).toBe(false);
    expect(hasProfanity("ตีนไก่ตุ๋น")).toBe(false);
    expect(hasProfanity("กากหมูเจียว")).toBe(false);
  });
});
