import "./App.css";
import { useBLE } from "./useBLE";
import { DataPlot } from "./DataPlot";
import { ErrorBoundary } from "./ErrorBoundary";

function App() {
  const { device, isConnected, error, dataPoints, requestDevice, disconnect } =
    useBLE();

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
              {dataPoints && dataPoints.length > 0 && (
                <p>
                  <strong>Latest Value:</strong>{" "}
                  {dataPoints[dataPoints.length - 1]?.y || "N/A"}
                </p>
              )}
            </div>
          </div>

          <div className="plot-container">
            {isConnected && dataPoints && dataPoints.length > 0 ? (
              <DataPlot dataPoints={dataPoints} deviceName={device?.name} />
            ) : (
              <div className="no-data">
                <p>Connect to a BLE device to start viewing data</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default App;
