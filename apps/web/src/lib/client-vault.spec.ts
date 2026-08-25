import { describe, expect, it } from "vitest";
import {
  createRecoveryKit,
  decryptString,
  encryptString,
  generateVaultKey,
  recoverVaultKey,
} from "./client-vault";

describe("client-encrypted vault", () => {
  it("round-trips an encrypted string", async () => {
    const key = await generateVaultKey();
    const payload = await encryptString(key, "crypto seed phrase");
    expect(payload.ciphertext).not.toContain("seed");
    expect(await decryptString(key, payload)).toBe("crypto seed phrase");
  });

  it("recovers the key from a 3-of-5 kit and still decrypts", async () => {
    const key = await generateVaultKey();
    const payload = await encryptString(key, "last will location");
    const kit = await createRecoveryKit(key, { shareCount: 5, threshold: 3 });
    expect(kit.shares).toHaveLength(5);
    const recovered = await recoverVaultKey([kit.shares[0]!, kit.shares[2]!, kit.shares[4]!]);
    expect(await decryptString(recovered, payload)).toBe("last will location");
  });
});
