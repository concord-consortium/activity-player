import { urlAlphabet, customAlphabet, nanoid } from "./nanoid";

describe("nanoid utilities", () => {
  describe("urlAlphabet", () => {
    it("should have the correct length (64 characters)", () => {
      expect(urlAlphabet).toHaveLength(64);
    });

    it("should contain only URL-safe characters", () => {
      // Check that it only contains A-Z, a-z, 0-9, _, -
      const validCharRegex = /^[A-Za-z0-9_-]+$/;
      expect(validCharRegex.test(urlAlphabet)).toBe(true);
    });

    it("should have all unique characters", () => {
      const uniqueChars = new Set(urlAlphabet.split(""));
      expect(uniqueChars.size).toBe(urlAlphabet.length);
    });

    it("should match the expected alphabet string", () => {
      expect(urlAlphabet).toBe("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz-");
    });
  });


  describe("nanoid (default export)", () => {
    it("should generate ID with default length of 21", () => {
      const id = nanoid();

      expect(typeof id).toBe("string");
      expect(id).toHaveLength(21);
    });

    it("should generate ID with custom length", () => {
      const id = nanoid(10);

      expect(id).toHaveLength(10);
    });

    it("should only contain characters from urlAlphabet", () => {
      const id = nanoid(100); // Use larger size for better coverage

      for (const char of id) {
        expect(urlAlphabet).toContain(char);
      }
    });

    it("should generate unique IDs", () => {
      const ids = new Set();
      const numIds = 1000;

      for (let i = 0; i < numIds; i++) {
        ids.add(nanoid());
      }

      // All IDs should be unique
      expect(ids.size).toBe(numIds);
    });

    it("should generate IDs that are URL-safe", () => {
      const id = nanoid(50);

      // Should not require URL encoding
      expect(encodeURIComponent(id)).toBe(id);
    });

    it("should handle edge case of size 1", () => {
      const id = nanoid(1);

      expect(id).toHaveLength(1);
      expect(urlAlphabet).toContain(id);
    });

    it("should be consistent with crypto randomness", () => {
      // This test ensures that multiple calls produce different results
      // (very high probability with cryptographically secure randomness)
      const id1 = nanoid(20);
      const id2 = nanoid(20);

      expect(id1).not.toBe(id2);
    });
  });
});
