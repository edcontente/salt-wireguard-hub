import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password helpers", () => {
  it("hashes and verifies a password", async () => {
    const hash = await hashPassword("senha-secreta");

    expect(hash).not.toBe("senha-secreta");
    expect(await verifyPassword("senha-secreta", hash)).toBe(true);
  });

  it("rejects a mismatched password", async () => {
    const hash = await hashPassword("senha-secreta");

    expect(await verifyPassword("outra-senha", hash)).toBe(false);
  });
});
