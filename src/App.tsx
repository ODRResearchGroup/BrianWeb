import "./App.css";
import { useState } from "react";
import { useBLE } from "./useBLE";
import { LinePlot } from "./LinePlot";
import { BarPlot } from "./BarPlot";
import { RadarPlot } from "./RadarPlot";
import { ErrorBoundary } from "./ErrorBoundary";

function App() {
  const { device, isConnected, error, dataPoints, requestDevice, disconnect } =
    useBLE();
  const [activeTab, setActiveTab] = useState<"radar" | "line" | "bar">("radar");

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
            </div>

            <div className="data-info">
              <p>
                <strong>Data Points Received:</strong> {dataPoints?.length || 0}
              </p>

              {device &&
                device.characteristics &&
                device.characteristics.length > 0 && (
                  <div className="characteristics-list">
                    <h3>Sensor Values</h3>
                    {device.characteristics.map((char) => (
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
              {isConnected && dataPoints && dataPoints.length > 0 ? (
                activeTab === "line" ? (
                  <LinePlot dataPoints={dataPoints} deviceName={device?.name} />
                ) : activeTab === "bar" ? (
                  <BarPlot dataPoints={dataPoints} deviceName={device?.name} />
                ) : (
                  <RadarPlot
                    dataPoints={dataPoints}
                    deviceName={device?.name}
                  />
                )
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
