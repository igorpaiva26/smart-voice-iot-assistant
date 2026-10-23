import fetch from 'node-fetch';
import { loadEnv } from '../types/env';

const env = loadEnv();

export interface TuyaDevice {
  id: string;
  name: string;
  category: string;
  online: boolean;
  product_name: string;
  properties?: Record<string, any>;
}

export class TuyaService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = env.TUYA_API_KEY || 'sk-AZ4e209636ebf56b1d839142efd4c98da432f19a72d5ab1368';
    this.baseUrl = env.TUYA_BASE_URL || 'https://openapi.tuyaus.com';
  }

  private async request(method: string, path: string, body?: any) {
    const url = `${this.baseUrl}${path}`;
    const options: any = {
      method,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    };
    if (body) {
      options.body = JSON.stringify(body);
    }

    const res = await fetch(url, options);
    const data: any = await res.json();
    if (!data.success) {
      throw new Error(`Tuya API [${data.code || 'ERR'}]: ${data.msg || 'Erro desconhecido'}`);
    }
    return data.result;
  }

  async getAllDevices(): Promise<TuyaDevice[]> {
    try {
      const result: any = await this.request('GET', '/v1.0/end-user/devices/all');
      return (result.devices || []).map((d: any) => ({
        id: d.id || d.device_id,
        name: d.name,
        category: d.category,
        online: d.online,
        product_name: d.product_name,
      }));
    } catch (e: any) {
      console.warn('[tuya] Erro ao listar dispositivos:', e.message);
      return [];
    }
  }

  async getDeviceDetail(deviceId: string): Promise<any> {
    return this.request('GET', `/v1.0/end-user/devices/${deviceId}/detail`);
  }

  async setDeviceSwitch(deviceId: string, on: boolean): Promise<boolean> {
    console.log(`[tuya] Enviando comando REAL: device=${deviceId} switch_1=${on}`);
    await this.request(
      'POST',
      `/v1.0/end-user/devices/${deviceId}/shadow/properties/issue`,
      { properties: JSON.stringify({ switch_1: on }) }
    );
    return true;
  }
}

export const tuya = new TuyaService();
