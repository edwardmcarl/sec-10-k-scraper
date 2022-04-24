/*global describe, it, browser, expect*/
/*eslint no-undef: "error"*/

const assert = require('assert').strict;
describe('FracTracker UI Search', async () => {
  it('does not (make a request/show spinner) when less than search keyword is less than two', async () => {
    const search_bar = await browser
      .react$$('Container')[1]
      .react$('FormGroup')
      .react$('FormControl');
    await search_bar.setValue('F');
    assert.ok((await browser.
      react$$('Container')[1]
      .react$('FormGroup')
      .react$('ListGroup')
      .react$('Spinner').isExisting()) !== true);
    await search_bar.clearValue();
  });

  it('does show spinner when a keyword of length more than 1 is entered', async () => {
    const search_bar = await browser
      .react$$('Container')[1]
      .react$('FormGroup')
      .react$('FormControl');
    await search_bar.setValue('For');
    await expect(browser.
      react$$('Container')[1]
      .react$('FormGroup')
      .react$('ListGroup')
      .react$('Spinner')).toExist();
    await search_bar.clearValue();
  });

  it('suggests entity names when the user enters a search key', async () => {
    await browser.react$$('Container')[1].react$('FormGroup').react$('FormControl').setValue('Ford');

    //This checks if the first suggested entity name appears. And honestly that is enough
    await browser
      .react$$('Container')[1]
      .react$('FormGroup')
      .react$('ListGroup')
      .react$('ListGroupItem').waitForExist({ timeout: 20000 });
    
    await browser.react$$('Container')[1].react$('FormGroup').react$('FormControl').setValue('F');
    await browser
      .react$$('Container')[1]
      .react$('FormGroup')
      .react$('ListGroup')
      .react$('ListGroupItem').waitForExist({ timeout: 10000, reverse: true });
  });
});
