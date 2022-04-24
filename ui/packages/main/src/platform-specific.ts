import {platform} from 'os';
import {app} from 'electron';
import {join} from 'path';
import type { ChildProcess } from 'child_process';

// Showing off another TypeScript feature: the "utility type" ReturnType<T>. Give it a function type and it will extract the return value type,
// which in this case is a finite set!
type possiblePlatform = ReturnType<typeof platform>;


// We know that platform() returns a NodeJS.Platform, so we could also just use *that* as our key type, but that would be less educational
const EXECUTABLE_BASE_NAME = 'backend_server';

function platformExecutableName() {
    switch(platform()) {
        case 'win32':
            return EXECUTABLE_BASE_NAME + '.exe';
            break;
        case 'linux':
        case 'darwin':
            return EXECUTABLE_BASE_NAME;
            break;
        default:
            return null;
    }
}

export function getPythonExecutableName(): string { 
    const output = platformExecutableName();
    if (output === null) { // if it's null, we don't currently support the platform.
        throw new Error(`Error launching Python backend: this platform (${platform()}) is not supported`);
    } else { // if it's a string, return the name of the executable on that platform.
        return output;
    }
}

export function getPythonExecutableDir(){
    return join(app.getAppPath(), '..', 'extraResources');
}

export function gracefullyKillChild(child: ChildProcess) {
    if (child.stdin === null) {
        throw new Error('Child has no stdin! Cannot kill');
    } else {
        child.stdin.write('kill\n');
    }
}