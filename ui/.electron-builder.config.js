if (process.env.VITE_APP_VERSION === undefined) {
  const now = new Date;
  process.env.VITE_APP_VERSION = `${now.getUTCFullYear() - 2000}.${now.getUTCMonth() + 1}.${now.getUTCDate()}-${now.getUTCHours() * 60 + now.getUTCMinutes()}`;
}

/**
 * @type {import('electron-builder').Configuration}
 * @see https://www.electron.build/configuration/configuration
 */
const config = {
  nodeGypRebuild: false,
  npmRebuild: false,
  directories: {
    output: 'dist',
    buildResources: 'buildResources',
  },
  files: [
    'packages/**/dist/**',
  ],
  extraMetadata: {
    version: process.env.VITE_APP_VERSION,
  },
  extraResources: 'extraResources',
  win: {
    target: 'nsis'
  },
  nsis: {
    oneClick: false,
    allowElevation: true,
    allowToChangeInstallationDirectory: true
  },
  mac: {
    target: 'dmg'
  }
};

module.exports = config;
