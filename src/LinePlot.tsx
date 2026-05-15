import { useMemo, useEffect, useRef } from "react";
import { usePlotlyLive } from "./usePlotlyLive";

// --- MEMS settling detection ---
const MEMS_WINDOW_SIZE = 12; // sliding window length (samples)
const MEMS_VARIANCE_THRESHOLD = 0.0001; // σ²_max – signal is settled when variance < this

// --- Environmental settling detection ---
const ENV_WINDOW_SIZE = 12;
const ENV_DEFAULT_VARIANCE_THRESHOLD = 0.2;
const ENV_VARIANCE_THRESHOLDS: Record<string, number> = {
  "Temperature (BME680)": 0.05,
  "Humidity (BME680)": 0.2,
  "Pressure (BME680)": 0.5,
  "Altitude (BME680)": 0.5,
  "Gas Resistance": 1000,
};

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

interface SettlingStatus {
  variance: number | null;
  settled: boolean;
}

const PRESSURE_SENSOR_ID = "Pressure (BME680)";

// Stable display order prevents trace index churn (which can look like color/label jumping).
const SENSOR_DISPLAY_ORDER = [
  "Temperature (BME680)",
  "Humidity (BME680)",
  "Pressure (BME680)",
  "Altitude (BME680)",
  "Gas Resistance",
  "CH4 (Methane)",
  "VOC (Volatile Organic Compounds)",
  "NH3 (Ammonia)",
  "NO2 (Nitrogen Dioxide)",
  "HCHO (Formaldehyde)",
  "Odor",
  "EtOH (Ethanol)",
  "H2S (Hydrogen Sulfide)",
  "CO (Carbon Monoxide)",
  "Smoke",
  "H2 (Hydrogen)",
] as const;

const SENSOR_ORDER_INDEX: Record<string, number> = Object.fromEntries(
  SENSOR_DISPLAY_ORDER.map((sensorId, index) => [sensorId, index]),
);

function compareSensorIds(a: string, b: string): number {
  const indexA = SENSOR_ORDER_INDEX[a];
  const indexB = SENSOR_ORDER_INDEX[b];
  const hasA = indexA !== undefined;
  const hasB = indexB !== undefined;

  if (hasA && hasB) return indexA - indexB;
  if (hasA) return -1;
  if (hasB) return 1;
  return a.localeCompare(b);
}

function formatMemsLabel(sensorId: string): string {
  return sensorId.replace(/\s*\([^)]*\)\s*$/, "").trim();
}

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
  const previousTraceSignatureRef = useRef<string | null>(null);

  const settlingStatusByGroup = useMemo(() => {
    const groupValues = new Map<
      "environmental" | "mems",
      Map<string, number[]>
    >([
      ["environmental", new Map<string, number[]>()],
      ["mems", new Map<string, number[]>()],
    ]);

    if (!Array.isArray(dataPoints) || dataPoints.length === 0) {
      return {
        environmental: {} as Record<string, SettlingStatus>,
        mems: {} as Record<string, SettlingStatus>,
      };
    }

    dataPoints.forEach((point) => {
      if (point.group !== "environmental" && point.group !== "mems") return;
      const groupMap = groupValues.get(point.group)!;
      if (!groupMap.has(point.sensorId)) {
        groupMap.set(point.sensorId, []);
      }
      groupMap.get(point.sensorId)!.push(point.y);
    });

    const buildStatus = (
      group: "environmental" | "mems",
      windowSize: number,
      thresholdForSensor: (sensorId: string) => number,
    ): Record<string, SettlingStatus> => {
      const status: Record<string, SettlingStatus> = {};
      groupValues.get(group)!.forEach((values, sensorId) => {
        const variance = rollingVariance(values, windowSize);
        status[sensorId] = {
          variance,
          settled: variance !== null && variance < thresholdForSensor(sensorId),
        };
      });
      return status;
    };

    return {
      environmental: buildStatus(
        "environmental",
        ENV_WINDOW_SIZE,
        (sensorId) =>
          ENV_VARIANCE_THRESHOLDS[sensorId] ?? ENV_DEFAULT_VARIANCE_THRESHOLD,
      ),
      mems: buildStatus(
        "mems",
        MEMS_WINDOW_SIZE,
        () => MEMS_VARIANCE_THRESHOLD,
      ),
    };
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
    const sortedSensorEntries = Array.from(sensorMap.entries()).sort(
      ([sensorA], [sensorB]) => compareSensorIds(sensorA, sensorB),
    );

    return sortedSensorEntries.map(([sensorId, data]) => {
      const isMemsSensor = settlingStatusByGroup.mems[sensorId] !== undefined;
      return {
        x: data.x,
        y: data.y,
        type: "scatter" as const,
        mode: "lines+markers" as const,
        name: isMemsSensor ? formatMemsLabel(sensorId) : sensorId,
        yaxis: sensorId === PRESSURE_SENSOR_ID ? "y2" : "y",
        line: {
          color: SENSOR_COLORS[sensorId] || "rgb(100, 100, 100)",
          width: 2,
        },
        marker: {
          size: 4,
          opacity: 0.7,
        },
      };
    });
  }, [dataPoints, settlingStatusByGroup.mems]);

  useEffect(() => {
    if (!plotRef.current || traces.length === 0) {
      return;
    }

    const hasPressureTrace = traces.some(
      (trace) => trace.name === PRESSURE_SENSOR_ID,
    );

    const isMemsOnlyPlot =
      dataPoints.length > 0 &&
      dataPoints.every((point) => point.group === "mems");
    const unsettledMemsSensorIds = new Set(
      Object.entries(settlingStatusByGroup.mems)
        .filter(([, { settled }]) => !settled)
        .map(([sensorId]) => formatMemsLabel(sensorId)),
    );
    const showMemsFilterButtons = isMemsOnlyPlot && traces.length > 0;
    const allVisible = traces.map(() => true);
    const unsettledVisible = traces.map((trace) =>
      unsettledMemsSensorIds.has(String(trace.name)),
    );

    const layout = {
      title:
        plotTitle || `Real-time Sensor Data from ${deviceName || "Device"}`,
      // Preserve user interactions (including plotly button choice) while live-updating.
      uirevision: `line-plot-${plotTitle || "default"}`,
      xaxis: {
        title: "Data Points",
      },
      yaxis: {
        title: hasPressureTrace ? "Sensor Value" : "Voltage (V)",
      },
      hovermode: "closest" as const,
      margin: { l: 60, r: hasPressureTrace ? 80 : 50, t: 50, b: 95 },
      legend: {
        orientation: "h" as const,
        x: 0.5,
        y: -0.2,
        xanchor: "center" as const,
        yanchor: "top" as const,
      },
      ...(showMemsFilterButtons
        ? {
            updatemenus: [
              {
                type: "buttons" as const,
                direction: "right" as const,
                x: 0,
                y: 1.2,
                xanchor: "left" as const,
                yanchor: "top" as const,
                showactive: true,
                buttons: [
                  {
                    label: "All MEMS",
                    method: "restyle" as const,
                    args: [{ visible: allVisible }],
                  },
                  {
                    label: "Unsettled MEMS",
                    method: "restyle" as const,
                    args: [{ visible: unsettledVisible }],
                  },
                ],
              },
            ],
          }
        : {}),
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
    const traceSignature = traces.map((trace) => trace.name).join("|");
    const forceReactUpdate =
      existingTraceCount !== traces.length ||
      previousTraceSignatureRef.current !== traceSignature;

    renderOrUpdate({
      traces,
      layout,
      updateData: {
        x: traces.map((trace) => trace.x),
        y: traces.map((trace) => trace.y),
      },
      traceIndices: traces.map((_, index) => index),
      forceReact: forceReactUpdate,
    });

    previousTraceSignatureRef.current = traceSignature;
  }, [
    traces,
    dataPoints,
    settlingStatusByGroup.mems,
    deviceName,
    plotTitle,
    getTraceCount,
    renderOrUpdate,
    plotRef,
  ]);

  const environmentalEntries = Object.entries(
    settlingStatusByGroup.environmental,
  ).sort(([sensorA], [sensorB]) => compareSensorIds(sensorA, sensorB));

  const memsEntries = Object.entries(settlingStatusByGroup.mems).sort(
    ([sensorA], [sensorB]) => compareSensorIds(sensorA, sensorB),
  );

  if (traces.length === 0) {
    return (
      <div className="no-data">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="line-plot">
      {environmentalEntries.length > 0 && (
        <div className="mems-settling-bar">
          {environmentalEntries.map(([sensorId, { variance, settled }]) => (
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
              <span className="mems-settling-badge__label">
                {formatMemsLabel(sensorId)}
              </span>
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
