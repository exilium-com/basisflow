import { CheckboxField, SliderField } from "../Field";
import { WorkspaceSection } from "./WorkspaceSection";
import { type Projection, type ProjectionTimelineState } from "../../lib/projectionState";

type TimelineSectionProps = {
  isHomeOwner: boolean;
  projection: Projection;
  timeline: ProjectionTimelineState;
  onUpdateTimeline: (timeline: ProjectionTimelineState) => void;
};

export function TimelineSection({ isHomeOwner, projection, timeline, onUpdateTimeline }: TimelineSectionProps) {
  const saleEnabled = isHomeOwner && timeline.homeSaleYear != null;
  const saleYear = timeline.homeSaleYear ?? Math.min(Math.max(projection.currentYear || 1, 1), projection.horizonYears);

  return (
    <WorkspaceSection id="timeline" index="06" title="Timeline" summary="Experimental">
      <div className="flex flex-col items-start gap-4 lg:flex-row lg:items-end">
        <CheckboxField
          disabled={!isHomeOwner}
          label="Sell home"
          checked={saleEnabled}
          onChange={(event) =>
            onUpdateTimeline({
              ...timeline,
              homeSaleYear: event.target.checked ? saleYear : null,
            })
          }
        />
        {saleEnabled ? (
          <SliderField
            className="w-full lg:flex-1"
            label="Sale year"
            valueLabel={`Year ${saleYear}`}
            min="1"
            max={projection.horizonYears}
            step="1"
            value={saleYear}
            onChange={(event) =>
              onUpdateTimeline({
                ...timeline,
                homeSaleYear: Math.max(1, Number(event.target.value)),
              })
            }
          />
        ) : null}
      </div>
    </WorkspaceSection>
  );
}
