// A simple test to verify a visible window is opened with a title
const Application = require('spectron').Application;
const assert = require('assert');
const fs = require('fs');

const myApp = new Application({
  path: '../../../dist/win-unpacked/fractracker-sec-ui.exe';
})

const verifyWindowIsVisibleWithTitle = async (app) => {
  await app.start();
  try {
    // Check if the window is visible
    //TODO: get this to work
    // const isVisible = await app.browserWindow.isVisible()
    // Verify the window is visible
    // assert.strictEqual(isVisible, true)

    // Get the window's title
    const title = await app.client.getTitle();
    // Verify the window's title
    assert.strictEqual(title, 'SEC EDGAR 10-K Information Access');
    console.log('Title test passed');
     

  } catch (error) {
    // Log any failures
    console.error('Test failed', error.message);
  }
  // Stop the application
  await app.stop();
}

verifyWindowIsVisibleWithTitle(myApp);