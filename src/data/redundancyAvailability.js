/**
 * Per-outcome redundancy support map.
 *
 * Sources:
 *  - Azure Blob and Azure Files:
 *      https://learn.microsoft.com/en-us/azure/storage/common/storage-redundancy
 *      https://learn.microsoft.com/en-us/azure/storage/files/storage-files-planning#redundancy
 *  - Azure NetApp Files:
 *      https://learn.microsoft.com/en-us/azure/azure-netapp-files/azure-netapp-files-introduction
 *
 * Key facts:
 *  - Blob Hot / Cool / Cold: support all four types (LRS, ZRS, GRS, GZRS).
 *  - Blob Archive:           ZRS and GZRS are NOT supported for the archive access tier.
 *  - Azure Files Standard HDD: supports all four types (LRS, ZRS, GRS, GZRS).
 *  - Azure Files Premium SSD:  LRS and ZRS only — GRS and GZRS are not supported for SSD file shares.
 *  - Azure NetApp Files:       maps to LRS (Standard/Premium/Ultra tiers) and ZRS
 *                              (Elastic zone-redundant tier). No built-in GRS/GZRS equivalent;
 *                              Cross-Region Replication is a separate DR add-on, not a storage SKU.
 *  - RA-GRS and RA-GZRS are not surfaced — Azure Files doesn't support them, and for Blobs
 *    they are read-access variants of GRS/GZRS rather than distinct storage SKUs.
 */
export const outcomeRedundancySupport = {
  "blob-hot":            ["lrs", "zrs", "grs", "gzrs"],
  "blob-cool":           ["lrs", "zrs", "grs", "gzrs"],
  "blob-cold":           ["lrs", "zrs", "grs", "gzrs"],
  "blob-archive":        ["lrs", "grs"],           // ZRS / GZRS not supported for archive tier
  "files-standard-hdd":  ["lrs", "zrs", "grs", "gzrs"],
  "files-premium-ssd":   ["lrs", "zrs"],           // SSD: LRS and ZRS only
  "anf-default":         ["lrs", "zrs"],           // ANF: local tiers (LRS) + Elastic ZR tier (ZRS)
};

/**
 * Returns true if the given outcome supports the given redundancy type.
 * Falls back to true when no mapping exists (permissive default).
 */
export function supportsRedundancy(outcomeId, redundancy) {
  return outcomeRedundancySupport[outcomeId]?.includes(redundancy) ?? true;
}
