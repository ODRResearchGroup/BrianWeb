import { useState, useCallback } from 'react';

interface BLECharacteristicData {
  uuid: string;
  name: string;
  characteristic?: BluetoothRemoteGATTCharacteristic;
  value: number | null;
}

interface BLEDevice {
  id: string;
  name: string;
  characteristics: BLECharacteristicData[];
}

// ESS Service UUID
const ESS_SERVICE_UUID = 0x181a;

// Custom Service UUID
const CUSTOM_SERVICE_UUID = 'de664a17-7db4-449f-97ba-5514e19a9d94';

// ESS Characteristics
const ESS_CHARACTERISTICS = [
  { uuid: 0x2bd1, name: 'CH4 (Methane)' },
  { uuid: 0x2bd3, name: 'VOC (Volatile Organic Compounds)' },
  { uuid: 0x2bcf, name: 'NH3 (Ammonia)' },
  { uuid: 0x2bd2, name: 'NO2 (Nitrogen Dioxide)' },
  { uuid: 0x2bdf, name: 'HCHO (Formaldehyde)' },
  { uuid: 0x2be3, name: 'Odor' },
  { uuid: 0x2be4, name: 'EtOH (Ethanol)' },
  { uuid: 0x2be5, name: 'H2S (Hydrogen Sulfide)' },
];

export const useBLE = () => {
  const [device, setDevice] = useState<BLEDevice | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataPoints, setDataPoints] = useState<Array<{ x: number; y: number; sensorId: string }>>([]);

  const requestDevice = useCallback(async () => {
    try {
      setError(null);
      const bluetoothDevice = await (navigator as any).bluetooth.requestDevice({
        filters: [
          { services: [ESS_SERVICE_UUID] },
          { services: [CUSTOM_SERVICE_UUID] }
        ],
        optionalServices: ['generic_access', 'generic_attribute']
      });

      const server = await bluetoothDevice.gatt?.connect();
      if (!server) throw new Error('Failed to connect to GATT server');

      // Fetch ESS service and characteristics
      const characteristics: BLECharacteristicData[] = [];
      
      try {
        const essService = await server.getPrimaryService(ESS_SERVICE_UUID);
        
        for (const charConfig of ESS_CHARACTERISTICS) {
          try {
            const characteristic = await essService.getCharacteristic(charConfig.uuid);
            characteristics.push({
              uuid: `0x${charConfig.uuid.toString(16)}`,
              name: charConfig.name,
              characteristic,
              value: null
            });
            
            // Start listening for notifications
            if (characteristic.properties.notify) {
              characteristic.addEventListener('characteristicvaluechanged', (event: Event) => {
                const value = (event.target as BluetoothRemoteGATTCharacteristic).value;
                if (value) {
                  const numValue = parseFloat32(value);
                  
                  // Update characteristic value
                  setDevice((prevDevice) => {
                    if (!prevDevice) return null;
                    return {
                      ...prevDevice,
                      characteristics: prevDevice.characteristics.map((c) =>
                        c.uuid === `0x${charConfig.uuid.toString(16)}` ? { ...c, value: numValue } : c
                      )
                    };
                  });
                  
                  // Add to data points
                  setDataPoints((prev) => {
                    const newPoints = [
                      ...prev,
                      { x: prev.length, y: numValue, sensorId: charConfig.name }
                    ];
                    return newPoints.slice(-500); // Keep last 500 points
                  });
                }
              });
              
              await characteristic.startNotifications();
            }
          } catch (e) {
            console.warn(`Could not retrieve characteristic ${charConfig.name}:`, e);
          }
        }
      } catch (e) {
        console.warn('Could not retrieve ESS service:', e);
      }

      setDevice({
        id: bluetoothDevice.id,
        name: bluetoothDevice.name || 'Unknown Device',
        characteristics
      });
      setIsConnected(true);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to connect to BLE device';
      setError(errorMsg);
      setIsConnected(false);
    }
  }, []);

  const parseFloat32 = (value: DataView): number => {
    // Parse first 4 bytes as IEEE 754 float
    if (value.byteLength >= 4) {
      return value.getFloat32(0, true); // true for little-endian
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
