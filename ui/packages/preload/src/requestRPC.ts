import { ipcRenderer } from 'electron';
import { exposeInMainWorld } from './exposeInMainWorld';

async function procedure(name:string, args:any[] ) {
    return ipcRenderer.invoke('rpc', {name: name, args: args});
}

export const requestRPC = {procedure} as const; //something

exposeInMainWorld('requestRPC', requestRPC);