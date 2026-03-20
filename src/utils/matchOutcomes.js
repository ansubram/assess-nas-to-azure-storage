import { isAvailableInRegion } from "../data/regionAvailability.js";
import { serviceOutcomeMap } from "../data/treeConfig.js";
import { supportsRedundancy } from "../data/redundancyAvailability.js";

const blobTierMap = {
  hot: "blob-hot",
  cool: "blob-cool",
  cold: "blob-cold",
  archive: "blob-archive",
};

const blobTierOrder = ["blob-hot", "blob-cool", "blob-cold", "blob-archive"];

/**
 * If a selected Blob tier is unavailable in the selected region, move to the
 * nearest warmer tier (archive -> cold -> cool -> hot) that is available.
 */
export function getBlobTierRegionAdjustment(answers, availabilityFn = isAvailableInRegion) {
  const selectedServices = answers?.targetService ?? [];
  const selectedRegion = answers?.region;
  const requestedTier = answers?.blobAccessFrequency;

  if (!selectedServices.includes("blobs")) return null;
  if (!selectedRegion || !requestedTier) return null;

  const requestedOutcomeId = blobTierMap[requestedTier];
  if (!requestedOutcomeId) return null;
  if (availabilityFn(requestedOutcomeId, selectedRegion)) return null;

  const requestedIndex = blobTierOrder.indexOf(requestedOutcomeId);
  const appliedOutcomeId = blobTierOrder
    .slice(0, requestedIndex)
    .reverse()
    .find((outcomeId) => availabilityFn(outcomeId, selectedRegion));

  if (!appliedOutcomeId) return null;

  return {
    requested: requestedOutcomeId,
    applied: appliedOutcomeId,
  };
}

/**
 * Blob Archive does not support ZRS/GZRS. When users request a zone-based
 * redundancy with Archive tier, we fall back to GRS so the archive option
 * remains eligible instead of being dropped entirely.
 */
export function getBlobArchiveRedundancyAdjustment(answers) {
  const selectedServices = answers?.targetService ?? [];
  const selectedRedundancy = answers?.redundancy;

  if (!selectedServices.includes("blobs")) return null;
  if (answers?.blobAccessFrequency !== "archive") return null;
  if (selectedRedundancy !== "zrs" && selectedRedundancy !== "gzrs") return null;

  return {
    requested: selectedRedundancy,
    applied: "grs",
  };
}

/**
 * Returns all outcomes that pass four gates:
 *  1. Service gate    — outcome belongs to at least one of the user-selected target services
 *  2. Region gate     — outcome is available in the selected region
 *  3. Redundancy gate — outcome supports the selected redundancy type
 *  4. Rules gate      — at least one rule set is fully satisfied by the user's answers
 */
export function getEligibleOutcomes(outcomes, answers) {
  const selectedRegion = answers.region;
  const selectedServices = answers.targetService; // array | undefined
  const selectedRedundancy = answers.redundancy;   // string | undefined
  const blobArchiveAdjustment = getBlobArchiveRedundancyAdjustment(answers);
  const blobTierRegionAdjustment = getBlobTierRegionAdjustment(answers);

  // Build the set of outcome IDs allowed by the selected services
  const allowedByService =
    selectedServices && selectedServices.length > 0
      ? new Set(selectedServices.flatMap((svc) => serviceOutcomeMap[svc] ?? []))
      : null;

  return outcomes.filter((outcome) => {
    // --- Service gate ---
    if (allowedByService && !allowedByService.has(outcome.id)) return false;

    // --- Region gate ---
    if (selectedRegion && !isAvailableInRegion(outcome.id, selectedRegion)) return false;

    // --- Blob tier gate ---
    // Maps access frequency answer directly to one of the four Blob tier outcome IDs.
    if (answers.blobAccessFrequency) {
      const requestedBlobOutcomeId = blobTierMap[answers.blobAccessFrequency];
      const effectiveBlobOutcomeId = blobTierRegionAdjustment?.applied ?? requestedBlobOutcomeId;
      const isBlobTierOutcome = Object.values(blobTierMap).includes(outcome.id);
      if (isBlobTierOutcome && outcome.id !== effectiveBlobOutcomeId) {
        return false;
      }
    }

    // --- Media type gate (Azure Files outcomes only) ---
    // Exactly one of files-premium-ssd / files-standard-hdd is eligible based on media selection.
    // workloadType is collected for future IOPS/cost baseline purposes but does not filter here.
    if (answers.filesMediaType) {
      const filesMediaTypeMap = { ssd: "files-premium-ssd", hdd: "files-standard-hdd" };
      const isFilesMediaOutcome =
        outcome.id === "files-premium-ssd" || outcome.id === "files-standard-hdd";
      if (isFilesMediaOutcome && outcome.id !== filesMediaTypeMap[answers.filesMediaType]) {
        return false;
      }
    }

    // --- Redundancy gate ---
    const effectiveRedundancy =
      outcome.id === "blob-archive" && blobArchiveAdjustment
        ? blobArchiveAdjustment.applied
        : selectedRedundancy;
    if (effectiveRedundancy && !supportsRedundancy(outcome.id, effectiveRedundancy)) return false;

    // --- Rules gate ---
    if (!outcome.rules || outcome.rules.length === 0) return true;

    return outcome.rules.some((ruleSet) =>
      Object.entries(ruleSet).every(
        ([questionId, requiredValue]) => answers[questionId] === requiredValue
      )
    );
  });
}
