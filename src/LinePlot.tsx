import { useMemo, useEffect, useRef } from "react";
import Plotly from "plotly.js-dist-min";

interface DataPoint {
  x: number;
  y: number;
  sensorId: string;
  group?: "environmental" | "mems";
}

interface LinePlotProps {
  dataPoints: Array<DataPoint>;
  deviceName?: string;
  plotTitle?: string;
  emptyMessage?: string;
}

const PRESSURE_SENSOR_ID = "Pressure (BME680)";

const SENSOR_COLORS: Record<string, string> = {
  "Temperature (BME680)": "rgb(255, 99, 132)",
  "Humidity (BME680)": "rgb(54, 162, 235)",
  "Pressure (BME680)": "rgb(255, 206, 86)",
  "CH4 (Methane)": "rgb(31, 119, 180)",
  "VOC (Volatile Organic Compounds)": "rgb(255, 127, 14)",
  "NH3 (Ammonia)": "rgb(44, 160, 44)",
  "NO2 (Nitrogen Dioxide)": "rgb(214, 39, 40)",
  "HCHO (Formaldehyde)": "rgb(148, 103, 189)",
  Odor: "rgb(140, 86, 75)",
  "EtOH (Ethanol)": "rgb(227, 119, 194)",
  "H2S (Hydrogen Sulfide)": "rgb(127, 127, 127)",
};

export const LinePlot = ({
  dataPoints,
  deviceName = "BLE Device",
  plotTitle,
  emptyMessage = "No data to display",
}: LinePlotProps) => {
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

    // Create traces for each sensor.
    // Pressure is routed to a secondary y-axis to improve readability.
    return Array.from(sensorMap.entries()).map(([sensorId, data]) => ({
      x: data.x,
      y: data.y,
      type: "scatter" as const,
      mode: "lines+markers" as const,
      name: sensorId,
      yaxis: sensorId === PRESSURE_SENSOR_ID ? "y2" : "y",
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

    const hasPressureTrace = traces.some(
      (trace) => trace.name === PRESSURE_SENSOR_ID,
    );

    const layout = {
      title:
        plotTitle || `Real-time Sensor Data from ${deviceName || "Device"}`,
      xaxis: {
        title: "Data Points",
      },
      yaxis: {
        title: hasPressureTrace ? "Sensor Value" : "Voltage (V)",
      },
      hovermode: "closest" as const,
      margin: { l: 60, r: hasPressureTrace ? 80 : 50, t: 50, b: 50 },
      legend: {
        x: 1.02,
        y: 1,
        xanchor: "left" as const,
        yanchor: "top" as const,
      },
      ...(hasPressureTrace
        ? {
            yaxis2: {
              title: "Pressure (hPa)",
              overlaying: "y" as const,
              side: "right" as const,
              anchor: "x" as const,
            },
          }
        : {}),
    };

    Plotly.newPlot(plotRef.current, traces, layout, { responsive: true });
  }, [traces, deviceName, plotTitle]);

  if (traces.length === 0) {
    return (
      <div style={{ width: "100%", height: "500px", color: "#999" }}>
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return <div ref={plotRef} style={{ width: "100%", height: "500px" }} />;
};
