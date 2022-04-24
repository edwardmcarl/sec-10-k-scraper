import * as zerorpc from 'zerorpc';
const client = new zerorpc.Client();
let connected = false;

export async function connectToBackend(port: string) {
    client.connect(`tcp://localhost:${port}`);
    connected = true;
}

 //client.on("error", blah)

export async function remoteCall(funcName:string, args: any[] = []) {
    if (!connected){
        throw new Error('Not connected to the backend!');
    }
    return new Promise((resolve, reject) => {
        client.invoke(funcName, ...args, (error:any, response:any) => {
            if (error) {
                reject(error);
            } else {
                resolve(response);
            }
        });
    });

}