import _activity from "../data/sample-activity-multiple-layout-types.json";
import _sequence from "../data/sample-sequence-with-questions.json";
import { Activity, Sequence } from "../types";
import { convertLegacyResource } from "./convert";

describe("conversion test", () => {
  it("convert activity", async() => {
    const activity = _activity;
    const convertedResource = await convertLegacyResource(activity) as Activity;
    expect(convertedResource).not.toBe({});
    expect(convertedResource.version).toEqual(2);
    expect(convertedResource.pages[1].sections).toHaveLength(2);
    expect(convertedResource.pages[1].sections[1].embeddables).toHaveLength(5);
  });
  it("convert sequence", async() => {
    const sequence = _sequence;
    const convertedResource = await convertLegacyResource(sequence) as Sequence;
    expect(convertedResource).not.toBe({});
    expect(convertedResource.activities[1].version).toEqual(2);
    expect(convertedResource.activities[1].pages[1].sections).toHaveLength(2);
    expect(convertedResource.activities[1].pages[1].sections[1].embeddables).toHaveLength(5);
  });
});
