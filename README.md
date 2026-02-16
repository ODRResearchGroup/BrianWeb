# BLE Gas Sensor Data Plotter

A React web application that connects to an ESP32 BLE gas sensor device and visualizes real-time multi-sensor data using interactive Plotly charts.

## Features

- **Multi-Sensor Support**: Simultaneously reads data from 8 different gas sensors via BLE
- **Real-time Visualization**: Interactive Plotly charts with individual traces for each sensor
- **Web Bluetooth API**: Direct browser connection to BLE devices (no app needed)
- **Live Sensor Readout**: Display current values for all connected sensors
- **Type-Safe**: Built with TypeScript
- **Responsive Design**: Works on desktop and mobile
- **Fast Development**: Uses Vite for rapid iteration

## Supported Sensors

Reads from the following Environmental Sensing Service (ESS) characteristics:

| Sensor | UUID   | Reading                    |
| ------ | ------ | -------------------------- |
| CH4    | 0x2BD1 | Methane concentration      |
| VOC    | 0x2BD3 | Volatile Organic Compounds |
| NH3    | 0x2BDB | Ammonia concentration      |
| NO2    | 0x2BDC | Nitrogen Dioxide           |
| HCHO   | 0x2BDF | Formaldehyde concentration |
| Odor   | 0x2BE3 | Odor level                 |
| EtOH   | 0x2BE4 | Ethanol concentration      |
| H2S    | 0x2BE5 | Hydrogen Sulfide           |

All values are transmitted as IEEE 754 32-bit floats (4 bytes).

## Hardware Compatibility

- **Supported Device**: Arduino ESP32 with BLE peripheral firmware
- **Reference Implementation**: [ArduinoESP32BLEPeripheral](https://github.com/ODRResearchGroup/ArduinoESP32BLEPeripheral)
- **Service UUID**: `0x181A` (Environmental Sensing Service)
- **Custom Service UUID**: `de664a17-7db4-449f-97ba-5514e19a9d94`

## Prerequisites

- Node.js 18+
- Modern browser with Web Bluetooth API support:
  - Chrome/Chromium 90+
  - Edge 90+
  - Opera 76+
  - Firefox (with experimental flag)
  - Safari (not supported)
- BLE gas sensor device powered on and in advertising mode

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Starts dev server at `http://localhost:5173` with hot module replacement.

### Build for Production

```bash
npm run build
```

Creates optimized build in `dist/` folder.

### Preview Build

```bash
npm run preview
```

## Usage

1. **Power on your BLE device** - Ensure the ESP32 gas sensor is advertising
2. **Click "Connect to BLE Device"** - Browser will show device selection dialog
3. **Select your device** - Choose from available BLE devices
4. **View Real-time Data** - Charts update as sensor data arrives
5. **Monitor Sensor Values** - Left panel displays current readings for all sensors
6. **Disconnect** - Click disconnect button to close the connection

## Architecture

### Components

- **App.tsx**: Main UI with connection controls and sensor value display
- **DataPlot.tsx**: Multi-trace Plotly visualization with per-sensor colors
- **useBLE.ts**: Custom React hook managing BLE connection and data parsing
- **ErrorBoundary.tsx**: Error handling with user-friendly messages

### Data Flow

```
BLE Device
    ↓
useBLE Hook (notification listeners)
    ↓
State Updates (characteristics, data points)
    ↓
App Component (displays values)
    ↓
DataPlot Component (visualizes trends)
```

## Configuration

### Modify Characteristics

To add/remove sensors, edit [src/useBLE.ts](src/useBLE.ts):

```typescript
const ESS_CHARACTERISTICS = [
  { uuid: 0x2bd1, name: "CH4 (Methane)" },
  // Add more characteristics as needed
];
```

### Adjust Data Buffer Size

In [src/useBLE.ts](src/useBLE.ts), change the data point limit:

```typescript
return newPoints.slice(-500); // Keep last 500 points
```

### Customize Colors

In [src/DataPlot.tsx](src/DataPlot.tsx), update the color map:

```typescript
const SENSOR_COLORS: Record<string, string> = {
  "CH4 (Methane)": "rgb(31, 119, 180)",
  // Customize colors
};
```

## Troubleshooting

### "Bluetooth is not supported"

- Check browser compatibility at [caniuse.com/web-bluetooth](https://caniuse.com/web-bluetooth)
- Use Chrome, Edge, or Opera on Linux/macOS/Windows

### "Device not found"

- Ensure BLE device is powered on
- Device should be in advertising mode
- Move device closer to browser (reduce interference)

### "Connection failed"

- Check that your ESP32 firmware is programmed correctly
- Verify ESS service UUID (0x181A) is being advertised
- Check device logs for connection errors

### "No data received"

- Confirm device is sending BLE notifications
- Check that characteristics are readable/notifiable
- Monitor browser console for errors

### "Plot not updating"

- Verify device is still connected (check status indicator)
- Check that sensor is producing data
- Reload page if issues persist

## Technologies

- **React 19**: UI library with hooks
- **TypeScript**: Type-safe development
- **Vite**: Modern build tool
- **Plotly.js**: Interactive charting
- **Web Bluetooth API**: BLE connectivity

## Browser Requirements for Production

**Important**: Web Bluetooth requires **HTTPS** in production environments. For local development, `localhost` is exempt from this requirement.

## License

MIT

## References

- [Web Bluetooth API Specification](https://webbluetoothcg.github.io/web-bluetooth/)
- [Bluetooth ESS Service](https://www.bluetooth.com/specifications/specs/environmental-sensing-service/)
- [Plotly.js Documentation](https://plotly.com/javascript/)
- [React Documentation](https://react.dev/)
