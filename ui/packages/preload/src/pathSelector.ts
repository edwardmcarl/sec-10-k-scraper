import {exposeInMainWorld} from './exposeInMainWorld';
import { ipcRenderer } from 'electron';


async function pathSelectorWindow() {
    return ipcRenderer.invoke('selectOutputPath');
}

export const pathSelector = {pathSelectorWindow} as const;

exposeInMainWorld('pathSelector', pathSelector);