const { app, BrowserWindow, Tray, Menu, nativeImage } = require('electron');
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

// Ícone ciano em SVG para a bandeja do sistema
const TRAY_ICON_SVG = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <circle cx="16" cy="16" r="13" fill="#0891b2" stroke="#22d3ee" stroke-width="2"/>
  <circle cx="16" cy="16" r="6" fill="#38bdf8"/>
</svg>
`);

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
      windowsHide: true, // Garante que NENHUMA janela CMD apareça
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
    backgroundColor: '#050a0f',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false, // Permite escuta em segundo plano
    },
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
  let icon;
  try {
    icon = nativeImage.createFromBuffer(TRAY_ICON_SVG);
  } catch {
    icon = nativeImage.createEmpty();
  }

  tray = new Tray(icon);
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
