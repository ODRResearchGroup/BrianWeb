import "./App.css";
import { useState } from "react";
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
    requestDevice,
    disconnect,
    downloadCSV,
  } = useBLE();
  const [activeTab, setActiveTab] = useState<"radar" | "line" | "bar">("radar");

  const environmentalData = dataPoints.filter(
    (point) => point.group === "environmental",
  );
  const memsData = dataPoints.filter((point) => point.group === "mems");

  const environmentalCharacteristics =
    device?.characteristics.filter((characteristic) => characteristic.group === "environmental") || [];
  const memsCharacteristics =
    device?.characteristics.filter((characteristic) => characteristic.group === "mems") || [];

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
        <header className="app-header">
          <h1>BLE Device Data Plotter</h1>
          <p>
            Connect to a Bluetooth Low Energy device and visualize real-time
            data
          </p>
        </header>

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

            <div className="button-group">
              <button
                onClick={requestDevice}
                disabled={isConnected}
                className="btn btn-connect"
              >
                {isConnected ? "Connected" : "Connect to BLE Device"}
              </button>

              <button
                onClick={disconnect}
                disabled={!isConnected}
                className="btn btn-disconnect"
              >
                Disconnect
              </button>

              <button
                onClick={downloadCSV}
                disabled={allDataPoints.length === 0}
                className="btn btn-download"
              >
                Download CSV
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
                <strong>Environmental Points:</strong> {environmentalData.length}
              </p>
              <p>
                <strong>MEMS Points:</strong> {memsData.length}
              </p>

              {environmentalCharacteristics.length > 0 && (
                <div className="characteristics-list">
                  <h3>BME680 Environmental</h3>
                  {environmentalCharacteristics.map((char) => (
                    <div key={char.uuid} className="characteristic-item">
                      <span className="char-name">{char.name}</span>
                      <span className="char-value">
                        {char.value !== null ? char.value.toFixed(4) : "N/A"}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {memsCharacteristics.length > 0 && (
                <div className="characteristics-list">
                  <h3>MEMS Gas Sensors</h3>
                  {memsCharacteristics.map((char) => (
                    <div key={char.uuid} className="characteristic-item">
                      <span className="char-name">{char.name}</span>
                      <span className="char-value">
                        {char.value !== null ? char.value.toFixed(4) : "N/A"}
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
