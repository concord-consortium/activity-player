import { getLoggingTeacherUsername } from "./logger";

describe("getLoggingTeacherUsername", () => {
  it("returns username based on domain UID and domain", () => {
    expect(getLoggingTeacherUsername(123, "https://learn.concord.org")).toEqual("123@learn.concord.org");
  });
});
