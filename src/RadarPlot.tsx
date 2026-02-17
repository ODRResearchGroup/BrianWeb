import { useMemo, useEffect, useRef } from "react";
import Plotly from "plotly.js-dist-min";

interface DataPoint {
  x: number;
  y: number;
  sensorId: string;
}

interface RadarPlotProps {
  dataPoints: Array<DataPoint>;
  deviceName?: string;
}

export const RadarPlot = ({
  dataPoints,
  deviceName = "BLE Device",
}: RadarPlotProps) => {
  const plotRef = useRef<HTMLDivElement>(null);

  const { labels, values } = useMemo(() => {
    if (!Array.isArray(dataPoints) || dataPoints.length === 0) {
      return { labels: [], values: [] as number[] };
    }

    const latestBySensor = new Map<string, number>();
    dataPoints.forEach((point) => {
      latestBySensor.set(point.sensorId, point.y);
    });

    const sensorLabels = Array.from(latestBySensor.keys());
    const sensorValues = sensorLabels.map(
      (label) => latestBySensor.get(label) ?? 0,
    );

    return { labels: sensorLabels, values: sensorValues };
  }, [dataPoints]);

  useEffect(() => {
    if (!plotRef.current || labels.length === 0) {
      return;
    }

    const trace = {
      type: "scatterpolar" as const,
      r: values,
      theta: labels,
      fill: "toself" as const,
      name: deviceName || "Sensors",
      line: { color: "rgb(31, 119, 180)" },
    };

    const layout = {
      title: `Radar View - ${deviceName || "Device"}`,
      polar: {
        radialaxis: {
          visible: true,
          tickformat: ".2f",
        },
      },
      margin: { l: 50, r: 50, t: 50, b: 50 },
      showlegend: false,
    };

    Plotly.newPlot(plotRef.current, [trace], layout, { responsive: true });
  }, [labels, values, deviceName]);

  if (labels.length === 0) {
    return (
      <div style={{ width: "100%", height: "500px", color: "#999" }}>
        <p>No data to display</p>
      </div>
    );
  }

  return <div ref={plotRef} style={{ width: "100%", height: "500px" }} />;
};
