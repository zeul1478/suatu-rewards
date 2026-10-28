import { randomInt, randomUUID } from "node:crypto";

/*
 * Obviously fictional test data (spec §1.6). Phone numbers use the 555 exchange with a random
 * area code, so parallel tests on every device project never collide.
 */

export function testPhone(): { typed: string; e164: string } {
  const area = randomInt(201, 990);
  const line = String(randomInt(0, 10_000)).padStart(4, "0");
  return { typed: `(${area}) 555-${line}`, e164: `+1${area}555${line}` };
}

export function testEmail(): string {
  return `test-${randomUUID()}@example.test`;
}

/** A private IPv4 address per test, so per-IP login limits don't spill between tests. */
export function testIp(): string {
  return `10.${randomInt(0, 256)}.${randomInt(0, 256)}.${randomInt(1, 255)}`;
}

export function testCustomer() {
  return {
    phone: testPhone(),
    firstName: "Testa",
    lastName: "Fictiva",
    email: testEmail(),
    password: `walk to the pump ${randomInt(1000, 9999)}`,
  };
}
