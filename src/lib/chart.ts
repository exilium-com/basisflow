export type ChartPoint = {
  x: number;
  y: number;
};

export function getChartFrame() {
  const width = 720;
  const height = 320;
  const margin = { top: 24, right: 24, bottom: 58, left: 88 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  return {
    width,
    height,
    margin,
    innerWidth,
    innerHeight,
    plotLeft: margin.left,
    plotTop: margin.top,
    plotRight: margin.left + innerWidth,
    plotBottom: margin.top + innerHeight,
  };
}

export function buildLinePath(points: ChartPoint[]) {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");
}

export function buildAreaPath(points: ChartPoint[], baselineY: number) {
  if (!points.length) {
    return "";
  }

  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];

  return `${buildLinePath(points)} L ${lastPoint.x.toFixed(2)} ${baselineY.toFixed(2)} L ${firstPoint.x.toFixed(2)} ${baselineY.toFixed(2)} Z`;
}
