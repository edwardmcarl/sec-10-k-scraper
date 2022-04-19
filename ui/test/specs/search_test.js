/*global describe, it, browser, expect*/
/*eslint no-undef: "error"*/

const assert = require('assert').strict;
describe('FracTracker UI Search', async () => {
  it('suggests entity names when the user enters a search key', async () => {
    const search_bar = await browser
      .react$$('Container')[1]
      .react$('FormGroup')
      .react$('FormControl');
    await search_bar.setValue('Ford');
    const list_group_items = await browser
      .react$$('Container')[1]
      .react$('FormGroup')
      .react$('FormControl')
      .react$('ListGroup')
      .react$$('ListGroupItem');
    assert.strictNotEqual(list_group_items.length, 0);
  });
});
