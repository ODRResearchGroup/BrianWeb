import { useState, useCallback } from 'react';

type DataGroup = 'environmental' | 'mems';

interface BLECharacteristicData {
  uuid: string;
  name: string;
  group: DataGroup;
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

// Time Sync Characteristic UUID - update this with your device's time sync characteristic UUID
const TIME_SYNC_CHAR_UUID = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d'; // Current Time characteristic

const ESS_UUID_NAME_MAP: Record<string, string> = {
  '00002a6e-0000-1000-8000-00805f9b34fb': 'Temperature (BME680)',
  '00002a6f-0000-1000-8000-00805f9b34fb': 'Humidity (BME680)',
  '00002a6d-0000-1000-8000-00805f9b34fb': 'Pressure (BME680)',
  '00002a69-0000-1000-8000-00805f9b34fb': 'Altitude (BME680)',
  '00002bd1-0000-1000-8000-00805f9b34fb': 'CH4 (Methane)',
  '00002bd3-0000-1000-8000-00805f9b34fb': 'VOC (Volatile Organic Compounds)',
  '00002bcf-0000-1000-8000-00805f9b34fb': 'NH3 (Ammonia)',
  '00002bd2-0000-1000-8000-00805f9b34fb': 'NO2 (Nitrogen Dioxide)',
};

const CUSTOM_UUID_NAME_MAP: Record<string, string> = {
  '6a135b89-f360-4f64-86fc-5a14092034b4': 'HCHO (Formaldehyde)',
  '4c28fcb8-d69b-404a-8668-41655d814e7f': 'Odor',
  'f8156843-6d98-4ba2-8014-1cf03d7dedb8': 'EtOH (Ethanol)',
  '87dc71bd-29a4-4218-a2a7-83fd2a69cc40': 'H2S (Hydrogen Sulfide)',
  '88f6fa6c-c4e0-4a3d-ba72-f435641251c4': 'CO (Carbon Monoxide)',
  'cafb955e-6e7b-424b-9e03-6d8d003aa286': 'Smoke',
  '0176655b-0007-4e02-abc1-e9f2d6815f46': 'H2 (Hydrogen)',
  '5b0e3c0b-1a44-4b76-82ee-8c2adc2dd8e9': 'Gas Resistance',
};

const MEMS_ESS_UUIDS = new Set([
  '00002bd1-0000-1000-8000-00805f9b34fb',
  '00002bd3-0000-1000-8000-00805f9b34fb',
  '00002bcf-0000-1000-8000-00805f9b34fb',
  '00002bd2-0000-1000-8000-00805f9b34fb',
]);

const ENVIRONMENTAL_CUSTOM_UUIDS = new Set([
  '5b0e3c0b-1a44-4b76-82ee-8c2adc2dd8e9'//: 'Gas Resistance',
]);

export const useBLE = () => {
  const [device, setDevice] = useState<BLEDevice | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataPoints, setDataPoints] = useState<Array<{ x: number; y: number; sensorId: string; group: DataGroup }>>([]);
  const [allDataPoints, setAllDataPoints] = useState<Array<{ timestamp: number; sensorId: string; group: DataGroup; value: number }>>([]);

  const requestDevice = useCallback(async () => {
    try {
      setError(null);
      const bluetoothDevice = await (navigator as any).bluetooth.requestDevice({
        filters: [
          { name: 'BRIAN' },
          { name: 'esp32' }
        ],
        optionalServices: [ESS_SERVICE_UUID, CUSTOM_SERVICE_UUID, TIME_SYNC_CHAR_UUID, 'generic_access', 'generic_attribute']
      });

      const server = await bluetoothDevice.gatt?.connect();
      if (!server) throw new Error('Failed to connect to GATT server');

      // Sync timestamp with the device
      try {
        const timestamp = Math.floor(Date.now() / 1000);
        const buffer = new ArrayBuffer(8);
        const view = new DataView(buffer);
        view.setBigUint64(0, BigInt(timestamp), true);  // little-endian
        
        // Try to find and write to the time sync characteristic
        const services = await server.getPrimaryServices();
        for (const service of services) {
          try {
            const timeSyncChar = await service.getCharacteristic(TIME_SYNC_CHAR_UUID);
            await timeSyncChar.writeValue(buffer);
            console.log('Successfully synced timestamp with device:', timestamp);
            break;
          } catch (e) {
            // Continue searching in other services
          }
        }
      } catch (e) {
        console.warn('Could not sync timestamp with device:', e);
        // Continue connecting even if time sync fails
      }

      const characteristics: BLECharacteristicData[] = [];
      const characteristicsToSubscribe: BLECharacteristicData[] = [];

      const discoverServiceCharacteristics = async (
        service: BluetoothRemoteGATTService,
        serviceType: 'ess' | 'custom'
      ) => {
        const discovered = await service.getCharacteristics();

        for (const characteristic of discovered) {
          const normalizedUuid = characteristic.uuid.toLowerCase();

          // Time sync is a control characteristic, not a sensor stream.
          // Keep it out of sensor lists/plots/subscriptions.
          if (normalizedUuid === TIME_SYNC_CHAR_UUID.toLowerCase()) {
            continue;
          }

          const defaultName = `${serviceType.toUpperCase()} ${normalizedUuid.slice(0, 8)}`;
          const nameMap = serviceType === 'ess' ? ESS_UUID_NAME_MAP : CUSTOM_UUID_NAME_MAP;
          const resolvedName = nameMap[normalizedUuid] || defaultName;

          const group: DataGroup = serviceType === 'custom'
            ? (ENVIRONMENTAL_CUSTOM_UUIDS.has(normalizedUuid) ? 'environmental' : 'mems')
            : MEMS_ESS_UUIDS.has(normalizedUuid)
              ? 'mems'
              : 'environmental';

          const characteristicData: BLECharacteristicData = {
            uuid: normalizedUuid,
            name: resolvedName,
            group,
            characteristic,
            value: null
          };

          // Diagnostic logging
          console.log(`Discovered characteristic: ${resolvedName} (${normalizedUuid})`);
          console.log(`  Properties:`, {
            read: characteristic.properties.read,
            write: characteristic.properties.write,
            writeWithoutResponse: characteristic.properties.writeWithoutResponse,
            notify: characteristic.properties.notify,
            indicate: characteristic.properties.indicate
          });

          characteristics.push(characteristicData);
          characteristicsToSubscribe.push(characteristicData);
        }
      };
      
      // Fetch ESS service and its characteristics
      try {
        const essService = await server.getPrimaryService(ESS_SERVICE_UUID);
        await discoverServiceCharacteristics(essService, 'ess');
      } catch (e) {
        console.warn('Could not retrieve ESS service:', e);
      }
      
      // Fetch Custom service and its characteristics
      try {
        const customService = await server.getPrimaryService(CUSTOM_SERVICE_UUID);
        await discoverServiceCharacteristics(customService, 'custom');
      } catch (e) {
        console.warn('Could not retrieve Custom service:', e);
      }

      setDevice({
        id: bluetoothDevice.id,
        name: bluetoothDevice.name || 'Unknown Device',
        characteristics
      });
      setIsConnected(true);

      for (const item of characteristicsToSubscribe) {
        if (item.characteristic) {
          attachNotificationListener(item.characteristic, item.name, item.group, item.uuid);
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to connect to BLE device';
      setError(errorMsg);
      setIsConnected(false);
    }
  }, []);

  const parseFloat32 = (value: DataView): number => {
    const bytes = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    const decodedText = new TextDecoder().decode(bytes).trim().replace(/\0/g, '');
    const textNumber = Number(decodedText);

    if (!Number.isNaN(textNumber) && Number.isFinite(textNumber)) {
      return textNumber;
    }

    if (value.byteLength >= 4) {
      const littleEndian = value.getFloat32(0, true);
      if (Number.isFinite(littleEndian)) {
        return littleEndian;
      }

      const bigEndian = value.getFloat32(0, false);
      if (Number.isFinite(bigEndian)) {
        return bigEndian;
      }
    }

    if (value.byteLength >= 2) {
      return value.getUint16(0, true);
    }

    if (value.byteLength >= 1) {
      return value.getUint8(0);
    }

    return 0;
  };

  const recordValue = (sensorName: string, group: DataGroup, uuid: string, rawValue: DataView) => {
    const numValue = parseFloat32(rawValue);
    
    // Diagnostic logging for BME680 sensors
    if (sensorName.includes('Temperature') || sensorName.includes('Pressure') || sensorName.includes('Humidity')) {
      console.log(`[${sensorName}] Received ${rawValue.byteLength} bytes, parsed value: ${numValue}`, {
        hex: Array.from(new Uint8Array(rawValue.buffer, rawValue.byteOffset, rawValue.byteLength))
          .map(b => '0x' + b.toString(16).padStart(2, '0'))
          .join(' ')
      });
    }

    setDevice((prevDevice) => {
      if (!prevDevice) return null;
      return {
        ...prevDevice,
        characteristics: prevDevice.characteristics.map((c) =>
          c.uuid === uuid ? { ...c, value: numValue } : c
        )
      };
    });

    setDataPoints((prev) => {
      const newPoints = [
        ...prev,
        { x: prev.length, y: numValue, sensorId: sensorName, group }
      ];
      return newPoints.slice(-2000);
    });

    setAllDataPoints((prev) => [
      ...prev,
      { timestamp: Date.now(), sensorId: sensorName, group, value: numValue }
    ]);
  };

  const attachNotificationListener = (
    characteristic: BluetoothRemoteGATTCharacteristic,
    sensorName: string,
    group: DataGroup,
    uuid: string
  ) => {
    if (characteristic.properties.read) {
      characteristic.readValue().then((value) => {
        recordValue(sensorName, group, uuid, value);
      }).catch((e) => {
        console.warn(`Failed to read initial value for ${sensorName}:`, e);
      });
    }

    if (characteristic.properties.notify) {
      characteristic.addEventListener('characteristicvaluechanged', (event: Event) => {
        const value = (event.target as BluetoothRemoteGATTCharacteristic).value;
        if (value) {
          recordValue(sensorName, group, uuid, value);
        }
      });
      
      characteristic.startNotifications().then(() => {
        console.log(`Successfully subscribed to notifications for ${sensorName}`);
      }).catch((e) => {
        console.error(`Failed to start notifications for ${sensorName}:`, {
          name: e.name,
          message: e.message,
          uuid: uuid,
          properties: characteristic.properties
        });
      });
    } else {
      console.warn(`Characteristic ${sensorName} does not support notifications`, {
        uuid: uuid,
        properties: characteristic.properties
      });
    }
  };

  const disconnect = useCallback(async () => {
    if (device?.id) {
      try {
        // Note: Web Bluetooth doesn't have explicit disconnect
        // The connection closes when the page unloads or user navigates away
        setIsConnected(false);
        setDevice(null);
        setDataPoints([]);
        setAllDataPoints([]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to disconnect');
      }
    }
  }, [device?.id]);

  const downloadCSV = useCallback(() => {
    if (allDataPoints.length === 0) return;

    const headers = ['Timestamp', 'Date', 'Sensor', 'Group', 'Value'];
    const rows = allDataPoints.map((point) => [
      point.timestamp,
      new Date(point.timestamp).toISOString(),
      point.sensorId,
      point.group,
      point.value
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ble_data_${new Date().toISOString()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [allDataPoints]);

  return {
    device,
    isConnected,
    error,
    dataPoints,
    requestDevice,
    disconnect,
    setDataPoints,
    allDataPoints,
    downloadCSV
  };
};
