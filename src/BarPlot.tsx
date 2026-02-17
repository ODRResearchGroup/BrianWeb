import { useMemo, useEffect, useRef } from "react";
import Plotly from "plotly.js-dist-min";

interface DataPoint {
  x: number;
  y: number;
  sensorId: string;
}

interface BarPlotProps {
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

export const BarPlot = ({
  dataPoints,
  deviceName = "BLE Device",
}: BarPlotProps) => {
  const plotRef = useRef<HTMLDivElement>(null);

  const { labels, values, colors } = useMemo(() => {
    if (!Array.isArray(dataPoints) || dataPoints.length === 0) {
      return { labels: [], values: [] as number[], colors: [] as string[] };
    }

    const latestBySensor = new Map<string, number>();
    dataPoints.forEach((point) => {
      latestBySensor.set(point.sensorId, point.y);
    });

    const sensorLabels = Array.from(latestBySensor.keys());
    const sensorValues = sensorLabels.map(
      (label) => latestBySensor.get(label) ?? 0,
    );
    const sensorColors = sensorLabels.map(
      (label) => SENSOR_COLORS[label] || "rgb(100, 100, 100)",
    );

    return { labels: sensorLabels, values: sensorValues, colors: sensorColors };
  }, [dataPoints]);

  useEffect(() => {
    if (!plotRef.current || labels.length === 0) {
      return;
    }

    const trace = {
      x: labels,
      y: values,
      type: "bar" as const,
      marker: { color: colors },
      name: deviceName || "Sensors",
    };

    const layout = {
      title: `Latest Sensor Values - ${deviceName || "Device"}`,
      xaxis: {
        title: "Sensor",
      },
      yaxis: {
        title: "Voltage (V)",
      },
      hovermode: "closest" as const,
      margin: { l: 60, r: 50, t: 50, b: 80 },
    };

    Plotly.newPlot(plotRef.current, [trace], layout, { responsive: true });
  }, [labels, values, colors, deviceName]);

  if (labels.length === 0) {
    return (
      <div style={{ width: "100%", height: "500px", color: "#999" }}>
        <p>No data to display</p>
      </div>
    );
  }

  return <div ref={plotRef} style={{ width: "100%", height: "500px" }} />;
};
