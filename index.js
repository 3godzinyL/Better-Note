const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      sandbox: false
    }
  });

  mainWindow.setIgnoreMouseEvents(false);
  mainWindow.loadFile('index.html');

  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window-maximized');
  });

  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window-unmaximized');
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

ipcMain.on('minimize-window', (event) => {
  mainWindow.minimize();
});

ipcMain.on('maximize-window', (event) => {
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
});

ipcMain.on('close-window', (event) => {
  mainWindow.close();
});

ipcMain.on('open-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'Text Files', extensions: ['txt', 'md'] }]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const content = fs.readFileSync(result.filePaths[0], 'utf8');
    const filename = path.basename(result.filePaths[0]);
    mainWindow.webContents.send('file-content', content);
    mainWindow.webContents.send('file-opened', filename);
  }
});

ipcMain.on('save-pdf', async () => {
  const result = await dialog.showSaveDialog(mainWindow, {
    filters: [{ name: 'PDF', extensions: ['pdf'] }]
  });

  if (!result.canceled) {
    const pdfData = await mainWindow.webContents.printToPDF({});
    fs.writeFileSync(result.filePath, pdfData);
  }
});

ipcMain.on('save-file', async () => {
  const result = await dialog.showSaveDialog(mainWindow, {
    filters: [{ name: 'Text Files', extensions: ['txt', 'md'] }]
  });

  if (!result.canceled) {
    mainWindow.webContents.send('get-content');
  }
});
