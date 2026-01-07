const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const chokidar = require('chokidar');

let mainWindow;
let todoFilePath;
let watcher;

function getRendererIndexPath() {
  // In packaged app, __dirname points inside app.asar and we ship dist/renderer
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'app', 'dist', 'renderer', 'index.html');
  }
  // In dev, use source renderer
  return path.join(__dirname, 'renderer', 'index.html');
}

function ensureTodoFile(filePath) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(
      filePath,
      JSON.stringify({ tasks: [], completed: [], skipped: [] }, null, 2)
    );
  }
}

function setTodoFile(filePath) {
  todoFilePath = path.resolve(filePath);
  ensureTodoFile(todoFilePath);

  if (watcher) {
    watcher.close();
    watcher = null;
  }

  watcher = chokidar.watch(todoFilePath);
  watcher.on('change', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('file-changed');
    }
  });

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setTitle(`Neptune - ${path.basename(todoFilePath)}`);
    mainWindow.webContents.send('file-changed');
  }
}

function createWindow(filePath) {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 950,
    minWidth: 720,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    titleBarStyle: 'default',
    title: 'Neptune',
    autoHideMenuBar: true
  });

  mainWindow.loadFile(getRendererIndexPath());

  mainWindow.on('closed', () => {
    if (watcher) watcher.close();
    watcher = null;
    mainWindow = null;
  });

  setTodoFile(filePath);
}

function getDefaultTodoPath() {
  return path.join(app.getPath('userData'), 'Neptune.todo');
}

// macOS: open file by double-clicking in Finder
app.on('open-file', (event, filePath) => {
  event.preventDefault();

  const openPath = filePath || getDefaultTodoPath();

  if (mainWindow) {
    setTodoFile(openPath);
    mainWindow.show();
    mainWindow.focus();
    return;
  }

  // If app isn't ready yet, wait until ready to create window
  app.whenReady().then(() => createWindow(openPath));
});

// Windows/Linux + macOS second-instance: handle opening a file by double-click
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    // argv contains the file path in packaged mode when user double-clicks
    const candidate = argv.find(a => typeof a === 'string' && a.toLowerCase().endsWith('.todo'));
    const openPath = candidate || getDefaultTodoPath();

    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
      setTodoFile(openPath);
    }
  });

  app.whenReady().then(() => {
    const argPath = process.argv.slice(1).find(a => typeof a === 'string' && a.toLowerCase().endsWith('.todo'))
      || process.argv[2];
    const filePath = argPath ? path.resolve(argPath) : getDefaultTodoPath();
    createWindow(filePath);
  });
}

app.on('window-all-closed', () => {
  app.quit();
});

// IPC handlers
ipcMain.handle('read-todo-file', () => {
  try {
    const content = fs.readFileSync(todoFilePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    return { tasks: [], completed: [], skipped: [] };
  }
});

ipcMain.handle('write-todo-file', (event, data) => {
  try {
    fs.writeFileSync(todoFilePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing file:', error);
    return false;
  }
});