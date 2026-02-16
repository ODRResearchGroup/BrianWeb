import { useMemo, useEffect, useRef } from "react";
import Plotly from "plotly.js-dist-min";

interface DataPoint {
  x: number;
  y: number;
  sensorId: string;
}

interface DataPlotProps {
  dataPoints: Array<DataPoint>;
  deviceName?: string;
}

const SENSOR_COLORS: Record<string, string> = {
  "CH4 (Methane)": "rgb(31, 119, 180)",
  "VOC (Volatile Organic Compounds)": "rgb(255, 127, 14)",
  "NH3 (Ammonia)": "rgb(44, 160, 44)",
  "NO2 (Nitrogen Dioxide)": "rgb(214, 39, 40)",
  "HCHO (Formaldehyde)": "rgb(148, 103, 189)",
  Odor: "rgb(140, 86, 75)",
  "EtOH (Ethanol)": "rgb(227, 119, 194)",
  "H2S (Hydrogen Sulfide)": "rgb(127, 127, 127)",
};

export const DataPlot = ({
  dataPoints,
  deviceName = "BLE Device",
}: DataPlotProps) => {
  const plotRef = useRef<HTMLDivElement>(null);

  const traces = useMemo(() => {
    if (!Array.isArray(dataPoints) || dataPoints.length === 0) {
      return [];
    }

    // Group data points by sensor
    const sensorMap = new Map<string, { x: number[]; y: number[] }>();

    dataPoints.forEach((point) => {
      if (!sensorMap.has(point.sensorId)) {
        sensorMap.set(point.sensorId, { x: [], y: [] });
      }
      const data = sensorMap.get(point.sensorId)!;
      data.x.push(point.x);
      data.y.push(point.y);
    });

    // Create traces for each sensor
    return Array.from(sensorMap.entries()).map(([sensorId, data]) => ({
      x: data.x,
      y: data.y,
      type: "scatter" as const,
      mode: "lines+markers" as const,
      name: sensorId,
      line: {
        color: SENSOR_COLORS[sensorId] || "rgb(100, 100, 100)",
        width: 2,
      },
      marker: {
        size: 4,
        opacity: 0.7,
      },
    }));
  }, [dataPoints]);

  useEffect(() => {
    if (!plotRef.current || traces.length === 0) {
      return;
    }

    const layout = {
      title: `Real-time Gas Sensor Data from ${deviceName || "Device"}`,
      xaxis: {
        title: "Data Points",
      },
      yaxis: {
        title: "Voltage (V)",
      },
      hovermode: "closest" as const,
      margin: { l: 60, r: 50, t: 50, b: 50 },
      legend: {
        x: 1.02,
        y: 1,
        xanchor: "left" as const,
        yanchor: "top" as const,
      },
    };

    Plotly.newPlot(plotRef.current, traces, layout, { responsive: true });
  }, [traces, deviceName]);

  if (traces.length === 0) {
    return (
      <div style={{ width: "100%", height: "500px", color: "#999" }}>
        <p>No data to display</p>
      </div>
    );
  }

  return <div ref={plotRef} style={{ width: "100%", height: "500px" }} />;
};
