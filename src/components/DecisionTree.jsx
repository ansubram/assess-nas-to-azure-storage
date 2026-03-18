import { useState, useEffect, useRef } from "react";

/** Pull the first selectable value out of flat or grouped options. */
function getFirstValue(question) {
  if (!question.options?.length) return "";
  const first = question.options[0];
  return first.group !== undefined
    ? (first.items?.[0]?.value ?? "")
    : (first.value ?? "");
}

/** True if options are grouped { group, items } objects. */
function isGrouped(question) {
  return question.options?.length > 0 && question.options[0].group !== undefined;
}

/** Filter options by requiresAnswer conditions. */
function getVisibleOptions(options, answers) {
  return options.filter((opt) => {
    if (!opt.requiresAnswer) return true;
    return Object.entries(opt.requiresAnswer).every(
      ([qId, val]) => answers[qId] === val
    );
  });
}

/** Determine whether a question is visible given current answers. */
function isQuestionVisible(question, answers) {
  if (!question.showIf) return true;
  return Object.entries(question.showIf).every(([qId, condition]) => {
    const answer = answers[qId];
    if (condition !== null && typeof condition === "object" && "includes" in condition) {
      return Array.isArray(answer) && answer.includes(condition.includes);
    }
    return answer === condition;
  });
}

/** Resolve a stored answer to a human-readable label. */
function resolveLabel(question, value) {
  if (!question.options) return String(value ?? "");
  const flat = isGrouped(question)
    ? question.options.flatMap((g) => g.items)
    : question.options;
  if (Array.isArray(value)) {
    return value.map((v) => flat.find((o) => o.value === v)?.label ?? v).join(", ");
  }
  return flat.find((o) => o.value === value)?.label ?? String(value ?? "");
}

export default function DecisionTree({ questions, onComplete }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [selectValue, setSelectValue] = useState("");
  const [multiValues, setMultiValues] = useState([]);
  const activeRef = useRef(null);

  const question = questions[currentIndex];
  const isSelect = question.type === "select";
  const isMulti = question.type === "multiselect";

  // Sync local UI state and scroll active card into view on question change
  useEffect(() => {
    if (isSelect) {
      setSelectValue(answers[question.id] ?? getFirstValue(question));
    }
    if (isMulti) {
      setMultiValues(answers[question.id] ?? []);
    }
    setTimeout(() => {
      activeRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 50);
  }, [currentIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  function advance(value) {
    const prev = answers[question.id];
    let updated = { ...answers, [question.id]: value };

    const prevStr = JSON.stringify(prev);
    const nextStr = JSON.stringify(value);
    if (prev !== undefined && prevStr !== nextStr) {
      questions.slice(currentIndex + 1).forEach((q) => delete updated[q.id]);
    }

    let next = currentIndex + 1;
    while (next < questions.length && !isQuestionVisible(questions[next], updated)) {
      delete updated[questions[next].id];
      next++;
    }

    setAnswers(updated);
    if (next < questions.length) {
      setCurrentIndex(next);
    } else {
      onComplete(updated);
    }
  }

  function handleBack() {
    let prev = currentIndex - 1;
    while (prev > 0 && !isQuestionVisible(questions[prev], answers)) {
      prev--;
    }
    setCurrentIndex(prev < 0 ? 0 : prev);
  }

  function toggleMulti(value) {
    setMultiValues((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }

  // All answered visible questions that come before the active one
  const answeredIndices = [];
  for (let i = 0; i < currentIndex; i++) {
    if (answers[questions[i].id] !== undefined) {
      answeredIndices.push(i);
    }
  }

  const visibleOptions = (isMulti || isSelect)
    ? getVisibleOptions(question.options, answers)
    : question.options;

  // Step number = count of visible questions answered so far + 1
  const stepNumber = answeredIndices.length + 1;

  return (
    <div className="questions-container">
      {/* Compact answered cards */}
      {answeredIndices.map((idx) => {
        const q = questions[idx];
        return (
          <div key={q.id} className="answered-card">
            <span className="answered-label">{q.text}</span>
            <span className="answered-value">{resolveLabel(q, answers[q.id])}</span>
          </div>
        );
      })}

      {/* Active question card */}
      <div className="card" ref={activeRef}>
        <p className="step-label">Step {stepNumber}</p>
        <h2 className="question-text">{question.text}</h2>
        {question.note && (
          <p className="question-note">{question.note}</p>
        )}

        {isSelect ? (
          <div className="select-wrapper">
            <select
              className="select-input"
              value={selectValue}
              onChange={(e) => setSelectValue(e.target.value)}
            >
              {question.placeholder && (
                <option value="" disabled>{question.placeholder}</option>
              )}
              {isGrouped(question)
                ? question.options.map((group) => (
                    <optgroup key={group.group} label={group.group}>
                      {group.items.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </optgroup>
                  ))
                : visibleOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))
              }
            </select>
            <button
              className="continue-btn"
              disabled={!selectValue}
              onClick={() => advance(selectValue)}
            >
              Continue →
            </button>
          </div>
        ) : isMulti ? (
          <div className="multiselect-wrapper">
            <p className="multiselect-hint">Select all that apply</p>
            <div className="checkbox-list">
              {visibleOptions.map((opt) => (
                <label key={opt.value} className={`checkbox-label${multiValues.includes(opt.value) ? " checked" : ""}`}>
                  <input
                    type="checkbox"
                    className="checkbox-input"
                    checked={multiValues.includes(opt.value)}
                    onChange={() => toggleMulti(opt.value)}
                  />
                  <span className="checkbox-text">{opt.label}</span>
                </label>
              ))}
            </div>
            <button
              className="continue-btn"
              disabled={multiValues.length === 0}
              onClick={() => advance(multiValues)}
            >
              Continue →
            </button>
          </div>
        ) : (
          <div className="options-list">
            {visibleOptions.map((opt) => (
              <button
                key={opt.value}
                className={`option-btn ${answers[question.id] === opt.value ? "selected" : ""}`}
                onClick={() => advance(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {currentIndex > 0 && (
          <button className="back-btn" onClick={handleBack}>
            ← Back
          </button>
        )}
      </div>
    </div>
  );
}
