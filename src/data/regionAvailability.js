/**
 * Regional availability for each outcome SKU.
 *
 * Source (as of March 2026):
 *  - Azure Blob Storage (all tiers): GA in all Azure public regions
 *    https://learn.microsoft.com/azure/storage/blobs/
 *  - Azure Files Standard HDD Provisioned v2: GA in all Azure public regions
 *    https://learn.microsoft.com/azure/storage/files/understanding-billing#provisioned-v2-availability
 *  - Azure Files Premium SSD Provisioned v2: GA in all Azure public regions
 *    https://learn.microsoft.com/azure/storage/files/understanding-billing#provisioned-v2-availability
 *  - Azure NetApp Files: Limited regional availability
 *    https://learn.microsoft.com/azure/azure-netapp-files/large-volumes-requirements-considerations#supported-regions
 *    (large volumes supported regions == ANF-enabled regions)
 *
 * Structure:
 *   Key   = outcome id (matches outcomes in treeConfig.js)
 *   Value = "all"          → available in every region
 *         | Set<string>    → only available in the listed region values
 */

// Regions where Azure NetApp Files is GA (using the region values from treeConfig.js)
const ANF_REGIONS = new Set([
  // Americas
  "eastus",
  "eastus2",
  "westus",
  "westus2",
  "westus3",
  "centralus",
  "northcentralus",
  "southcentralus",
  "canadacentral",
  "canadaeast",
  "brazilsouth",
  "brazilsoutheast",
  // NOTE: mexicocentral and westcentralus are NOT supported by ANF

  // Europe
  "northeurope",
  "westeurope",
  "uksouth",
  "ukwest",
  "francecentral",
  // NOTE: francesouth is NOT supported by ANF
  "germanywestcentral",
  "germanynorth",
  "switzerlandnorth",
  "switzerlandwest",
  "norwayeast",
  "norwaywest",
  "swedencentral",
  // NOTE: polandcentral is NOT supported by ANF
  "italynorth",
  "spaincentral",

  // Asia Pacific
  "eastasia",
  "southeastasia",
  "australiaeast",
  "australiasoutheast",
  "australiacentral",
  "australiacentral2",
  "japaneast",
  "japanwest",
  "koreacentral",
  "koreasouth",
  "centralindia",
  // NOTE: southindia, westindia, newzealandnorth are NOT supported by ANF

  // Middle East & Africa
  "uaenorth",
  // NOTE: uaecentral is NOT supported by ANF
  "qatarcentral",
  // NOTE: israelcentral is NOT supported by ANF
  "southafricanorth",
  // NOTE: southafricawest is NOT supported by ANF
]);

export const outcomeRegionAvailability = {
  "blob-hot":           "all",
  "blob-cold":          "all",
  "blob-cool":          "all",
  "blob-archive":       "all",
  "files-standard-hdd": "all",
  "files-premium-ssd":  "all",
  "anf-default":        ANF_REGIONS,
};

/**
 * Returns true if the given outcome is available in the selected region.
 * @param {string} outcomeId
 * @param {string} regionValue  – the value from the region dropdown
 */
export function isAvailableInRegion(outcomeId, regionValue) {
  const availability = outcomeRegionAvailability[outcomeId];
  if (!availability || availability === "all") return true;
  return availability.has(regionValue);
}
