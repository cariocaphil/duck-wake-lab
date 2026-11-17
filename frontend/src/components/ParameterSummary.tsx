import { PHYSICS_LEVEL_LABELS, type DuckParameters } from "../types";

interface SummaryItemProps {
  label: string;
  testId: string;
  children: string;
}

function SummaryItem({ label, testId, children }: SummaryItemProps) {
  return (
    <div>
      <dt>{label}</dt>
      <dd data-testid={testId}>{children}</dd>
    </div>
  );
}

interface ParameterSummaryProps {
  parameters: DuckParameters;
}

export function ParameterSummary({ parameters }: ParameterSummaryProps) {
  return (
    <aside className="parameter-summary" aria-label="Selected parameters">
      <h2>Selected parameters</h2>
      <dl>
        <SummaryItem label="Species" testId="param-species">
          {parameters.species}
        </SummaryItem>
        <SummaryItem label="Body length" testId="param-body-length">
          {`${parameters.bodyLength.toFixed(2)} m`}
        </SummaryItem>
        <SummaryItem label="Swimming speed" testId="param-speed">
          {`${parameters.speed.toFixed(2)} m/s`}
        </SummaryItem>
        <SummaryItem label="Physics level" testId="param-physics">
          {PHYSICS_LEVEL_LABELS[parameters.physicsLevel]}
        </SummaryItem>
      </dl>
    </aside>
  );
}
