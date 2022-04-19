/*global describe, it, browser, expect*/
/*eslint no-undef: "error"*/

const assert = require('assert').strict;
describe('FracTracker UI', () => {
  it('should have a title of "SEC EDGAR 10-K Information Access"', async () => {
    await expect(browser).toHaveTitle('SEC EDGAR 10-K Information Access');
  });

  it('should have a header of "SEC EDGAR 10-K Information Access"', async () => {
    const header = await browser.$('h1');
    await expect(header).toHaveText('SEC EDGAR 10-K Information Access');
  });

  it('should display FracTracker image', async () => {
    const image = await browser.$('img');
    await expect(image).toHaveAttributeContaining(
      'src',
      '2021-FracTracker-logo',
    );
  });

  describe('Search', () => {
    it('should display CIK/Entity search bar', async () => {
      const search_bar = await browser
        .react$$('Container')[1]
        .react$('FormGroup')
        .react$('FormControl');
      await expect(search_bar).toExist();
      await expect(search_bar).toBeDisplayed();
    });

    it('should display DatePicker for start date and end dates', async () => {
      let year_ago = new Date();
      let now = new Date();
      year_ago.setFullYear(year_ago.getFullYear() - 1);
      now.setUTCHours(0, 1, 0, 0);
      const start_date_selector = await browser
        .react$$('Container')[2]
        .react$('Row')
        .react$$('Col')[0];
      const end_date_selector = await browser
        .react$$('Container')[2]
        .react$('Row')
        .react$$('Col')[1];

      await expect(start_date_selector).toExist();
      await expect(start_date_selector).toBeDisplayed();
      await expect(end_date_selector).toExist();
      await expect(end_date_selector).toBeDisplayed();

      await expect(start_date_selector).toHaveTextContaining('Start Date:');
      await expect(end_date_selector).toHaveTextContaining('End Date:');
    });

    it('should display Dropdown Menu for Forms', async () => {
      const form_dropdown_col = await browser
        .react$$('Container')[2]
        .react$('Row')
        .react$$('Col')[2];
      await expect(form_dropdown_col).toHaveTextContaining('Form Type:');
      await browser.waitUntil(() =>
        form_dropdown_col.react$('Dropdown').isClickable(),
      );
      await form_dropdown_col.react$('Dropdown').click();
      const form_dropdown_menu = await form_dropdown_col
        .react$('Dropdown')
        .react$('DropdownMenu');
      await expect(form_dropdown_menu).toBeDisplayed();
      const items = await form_dropdown_col
        .react$('Dropdown')
        .react$('DropdownMenu')
        .react$$('DropdownItem');
      await expect(items[0]).toHaveText('10-K');
      await expect(items[1]).toHaveText('10-Q');
      await expect(items[2]).toHaveText('20-F');
      assert.strictEqual(items.length, 3);
    });
  });

  describe('File Selector', () => {
    it('should display label for file selector', async () => {
      const file_selector_label = await browser
        .react$$('Container')[3]
        .react$('Row')
        .react$('Col')
        .$('label');
      await expect(file_selector_label).toHaveText('Read from file (.txt):');
    });
    it('should modal for file input structure', async () => {
      let modal = await browser
        .react$$('Container')[3]
        .react$('Row')
        .react$('Col')
        .react$('Modal');
      let isExisting = await modal.isExisting();
      assert.notEqual(isExisting, true);

      await browser
        .react$$('Container')[3]
        .react$('Row')
        .react$('Col')
        .react$('Button')
        .click();
      modal = await browser
        .react$$('Container')[3]
        .react$('Row')
        .react$('Col')
        .react$('Modal');
      await expect(modal).toBeDisplayed();
    });
  });
});
