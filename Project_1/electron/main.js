const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');

let mainWindow = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    });
   /* mainWindow.webContents.on('before-input-event', (event, input) => {
        if (input.control && input.shift && input.key.toLowerCase() === 'd') {
            mainWindow.webContents.toggleDevTools();
        }
    });*/
    mainWindow.setMenu(null);
    // Allow manual override for local testing, then fall back to env-based default.
    const forcedStartPage = process.env.ELECTRON_START_PAGE;
    const startPage = forcedStartPage || (app.isPackaged ? 'login.html' : 'PCU_signature_menu.html');
    mainWindow.loadFile(path.join(__dirname, '..', 'public', 'pages', startPage));
}

app.whenReady().then(() => {
    ipcMain.handle('auth:openExternal', async (_event, url) => {
        if (!url || typeof url !== 'string') {
            throw new Error('Invalid URL');
        }
        await shell.openExternal(url);
        return true;
    });

    createWindow();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});