import {platform} from 'os';
import {app} from 'electron';
import {join} from 'path';

// Showing off another TypeScript feature: the "utility type" ReturnType<T>. Give it a function type and it will extract the return value type,
// which in this case is a finite set!
type possiblePlatforms = ReturnType<typeof platform>;
// We know that platform() returns a NodeJS.Platform, so we could also just use *that* as our key type, but that would be less educational

const platformExecutables:Record<possiblePlatforms, string | null> = {
    'win32': 'backend.exe',
    'darwin': null, // this is MacOS, @todo figure out the executable name
    'linux': 'backend',
    
    // unsupported platforms
    'aix': null,
    'android': null,
    'freebsd': null,
    'haiku': null,
    'openbsd': null,
    'sunos':null,
    'cygwin':null,
    'netbsd': null,
};

// Since we specify that this function outputs a string, TypeScript will throw a compiler error if we write the function in a way that could return 'null'.
export function getPythonExecutableName(): string { 
    const plat = platform();
    const output = platformExecutables[plat]; // since platformExecutables is a Record<possiblePlatforms, string | null>, output can be string or null.
    if (output === null) { // if it's null, we don't currently support the platform.
        throw new Error(`Error launching Python backend: this platform (${plat}) is not supported`);
    } else { // if it's a string, return the name of the executable on that platform.
        return output;
    }
}
export function getPythonExecutableDir(){
    return join(app.getAppPath(), '..', 'extraResources');
}