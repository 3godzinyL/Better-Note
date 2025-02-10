const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

const APP_DATA_DIR = path.join(__dirname, 'temp_files');

if (!fs.existsSync(APP_DATA_DIR)) {
  fs.mkdirSync(APP_DATA_DIR);
}

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
  if (fs.existsSync(APP_DATA_DIR)) {
    try {
      const files = fs.readdirSync(APP_DATA_DIR);
      files.forEach(file => {
        fs.unlinkSync(path.join(APP_DATA_DIR, file));
      });
    } catch (error) {
      console.error('Błąd podczas czyszczenia plików tymczasowych:', error);
    }
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
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
    filters: [
      { name: 'Text Files', extensions: ['txt', 'md', 'js', 'html', 'css', 'cpp', 'h', 'py', 'json'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    try {
      const filePath = result.filePaths[0];
      const content = fs.readFileSync(filePath, 'utf8');
      const filename = path.basename(filePath);
      
      mainWindow.webContents.send('file-opened', {
        filename: filename,
        content: content,
        path: filePath,
        type: path.extname(filePath).slice(1).toLowerCase()
      });
    } catch (error) {
      console.error('Błąd podczas otwierania pliku:', error);
    }
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

ipcMain.on('save-file', async (event, { content, path }) => {
  try {
    fs.writeFileSync(path, content, 'utf8');
    if (path.includes(APP_DATA_DIR)) {
      try {
        fs.unlinkSync(path);
      } catch (error) {
        console.error('Błąd podczas usuwania pliku tymczasowego:', error);
      }
    }
    mainWindow.webContents.send('file-saved', { path });
  } catch (error) {
    console.error('Błąd podczas zapisywania pliku:', error);
  }
});

ipcMain.on('save-file-as', async (event, content) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    filters: [{ name: 'Text Files', extensions: ['txt', 'md'] }]
  });

  if (!result.canceled) {
    try {
      fs.writeFileSync(result.filePath, content, 'utf8');
      const filename = path.basename(result.filePath);
      mainWindow.webContents.send('file-saved-as', {
        filename,
        path: result.filePath
      });
    } catch (error) {
      console.error('Błąd podczas zapisywania pliku:', error);
    }
  }
});

ipcMain.on('toggle-syntax-options', () => {
  mainWindow.webContents.send('toggle-syntax-options');
});
