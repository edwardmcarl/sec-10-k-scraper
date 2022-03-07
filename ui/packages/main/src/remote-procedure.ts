import * as zerorpc from 'zerorpc';
const client = new zerorpc.Client();
client.connect('tcp://localhost:55555');
 //client.on("error", blah)

export async function remoteCall(funcName:string, args: any[] = []) {
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