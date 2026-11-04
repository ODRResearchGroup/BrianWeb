import "./App.css";
import { useMemo, useState } from "react";
import { useBLE } from "./useBLE";
import { LinePlot } from "./LinePlot";
import { BarPlot } from "./BarPlot";
import { RadarPlot } from "./RadarPlot";
import { ErrorBoundary } from "./ErrorBoundary";

function App() {
  const {
    device,
    isConnected,
    error,
    dataPoints,
    allDataPoints,
    boardStatus,
    requestDevice,
    disconnect,
    downloadCSV,
  } = useBLE();
  const [activeTab, setActiveTab] = useState<"radar" | "line" | "bar">("radar");

  const excludedEnvironmentalSensors = new Set([
    "Altitude (BME680)",
    "Gas Resistance",
  ]);

  const environmentalData = dataPoints.filter(
    (point) =>
      point.group === "environmental" &&
      !excludedEnvironmentalSensors.has(point.sensorId),
  );
  const memsData = dataPoints.filter((point) => point.group === "mems");

  const latestSensorsByGroup = useMemo(() => {
    const sensors = new Map<string, { name: string; value: number }>();
    dataPoints.forEach((point) => {
      sensors.set(`${point.group}:${point.sensorId}`, {
        name: point.sensorId,
        value: point.y,
      });
    });
    return {
      environmental: Array.from(sensors.entries())
        .filter(([key]) => key.startsWith("environmental:"))
        .map(([, sensor]) => sensor),
      mems: Array.from(sensors.entries())
        .filter(([key]) => key.startsWith("mems:"))
        .map(([, sensor]) => sensor),
    };
  }, [dataPoints]);

  const renderPlot = (
    points: typeof dataPoints,
    plotTitle: string,
    emptyMessage: string,
  ) => {
    if (activeTab === "line") {
      return (
        <LinePlot
          dataPoints={points}
          deviceName={device?.name}
          plotTitle={plotTitle}
          emptyMessage={emptyMessage}
        />
      );
    }

    if (activeTab === "bar") {
      return (
        <BarPlot
          dataPoints={points}
          deviceName={device?.name}
          plotTitle={plotTitle}
          emptyMessage={emptyMessage}
        />
      );
    }

    return (
      <RadarPlot
        dataPoints={points}
        deviceName={device?.name}
        plotTitle={plotTitle}
        emptyMessage={emptyMessage}
      />
    );
  };

  return (
    <ErrorBoundary>
      <div className="app">
        <div className="app-content">
          <div className="control-panel">
            <h2>Connection Control</h2>

            <div className="connection-status">
              <div
                className="status-indicator"
                style={{
                  backgroundColor: isConnected ? "#4caf50" : "#f44336",
                }}
              ></div>
              <span>
                {isConnected ? `Connected to ${device?.name}` : "Not connected"}
              </span>
            </div>

            {error && (
              <div className="error-message">
                <strong>Error:</strong> {error}
              </div>
            )}

            {boardStatus && (
              <div className="characteristics-list">
                <h3>Hardware Status</h3>
                {boardStatus.map((board) => (
                  <div key={board.bit} className="characteristic-item">
                    <span className="char-name">{board.label}</span>
                    <span
                      className="char-value"
                      style={{ color: board.present ? "#4caf50" : "#f44336" }}
                    >
                      {board.present ? "Detected" : "Missing"}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="button-group">
              <button
                onClick={isConnected ? disconnect : requestDevice}
                className={`btn ${isConnected ? "btn-disconnect" : "btn-connect"}`}
              >
                {isConnected ? "Disconnect" : "Connect to BLE Device"}
              </button>
            </div>

            <div className="data-info">
              <p>
                <strong>Total Data Points:</strong> {allDataPoints.length}
              </p>
              <p>
                <strong>Plot Buffer:</strong> {dataPoints?.length || 0}
              </p>
              <p>
                <strong>Environmental Points:</strong>{" "}
                {environmentalData.length}
              </p>
              <p>
                <strong>MEMS Points:</strong> {memsData.length}
              </p>

              {latestSensorsByGroup.environmental.length > 0 && (
                <div className="characteristics-list">
                  <h3>BME680 Environmental</h3>
                  {latestSensorsByGroup.environmental.map((sensor) => (
                    <div key={sensor.name} className="characteristic-item">
                      <span className="char-name">{sensor.name}</span>
                      <span className="char-value">
                        {sensor.value.toFixed(4)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {latestSensorsByGroup.mems.length > 0 && (
                <div className="characteristics-list">
                  <h3>MEMS Gas Sensors</h3>
                  {latestSensorsByGroup.mems.map((sensor) => (
                    <div key={sensor.name} className="characteristic-item">
                      <span className="char-name">{sensor.name}</span>
                      <span className="char-value">
                        {sensor.value.toFixed(4)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="plot-container">
            <div className="plot-tabs">
              <button
                className={`tab-button ${activeTab === "radar" ? "active" : ""}`}
                onClick={() => setActiveTab("radar")}
              >
                Radar Plot
              </button>
              <button
                className={`tab-button ${activeTab === "line" ? "active" : ""}`}
                onClick={() => setActiveTab("line")}
              >
                Line Graphs
              </button>
              <button
                className={`tab-button ${activeTab === "bar" ? "active" : ""}`}
                onClick={() => setActiveTab("bar")}
              >
                Bar Graphs
              </button>
              <button
                onClick={downloadCSV}
                disabled={allDataPoints.length === 0}
                className="btn btn-download"
              >
                Download CSV
              </button>
            </div>

            <div className="plot-content">
              {isConnected ? (
                <div className="plot-sections">
                  <section className="plot-section">
                    <h3>BME680 Environmental Data</h3>
                    {renderPlot(
                      environmentalData,
                      `BME680 Environmental Data - ${device?.name || "Device"}`,
                      "No BME680 environmental data received yet",
                    )}
                  </section>

                  <section className="plot-section">
                    <h3>MEMS Gas Sensor Data</h3>
                    {renderPlot(
                      memsData,
                      `MEMS Gas Sensor Data - ${device?.name || "Device"}`,
                      "No MEMS gas sensor data received yet",
                    )}
                  </section>
                </div>
              ) : (
                <div className="no-data">
                  <p>Connect to a BLE device to start viewing data</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default App;
