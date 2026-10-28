import { describe, expect, it } from "vitest";
import { computeProgress, displayName } from "@/lib/progress";

const coffee = { id: "coffee", name: "Free coffee", costPoints: 100 };
const wash = { id: "wash", name: "Car wash", costPoints: 250 };
const at = (balance: number, rewards = [coffee]) =>
  computeProgress({ balance, pointsPerVisit: 5, rewards });

describe("computeProgress (§7)", () => {
  it("0 points: 20 visits to a Free coffee, empty gauge", () => {
    expect(at(0)).toMatchObject({ target: coffee, unlocked: false, visitsToNext: 20, percent: 0 });
  });

  it("5 points: 19 more visits, 5%", () => {
    expect(at(5)).toMatchObject({ visitsToNext: 19, percent: 5 });
  });

  it("35 points: 13 more visits (§11 example)", () => {
    expect(at(35).visitsToNext).toBe(13);
  });

  it("rounds visits up when points don't divide evenly", () => {
    expect(at(97).visitsToNext).toBe(1);
  });

  it("100 points: unlocked, full gauge", () => {
    expect(at(100)).toMatchObject({
      unlocked: true,
      visitsToNext: 0,
      percent: 100,
      affordable: [coffee],
    });
  });

  it("105 points: still unlocked, gauge capped at 100%", () => {
    expect(at(105)).toMatchObject({ unlocked: true, percent: 100 });
  });

  it("with two rewards, targets the cheapest one not yet affordable — or the cheapest affordable", () => {
    expect(at(50, [wash, coffee]).target).toEqual(coffee);
    expect(at(120, [wash, coffee])).toMatchObject({
      target: coffee,
      unlocked: true,
      affordable: [coffee],
    });
  });

  it("no active rewards: nothing to aim for", () => {
    expect(at(40, [])).toMatchObject({ target: null, unlocked: false, percent: 0 });
  });
});

describe("displayName", () => {
  it("first name and last initial", () => {
    expect(displayName("Andrei", "Popescu")).toBe("Andrei P.");
    expect(displayName("Ștefan", "ștefănescu")).toBe("Ștefan Ș.");
  });

  it("null for an account nobody has signed up to yet", () => {
    expect(displayName(null, null)).toBeNull();
  });
});
