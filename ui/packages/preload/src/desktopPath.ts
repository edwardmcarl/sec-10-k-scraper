import { exposeInMainWorld } from './exposeInMainWorld';
import { app, ipcRenderer } from 'electron';

async function getDesktopPath(): Promise<string>{
    return await ipcRenderer.invoke('getPath');
}

export const desktopPath = {getDesktopPath} as const;
exposeInMainWorld('desktopPath', desktopPath);