import React, { useState, useEffect } from 'react';
import './DeviceManagerModal.css';

interface Device {
  id: string;
  name: string;
  voiceKeywords: string[];
  deviceId: string;
  channel: string;
  type: string;
  isReal: boolean;
  state?: boolean;
}

interface TuyaRemoteDevice {
  id: string;
  name: string;
  category: string;
  online: boolean;
  product_name: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const API_BASE = 'http://localhost:3001/api';

export function DeviceManagerModal({ isOpen, onClose }: Props) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [tuyaDevices, setTuyaDevices] = useState<TuyaRemoteDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [channel, setChannel] = useState('switch_1');
  const [type, setType] = useState('socket');

  const fetchDevices = async () => {
    try {
      const res = await fetch(`${API_BASE}/devices`);
      const data = await res.json();
      setDevices(data.devices || []);
    } catch (e: any) {
      console.error('Erro ao buscar dispositivos:', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDevices();
    }
  }, [isOpen]);

  const handleToggle = async (id: string, currentState?: boolean) => {
    try {
      const res = await fetch(`${API_BASE}/devices/${id}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: !currentState }),
      });
      const data = await res.json();
      if (data.success) {
        setDevices((prev) =>
          prev.map((d) => (d.id === id ? { ...d, state: data.state } : d))
        );
      }
    } catch (err: any) {
      alert('Erro ao acionar dispositivo: ' + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir este dispositivo da Aline?')) return;
    try {
      await fetch(`${API_BASE}/devices/${id}`, { method: 'DELETE' });
      fetchDevices();
    } catch (err: any) {
      alert('Erro ao excluir: ' + err.message);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !deviceId.trim()) {
      alert('Preencha o Nome e o Device ID');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/devices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          deviceId: deviceId.trim(),
          channel,
          type,
          voiceKeywords: [name.trim().toLowerCase()],
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMsg('Dispositivo adicionado com sucesso!');
        setTimeout(() => setStatusMsg(''), 3000);
        setName('');
        setDeviceId('');
        setShowAddForm(false);
        fetchDevices();
      }
    } catch (err: any) {
      alert('Erro ao salvar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDiscoverTuya = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/devices/tuya/discover`);
      const data = await res.json();
      setTuyaDevices(data.devices || []);
      if ((data.devices || []).length === 0) {
        setStatusMsg('Nenhum aparelho novo encontrado no Smart Life.');
      }
    } catch (err: any) {
      alert('Erro ao buscar Tuya: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>⚙️ Gerenciador de Casa Inteligente</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {statusMsg && <div className="status-toast">{statusMsg}</div>}

        <div className="modal-actions-bar">
          <button
            className="action-btn primary"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            {showAddForm ? 'Cancelar' : '+ Novo Dispositivo'}
          </button>
          <button
            className="action-btn secondary"
            onClick={handleDiscoverTuya}
            disabled={loading}
          >
            🔄 Buscar na Conta Smart Life
          </button>
        </div>

        {/* FORMULÁRIO DE ADIÇÃO */}
        {showAddForm && (
          <form className="device-form" onSubmit={handleSave}>
            <h3>Adicionar Novo Dispositivo</h3>
            <div className="form-group">
              <label>Nome do Aparelho (Como você vai falar por voz):</label>
              <input
                type="text"
                placeholder="Ex: Luz do Quarto, Tomada da TV"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Device ID (Copiado do Smart Life / Tuya.ai):</label>
              <input
                type="text"
                placeholder="Ex: eb76c836cf22f27da3qdei"
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Canal / Chave:</label>
                <select value={channel} onChange={(e) => setChannel(e.target.value)}>
                  <option value="switch_1">Canal 1 (switch_1 - Tomada)</option>
                  <option value="switch_2">Canal 2 (switch_2 - Luz)</option>
                  <option value="switch_3">Canal 3 (switch_3)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Tipo do Aparelho:</label>
                <select value={type} onChange={(e) => setType(e.target.value)}>
                  <option value="socket">Tomada Inteligente</option>
                  <option value="light">Lâmpada / Interruptor</option>
                  <option value="ac">Ar Condicionado</option>
                </select>
              </div>
            </div>

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar no Sistema da Aline'}
            </button>
          </form>
        )}

        {/* LISTA DE DISPOSITIVOS DESCOBERTOS NA NUVEM TUYA */}
        {tuyaDevices.length > 0 && (
          <div className="discovered-box">
            <h4>Dispositivos Encontrados no seu App Smart Life:</h4>
            {tuyaDevices.map((td) => (
              <div key={td.id} className="discovered-item">
                <div>
                  <strong>{td.name}</strong> ({td.product_name || td.category})
                  <span className="dev-id">ID: {td.id}</span>
                </div>
                <button
                  className="quick-import-btn"
                  onClick={() => {
                    setName(td.name);
                    setDeviceId(td.id);
                    setShowAddForm(true);
                  }}
                >
                  Usar Este ID
                </button>
              </div>
            ))}
          </div>
        )}

        {/* LISTA DE DISPOSITIVOS CONFIGURADOS */}
        <div className="devices-list">
          <h3>Dispositivos Ativos ({devices.length})</h3>
          {devices.length === 0 ? (
            <p className="empty-text">Nenhum dispositivo configurado ainda.</p>
          ) : (
            devices.map((d) => (
              <div key={d.id} className={`device-card ${d.state ? 'is-on' : ''}`}>
                <div className="card-info">
                  <span className="card-icon">
                    {d.type === 'light' ? '💡' : d.type === 'ac' ? '❄️' : '🔌'}
                  </span>
                  <div>
                    <h4>{d.name}</h4>
                    <span className="card-meta">
                      ID: {d.deviceId.slice(0, 10)}... | {d.channel}
                    </span>
                  </div>
                </div>

                <div className="card-actions">
                  <button
                    className={`toggle-test-btn ${d.state ? 'active' : ''}`}
                    onClick={() => handleToggle(d.id, d.state)}
                  >
                    {d.state ? 'Ligado' : 'Desligado'}
                  </button>
                  <button
                    className="delete-btn"
                    title="Excluir"
                    onClick={() => handleDelete(d.id)}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
