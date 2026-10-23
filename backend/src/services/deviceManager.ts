import fs from 'fs';
import path from 'path';
import { tuya } from './tuya';

export interface DeviceConfig {
  id: string;
  name: string;
  voiceKeywords: string[];
  deviceId: string;
  channel: string; // 'switch_1', 'switch_2', etc.
  type: 'socket' | 'light' | 'switch' | 'ac';
  isReal: boolean;
  state?: boolean;
}

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const DEVICES_FILE = path.join(DATA_DIR, 'devices.json');

class DeviceManagerService {
  private devices: DeviceConfig[] = [];

  constructor() {
    this.loadDevices();
  }

  private loadDevices() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DEVICES_FILE)) {
        const raw = fs.readFileSync(DEVICES_FILE, 'utf-8');
        this.devices = JSON.parse(raw);
      } else {
        this.devices = [
          {
            id: 'ar_condicionado',
            name: 'Ar Condicionado',
            voiceKeywords: ['ar condicionado', 'ar', 'climatizador'],
            deviceId: 'eb76c836cf22f27da3qdei',
            channel: 'switch_1',
            type: 'socket',
            isReal: true,
            state: false,
          },
        ];
        this.saveToFile();
      }
    } catch (e: any) {
      console.error('[DeviceManager] Erro ao carregar dispositivos:', e.message);
      this.devices = [];
    }
  }

  private saveToFile() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DEVICES_FILE, JSON.stringify(this.devices, null, 2), 'utf-8');
    } catch (e: any) {
      console.error('[DeviceManager] Erro ao salvar dispositivos:', e.message);
    }
  }

  getAll(): DeviceConfig[] {
    return this.devices;
  }

  getById(id: string): DeviceConfig | undefined {
    return this.devices.find((d) => d.id === id);
  }

  upsert(device: Partial<DeviceConfig> & { name: string; deviceId: string }): DeviceConfig {
    const id = device.id || device.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const existingIndex = this.devices.findIndex((d) => d.id === id);

    const voiceKeywords = device.voiceKeywords && device.voiceKeywords.length > 0
      ? device.voiceKeywords
      : [device.name.toLowerCase()];

    const newDevice: DeviceConfig = {
      id,
      name: device.name,
      voiceKeywords,
      deviceId: device.deviceId,
      channel: device.channel || 'switch_1',
      type: device.type || 'socket',
      isReal: device.isReal !== undefined ? device.isReal : true,
      state: device.state || false,
    };

    if (existingIndex >= 0) {
      this.devices[existingIndex] = newDevice;
    } else {
      this.devices.push(newDevice);
    }

    this.saveToFile();
    return newDevice;
  }

  delete(id: string): boolean {
    const initialLen = this.devices.length;
    this.devices = this.devices.filter((d) => d.id !== id);
    if (this.devices.length !== initialLen) {
      this.saveToFile();
      return true;
    }
    return false;
  }

  async toggle(id: string, explicitState?: boolean): Promise<{ success: boolean; state: boolean; name: string }> {
    const dev = this.getById(id);
    if (!dev) throw new Error(`Dispositivo ${id} não encontrado.`);

    const targetState = explicitState !== undefined ? explicitState : !dev.state;
    dev.state = targetState;

    if (dev.isReal && dev.deviceId) {
      await tuya.setDeviceSwitch(dev.deviceId, targetState, dev.channel || 'switch_1');
    }

    this.saveToFile();
    return { success: true, state: targetState, name: dev.name };
  }
}

export const deviceManager = new DeviceManagerService();
