import {BrowserWindow, ipcMain, app} from 'electron';
import {join, normalize} from 'path';
import {URL} from 'url';
import {connectToBackend,remoteCall} from './remote-procedure';
import {spawn} from 'child_process';
import { getPythonExecutableDir, getPythonExecutableName, gracefullyKillChild } from './platform-specific';
import { createInterface } from 'readline';
import { dialog } from 'electron';

async function createWindow() {
  ipcMain.handle('rpc', async (event, props) => {
    return remoteCall(props.name, props.args);
  });
  ipcMain.handle('getPath', ()=>app.getPath('desktop')); // todo make names more descriptive
  ipcMain.handle('selectOutputPath', async (event, props) => {
    return dialog.showOpenDialogSync({ properties: ['openDirectory', 'createDirectory', 'promptToCreate'] }); // return string[] or undefined, configure for no selection!!!
  });

  const browserWindow = new BrowserWindow({
    show: false, // Use 'ready-to-show' event to show window
    webPreferences: {
      webviewTag: false, // The webview tag is not recommended. Consider alternatives like iframe or Electron's BrowserView. https://www.electronjs.org/docs/latest/api/webview-tag#warning
      preload: join(__dirname, '../../preload/dist/index.cjs'),
    },
  });

  /**
   * If you install `show: true` then it can cause issues when trying to close the window.
   * Use `show: false` and listener events `ready-to-show` to fix these issues.
   *
   * @see https://github.com/electron/electron/issues/25012
   */
  browserWindow.on('ready-to-show', () => {
    browserWindow?.show();

    if (import.meta.env.DEV) {
      browserWindow?.webContents.openDevTools();
    }
  });

  /**
   * URL for main window.
   * Vite dev server for development.
   * `file://../renderer/index.html` for production and test
   */
  const pageUrl = import.meta.env.DEV && import.meta.env.VITE_DEV_SERVER_URL !== undefined
    ? import.meta.env.VITE_DEV_SERVER_URL
    : new URL('../renderer/dist/index.html', 'file://' + __dirname).toString();


  await browserWindow.loadURL(pageUrl);

  return browserWindow;
}

/**
 * Restore existing BrowserWindow or Create new BrowserWindow
 */
export async function restoreOrCreateWindow() {
  let window = BrowserWindow.getAllWindows().find(w => !w.isDestroyed());

  if (window === undefined) {
    window = await createWindow();
  }

  if (window.isMinimized()) {
    window.restore();
  }

  window.focus();
}

export async function launchPythonBackend() {

  // launch backend process
  const backendProcess = spawn(`./${getPythonExecutableName()}`, {cwd: getPythonExecutableDir()});
  
  // set handlers to kill backend when the frontend closes
  process.on('exit', gracefullyKillChild.bind(null, backendProcess));
  process.on('SIGINT', gracefullyKillChild.bind(null, backendProcess));
  process.on('SIGTERM', gracefullyKillChild.bind(null, backendProcess));
  process.on('SIGUSR1', gracefullyKillChild.bind(null, backendProcess));
  process.on('SIGUSR2', gracefullyKillChild.bind(null, backendProcess));
  process.on('uncaughtException', gracefullyKillChild.bind(null, backendProcess));

  // listen for the child to announce the port it will communicate on
  const rl = createInterface(backendProcess.stdout);
  
  // block until the backend process prints its port
  let portString:string = await new Promise(resolve=> {
    rl.once('line', resolve);
  });
  console.error(portString);
  connectToBackend(portString);
}
