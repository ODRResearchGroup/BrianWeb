import { useState, useCallback } from 'react';

interface BLEDevice {
  id: string;
  name: string;
  characteristic?: BluetoothRemoteGATTCharacteristic;
}

export const useBLE = () => {
  const [device, setDevice] = useState<BLEDevice | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataPoints, setDataPoints] = useState<Array<{ x: number; y: number }>>([]);

  const requestDevice = useCallback(async () => {
    try {
      setError(null);
      const bluetoothDevice = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['generic_access', 'generic_attribute', 'environmental_sensing']
      });

      const server = await bluetoothDevice.gatt?.connect();
      if (!server) throw new Error('Failed to connect to GATT server');

      // Try to get a characteristic for reading data
      let characteristic: BluetoothRemoteGATTCharacteristic | undefined;
      
      try {
        const service = await server.getPrimaryService('environmental_sensing');
        characteristic = await service.getCharacteristic('methane_concentration');
      } catch {
        // If heart_rate service not available, try generic approach
        try {
          const services = await server.getPrimaryServices();
          if (services.length > 0) {
            const chars = await services[0].getCharacteristics();
            characteristic = chars[0];
          }
        } catch (e) {
          console.warn('Could not retrieve characteristics:', e);
        }
      }

      setDevice({
        id: bluetoothDevice.id,
        name: bluetoothDevice.name || 'Unknown Device',
        characteristic
      });
      setIsConnected(true);

      // Start listening for data if characteristic available
      if (characteristic) {
        startListening(characteristic);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to connect to BLE device';
      setError(errorMsg);
      setIsConnected(false);
    }
  }, []);

  const startListening = useCallback((characteristic: BluetoothRemoteGATTCharacteristic) => {
    characteristic.addEventListener('characteristicvaluechanged', (event: Event) => {
      const value = (event.target as BluetoothRemoteGATTCharacteristic).value;
      if (value) {
        const dataValue = parseData(value);
        setDataPoints((prev) => {
          const newPoints = [...prev, { x: prev.length, y: dataValue }];
          // Keep only last 100 points for performance
          return newPoints.slice(-100);
        });
      }
    });

    characteristic.startNotifications();
  }, []);

  const parseData = (value: DataView): number => {
    // Example: parse first byte as data
    // Adjust this based on your BLE device's data format
    if (value.byteLength > 0) {
      return value.getUint8(0);
    }
    return 0;
  };

  const disconnect = useCallback(async () => {
    if (device?.id) {
      try {
        // Note: Web Bluetooth doesn't have explicit disconnect
        // The connection closes when the page unloads or user navigates away
        setIsConnected(false);
        setDevice(null);
        setDataPoints([]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to disconnect');
      }
    }
  }, [device?.id]);

  return {
    device,
    isConnected,
    error,
    dataPoints,
    requestDevice,
    disconnect,
    setDataPoints
  };
};
