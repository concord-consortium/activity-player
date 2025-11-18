/**
 * A secure, URL-friendly, unique string ID generator function in TypeScript,
 *
 * This is used instead of the package "nanoid" as that package uses a module
 * format that is not compatible with our build system.
 *
 * References:
 * - Original Nano ID repository: https://github.com/ai/nanoid
 */

const crypto = globalThis.crypto;

if (!crypto || !crypto.getRandomValues) {
  throw new Error(
    "Secure random number generator not found. Ensure you are running in a supported environment.",
  );
}

/**
 * The default URL-friendly alphabet used by Nano ID.
 * 64 unique characters: A-Z, a-z, 0-9, _, -
 */
export const urlAlphabet =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz-";

/**
 * Creates a unique string ID generator function with a custom alphabet and length.
 *
 * @param alphabet The string of characters to use in the ID. Must have at most 256 unique characters.
 * @param defaultSize The default length of the ID to generate.
 * @returns A function that generates a cryptographically secure, random ID.
 */
export function customAlphabet(
  alphabet: string,
  defaultSize = 21,
): (size?: number) => string {
  // Nano ID"s alphabet must have a length of 256 or less for security.
  if (alphabet.length > 256 || alphabet.length === 0) {
    throw new Error("Alphabet must be between 1 and 256 characters long.");
  }

  // Pre-calculate values for performance.
  const alphabetLength = alphabet.length;

  // Mask is used to quickly check if a random byte is within the alphabet range.
  const mask = alphabetLength - 1;

  // Step calculates the optimal number of random bytes to fetch per batch.
  // This minimizes calls to the slow crypto.getRandomValues.
  const step = Math.ceil((1.6 * mask * defaultSize) / alphabetLength);

  return (size: number = defaultSize): string => {
    let id = "";
    let bytes: Uint8Array = new Uint8Array(step);
    let byteIndex = 0;

    // Fill the ID until it reaches the desired size.
    while (id.length < size) {
        // Generate a new batch of random bytes if needed.
        if (byteIndex === 0) {
            bytes = new Uint8Array(step);
            crypto.getRandomValues(bytes);
        }

        // Loop through the random bytes in the batch.
        for (; byteIndex < step; byteIndex++) {
            // Use a bitwise AND with the mask. This is the main performance trick:
            // it efficiently maps the 0-255 byte value to a number near (and often below) alphabetLength.
            const randomIndex = bytes[byteIndex] & mask;

            // If the random index is within the alphabet"s actual range, append the character.
            if (randomIndex < alphabetLength) {
                id += alphabet[randomIndex];
                if (id.length === size) {
                    // Reset index for the next call and return the finished ID.
                    byteIndex++;
                    return id;
                }
            }
        }
        // Reset index to generate a new batch of random bytes.
        byteIndex = 0;
    }

    return id; // Should be unreachable unless size is 0 or less.
  };
}

export const nanoid = customAlphabet(urlAlphabet, 21);
