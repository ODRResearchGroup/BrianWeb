import { useMemo, useEffect, useRef } from "react";
import Plotly from "plotly.js-dist-min";

interface DataPlotProps {
  dataPoints: Array<{ x: number; y: number }>;
  deviceName?: string;
}

export const DataPlot = ({
  dataPoints,
  deviceName = "BLE Device",
}: DataPlotProps) => {
  const plotRef = useRef<HTMLDivElement>(null);

  const { xData, yData } = useMemo(() => {
    if (!Array.isArray(dataPoints) || dataPoints.length === 0) {
      return { xData: [], yData: [] };
    }
    return {
      xData: dataPoints.map((p) => p?.x ?? 0),
      yData: dataPoints.map((p) => p?.y ?? 0),
    };
  }, [dataPoints]);

  useEffect(() => {
    if (!plotRef.current || xData.length === 0) {
      return;
    }

    const trace = {
      x: xData,
      y: yData,
      type: "scatter" as const,
      mode: "lines+markers" as const,
      name: deviceName || "Data",
      line: {
        color: "rgb(31, 119, 180)",
        width: 2,
      },
      marker: {
        size: 4,
        opacity: 0.7,
      },
    };

    const layout = {
      title: `Real-time Data from ${deviceName || "Device"}`,
      xaxis: {
        title: "Data Points",
      },
      yaxis: {
        title: "Value",
      },
      hovermode: "closest" as const,
      margin: { l: 50, r: 50, t: 50, b: 50 },
    };

    Plotly.newPlot(plotRef.current, [trace], layout, { responsive: true });
  }, [xData, yData, deviceName]);

  if (!Array.isArray(dataPoints) || dataPoints.length === 0) {
    return (
      <div style={{ width: "100%", height: "500px", color: "#999" }}>
        <p>No data to display</p>
      </div>
    );
  }

  return <div ref={plotRef} style={{ width: "100%", height: "500px" }} />;
};
