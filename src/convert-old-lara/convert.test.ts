import _activity from "../data/sample-activity-multiple-layout-types.json";
import _sequence from "../data/sample-sequence-with-questions.json";
import _glossaryActivity from "../data/sample-activity-glossary-plugin.json";
import { Activity, Sequence } from "../types";
import { convertLegacyResource } from "./convert";
import { productionGlossaryUrl } from "./glossary-info";

describe("conversion test", () => {
  it("convert activity", async() => {
    const activity = _activity;
    const convertedResource = await convertLegacyResource(activity) as Activity;
    expect(convertedResource).not.toBe({});
    expect(convertedResource.version).toEqual(2);
    expect(convertedResource.pages[1].sections).toHaveLength(2);
    expect(convertedResource.pages[1].sections[1].embeddables).toHaveLength(5);
  });
  it("convert glossary activity", async() => {
    const glossaryActivity = _glossaryActivity;
    const convertedResource = await convertLegacyResource(glossaryActivity) as Activity;
    const originalAuthorData = JSON.parse(glossaryActivity.plugins[0].author_data);
    const convertedAuthorData = JSON.parse(convertedResource.plugins[0].author_data);
    expect(originalAuthorData.glossaryResourceId).toBe("upZ83jqTZAZuoQqRAfAb");
    expect(convertedAuthorData.glossaryResourceId).toBe("this-is-a-fake-CONVERTED-glossary-resource-id");
    expect(originalAuthorData.s3Url).toBe("https://models-resources.concord.org/glossary-resources/upZ83jqTZAZuoQqRAfAb/glossary.json");
    expect(convertedAuthorData.s3Url).toBe(`${productionGlossaryUrl}/api/v1/glossaries/37?json_only=true`);
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
