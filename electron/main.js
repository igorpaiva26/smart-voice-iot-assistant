const { app, BrowserWindow, Tray, Menu } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

// Silencia logs internos do Chromium
app.commandLine.appendSwitch('disable-logging');
app.commandLine.appendSwitch('log-level', '3');

let mainWindow = null;
let tray = null;
let backendProcess = null;
let isQuitting = false;

// Caminhos dos ícones
const TRAY_ICON_PATH = path.join(__dirname, 'tray-icon.png');
const APP_ICON_PATH = path.join(__dirname, 'icon.ico');

// Verifica se backend está respondendo
function checkBackendReady(callback, retries = 25) {
  const req = http.get('http://localhost:3001/api/health', (res) => {
    if (res.statusCode === 200) {
      callback(true);
    } else if (retries > 0) {
      setTimeout(() => checkBackendReady(callback, retries - 1), 500);
    } else {
      callback(false);
    }
  });

  req.on('error', () => {
    if (retries > 0) {
      setTimeout(() => checkBackendReady(callback, retries - 1), 500);
    } else {
      callback(false);
    }
  });
}

function startBackend() {
  checkBackendReady((alreadyRunning) => {
    if (alreadyRunning) return;

    const backendDir = path.join(__dirname, '..', 'backend');
    backendProcess = spawn('npm.cmd', ['run', 'dev'], {
      cwd: backendDir,
      shell: true,
      stdio: 'ignore',
      windowsHide: true,
    });
  }, 1);
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 440,
    height: 580,
    minWidth: 380,
    minHeight: 500,
    title: 'Aline - Smart Home Assistant',
    icon: APP_ICON_PATH,
    backgroundColor: '#050a0f',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false, // Permite escuta contínua em segundo plano
    },
  });

  // ⚠️ AUTO-AUTORIZAÇÃO DE MICROFONE NO ELECTRON (Essencial para não bloquear o mic)
  const session = mainWindow.webContents.session;
  session.setPermissionCheckHandler((webContents, permission) => {
    if (permission === 'media') return true;
    return false;
  });
  session.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media') return callback(true);
    callback(false);
  });

  checkBackendReady(() => {
    const distIndex = path.join(__dirname, '..', 'frontend', 'dist', 'index.html');
    mainWindow.loadFile(distIndex).catch(() => {
      mainWindow.loadURL('http://localhost:5173');
    });

    mainWindow.once('ready-to-show', () => {
      mainWindow.show();
    });
  });

  // Fecha para a bandeja
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  tray = new Tray(TRAY_ICON_PATH);
  tray.setToolTip('Aline - Smart Home Assistant (Ativa na bandeja)');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Abrir Aline',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    {
      label: 'Ocultar na Bandeja',
      click: () => {
        if (mainWindow) mainWindow.hide();
      },
    },
    { type: 'separator' },
    {
      label: 'Fechar Aplicativo',
      click: () => {
        isQuitting = true;
        if (backendProcess) {
          try { backendProcess.kill(); } catch (_) {}
        }
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (!mainWindow) return;
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// Instância única
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    startBackend();
    createTray();
    createMainWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
    });
  });

  app.on('before-quit', () => {
    isQuitting = true;
    if (backendProcess) {
      try { backendProcess.kill(); } catch (_) {}
    }
  });
}
