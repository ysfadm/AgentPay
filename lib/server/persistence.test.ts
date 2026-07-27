import { describe, it, expect } from "vitest";
import { encryptSecrets, decryptSecrets } from "./persistence";

describe("persistence encryption", () => {
  it("round-trips agent secrets and does not leak plaintext", () => {
    const secrets = {
      "agent-1": "SABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUV",
      "agent-2": "SZYXWVUTSRQPONMLKJIHGFEDCBA765432ZYXWVUTSRQPONMLKJIHGFE",
    };
    const blob = encryptSecrets(secrets);
    expect(blob.data).not.toContain("SABCDEFG");
    expect(decryptSecrets(blob)).toEqual(secrets);
  });

  it("returns empty object when the ciphertext is tampered with", () => {
    const blob = encryptSecrets({ a: "secret-value" });
    const tampered = { ...blob, data: `${blob.data.slice(0, -2)}00` };
    expect(decryptSecrets(tampered)).toEqual({});
  });
});
