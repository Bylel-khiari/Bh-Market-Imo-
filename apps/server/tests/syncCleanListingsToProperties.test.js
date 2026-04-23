import { describe, expect, it } from "vitest";
import { buildSyncPlan } from "../scripts/syncCleanListingsToProperties.mjs";

describe("syncCleanListingsToProperties", () => {
  it("rebuilds properties directly from clean_listings when admin columns exist in the source", () => {
    const cleanColumns = [
      "id",
      "title",
      "url",
      "is_active",
      "is_deleted",
      "created_by_admin",
      "manual_title",
      "manual_price_raw",
      "manual_price_value",
      "manual_location_raw",
      "manual_city",
      "manual_country",
      "manual_image",
      "manual_description",
      "manual_source",
      "manual_url",
      "manual_scraped_at",
      "admin_updated_at",
    ];
    const propertiesColumns = [...cleanColumns];

    const plan = buildSyncPlan({ cleanColumns, propertiesColumns });

    expect(plan.replaceAllRows).toBe(true);
    expect(plan.insertColumns.filter((columnName) => columnName === "is_active")).toHaveLength(1);
    expect(plan.insertColumns).toEqual(cleanColumns);
    expect(plan.selectFragments).toEqual(cleanColumns.map((columnName) => `src.\`${columnName}\``));
    expect(plan.previousJoinCondition).toBe("");
  });

  it("preserves admin fields from previous properties rows when the source lacks them", () => {
    const cleanColumns = ["id", "title", "url"];
    const propertiesColumns = [
      "id",
      "title",
      "url",
      "is_active",
      "is_deleted",
      "created_by_admin",
      "manual_title",
      "manual_price_raw",
      "manual_price_value",
      "manual_location_raw",
      "manual_city",
      "manual_country",
      "manual_image",
      "manual_description",
      "manual_source",
      "manual_url",
      "manual_scraped_at",
      "admin_updated_at",
    ];

    const plan = buildSyncPlan({ cleanColumns, propertiesColumns });

    expect(plan.replaceAllRows).toBe(false);
    expect(plan.sharedColumns).toEqual(["id", "title", "url"]);
    expect(plan.insertColumns.filter((columnName) => columnName === "is_active")).toHaveLength(1);
    expect(plan.insertColumns).toContain("is_active");
    expect(plan.selectFragments).toContain("COALESCE(prev.is_active, 1) AS is_active");
    expect(plan.previousJoinCondition).toBe("prev.id = src.id");
  });
});
