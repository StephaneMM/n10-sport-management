import { describe, expect, it } from "vitest";

import { SPORTS } from "./constants";

describe("SPORTS", () => {
  it("includes the NCAA and NAIA sports available in the application form", () => {
    expect(SPORTS).toEqual(expect.arrayContaining([
      "Acrobatics & Tumbling",
      "Archery",
      "Beach Volleyball",
      "Bowling",
      "Competitive Dance",
      "Cross Country",
      "Equestrian",
      "Fencing",
      "Field Hockey",
      "Flag Football",
      "Gymnastics",
      "Ice Hockey",
      "Lacrosse",
      "Rifle",
      "Rowing",
      "Rugby",
      "Skiing",
      "Softball",
      "Stunt",
      "Triathlon",
      "Water Polo",
      "Wrestling",
    ]));
  });

  it("keeps Other as the final fallback option", () => {
    expect(SPORTS[SPORTS.length - 1]).toBe("Other");
  });
});
