import { useMemo, useEffect } from "react";
import { usePlotlyLive } from "./usePlotlyLive";

// --- MEMS settling detection ---
const MEMS_WINDOW_SIZE = 12; // sliding window length (samples)
const MEMS_VARIANCE_THRESHOLD = 0.001; // σ²_max – signal is settled when variance < this

/** Population variance over the last `windowSize` values, or null if not enough data. */
function rollingVariance(values: number[], windowSize: number): number | null {
  if (values.length < 2) return null;
  const win = values.slice(-windowSize);
  const n = win.length;
  const mean = win.reduce((a, b) => a + b, 0) / n;
  return win.reduce((sum, v) => sum + (v - mean) ** 2, 0) / n;
}

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
  const { plotRef, getTraceCount, renderOrUpdate } = usePlotlyLive();

  /** Settling status keyed by MEMS sensorId */
  const memsSettlingStatus = useMemo(() => {
    const result: Record<
      string,
      { variance: number | null; settled: boolean }
    > = {};
    if (!Array.isArray(dataPoints) || dataPoints.length === 0) return result;

    const memsSensorValues = new Map<string, number[]>();
    dataPoints.forEach((point) => {
      if (point.group === "mems") {
        if (!memsSensorValues.has(point.sensorId)) {
          memsSensorValues.set(point.sensorId, []);
        }
        memsSensorValues.get(point.sensorId)!.push(point.y);
      }
    });

    memsSensorValues.forEach((values, sensorId) => {
      const variance = rollingVariance(values, MEMS_WINDOW_SIZE);
      result[sensorId] = {
        variance,
        settled: variance !== null && variance < MEMS_VARIANCE_THRESHOLD,
      };
    });

    return result;
  }, [dataPoints]);

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

    const existingTraceCount = getTraceCount();

    renderOrUpdate({
      traces,
      layout,
      updateData: {
        x: traces.map((trace) => trace.x),
        y: traces.map((trace) => trace.y),
      },
      traceIndices: traces.map((_, index) => index),
      forceReact: existingTraceCount !== traces.length,
    });
  }, [traces, deviceName, plotTitle, getTraceCount, renderOrUpdate, plotRef]);

  const memsEntries = Object.entries(memsSettlingStatus);

  if (traces.length === 0) {
    return (
      <div className="no-data">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="line-plot">
      {memsEntries.length > 0 && (
        <div className="mems-settling-bar">
          {memsEntries.map(([sensorId, { variance, settled }]) => (
            <div
              key={sensorId}
              className={`mems-settling-badge ${
                settled
                  ? "mems-settling-badge--settled"
                  : "mems-settling-badge--unsettled"
              }`}
            >
              <span className="mems-settling-badge__label">{sensorId}</span>
              <span
                className={
                  settled
                    ? "mems-settling-badge__status--settled"
                    : "mems-settling-badge__status--unsettled"
                }
              >
                {settled ? "Settled" : "Unsettled"}
              </span>
              {variance !== null && (
                <span className="mems-settling-badge__variance">
                  (&sigma;&sup2;&nbsp;=&nbsp;{variance.toFixed(4)})
                </span>
              )}
            </div>
          ))}
        </div>
      )}
      <div ref={plotRef} className="line-plot__canvas" />
    </div>
  );
};
