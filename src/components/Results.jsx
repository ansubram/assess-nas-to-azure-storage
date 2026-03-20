import { isAvailableInRegion } from "../data/regionAvailability.js";
import { getBlobArchiveRedundancyAdjustment } from "../utils/matchOutcomes.js";

/**
 * Resolve a stored answer value (string or array) to a human-readable label
 * using the question's options list.
 */
function resolveLabel(question, value) {
  if (!question.options) return String(value);

  // Flatten grouped options into a single list for lookup
  const flat = question.options[0]?.group !== undefined
    ? question.options.flatMap((g) => g.items)
    : question.options;

  if (Array.isArray(value)) {
    const labels = value.map((v) => flat.find((o) => o.value === v)?.label ?? v);
    return labels.join(", ");
  }
  return flat.find((o) => o.value === value)?.label ?? value;
}

export default function Results({ outcomes, answers, questions, onRestart }) {
  // Show a notice only if the user explicitly selected ANF as a target service
  // but it was blocked by region availability.
  const selectedAnf = answers?.targetService?.includes("anf");
  const anfRegionExcluded =
    selectedAnf &&
    answers?.region &&
    !isAvailableInRegion("anf-default", answers.region);

  const blobArchiveRedundancyAdjustment = getBlobArchiveRedundancyAdjustment(answers);
  const redundancyLabelMap = {
    lrs: "LRS",
    zrs: "ZRS",
    grs: "GRS",
    gzrs: "GZRS",
  };

  // Build the list of questions that were actually answered (visible questions only)
  const answeredQuestions = (questions ?? []).filter(
    (q) => answers[q.id] !== undefined
  );

  return (
    <div className="card results-card">
      <h2 className="results-heading">
        {outcomes.length > 0
          ? "Here are your recommended options"
          : "No matches found"}
      </h2>

      {anfRegionExcluded && (
        <p className="region-notice">
          ⚠ Azure NetApp Files is not available in the selected region and has been excluded from results.
        </p>
      )}

      {blobArchiveRedundancyAdjustment && (
        <p className="region-notice">
          ⚠ Azure Blob Archive tier does not support {redundancyLabelMap[blobArchiveRedundancyAdjustment.requested]}. For compatibility, this assessment uses {redundancyLabelMap[blobArchiveRedundancyAdjustment.applied]} for the Archive tier.
        </p>
      )}

      {/* Methodology callout */}
      <div className="callout-section">
        <ul className="callout-list">
          <li>
            <strong>Performance filtering:</strong> In a full assessment, this list is further refined based on discovered performance metrics (IOPS, throughput) and sizing considerations from your source environment.
          </li>
          <li>
            <strong>All eligible SKUs shown (unranked):</strong> The list below presents every SKU that is eligible for the data being assessed — it is not ranked or ordered. The <strong>Recommended</strong> SKU is determined separately, based on the suitability weightage calculated from your inputs and, where two SKUs score equally, by cost. You can still review the attributes and pricing of all other listed SKUs.
          </li>
          <li>
            <strong>Ranking methodology:</strong> Source data is evaluated by protocol, version, and redundancy availability, then by performance and scalability metrics (with default inputs where applicable). Each SKU receives a relative suitability weight; where two SKUs score equally, cost is used as the tiebreaker.
          </li>
        </ul>
      </div>

      {outcomes.length === 0 ? (
        <p className="no-results">
          Your answers didn't match any products in our current catalogue. Try
          adjusting your selections.
        </p>
      ) : (
        <ul className="results-list">
          {outcomes.map((outcome) => (
            <li key={outcome.id} className="result-item">
              <div className="result-title-row">
                <h3 className="result-title">{outcome.title}</h3>
                {outcome.id === "blob-archive" && blobArchiveRedundancyAdjustment && (
                  <span className="result-badge" aria-label="Redundancy adjusted for compatibility">
                    Redundancy adjusted to {redundancyLabelMap[blobArchiveRedundancyAdjustment.applied]}
                  </span>
                )}
              </div>
              <p className="result-description">{outcome.description}</p>
            </li>
          ))}
        </ul>
      )}

      {/* Inputs summary */}
      <div className="summary-section">
        <h3 className="summary-heading">Your selections</h3>
        <dl className="summary-list">
          {answeredQuestions.map((q) => (
            <div key={q.id} className="summary-row">
              <dt className="summary-label">{q.text}</dt>
              <dd className="summary-value">{resolveLabel(q, answers[q.id])}</dd>
            </div>
          ))}
        </dl>
      </div>

      <button className="restart-btn" onClick={onRestart}>
        ↩ Start Over
      </button>
    </div>
  );
}
