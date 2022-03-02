
// TypeScript uses ES2016 module import/export syntax
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.min.js';
import 'bootstrap-datepicker/dist/js/bootstrap-datepicker.js';
import 'bootstrap-datepicker/dist/css/bootstrap-datepicker3.css';
let document:Document; // hint for the type-checker that 'document' will exist and have type Document

const form = {
    // add all data from input into this object
};

function showError() {
    const x = document!.getElementById('errorDIV'); //getElementById returns "HTMLElement | null", so we have to handle both cases
    if (x == null) { // example of a 'type guard'; TypeScript doesn't complain about 'x' possibly being null because the if-else excludes the possibility
      //handle this case
    } else {
      if (x.style.display === 'none') {
        x.style.display = 'block';
      } else {
        x.style.display = 'none';
      }  
    }
  }

function retrieveInfo() {  
  // Again, getElementById returns "HTMLElement | null".
  // Here, we assert non-null status fo the result by putting a "!" after it.
  const searchInput = (<HTMLInputElement>document.getElementById('searchInput'))!.value; // Also note the casting to HTMLInputElement, bc HTMLElement doesn't have the `value` field.
  const startDate = (<HTMLInputElement>document.getElementById('startDate'))!.value;
  const endDate = (<HTMLInputElement>document.getElementById('endDate'))!.value;
  const NERCheck = (<HTMLInputElement>document.getElementById('NERCheck'))!.checked;
  const fileUpload = (<HTMLInputElement>document.getElementById('fileUpload'))!.value;
  console.log('Search Input: ' + searchInput + '\nStart Date: ' + startDate + '\nEnd Date: ' + endDate + '\nNER Check: ' + NERCheck + '\nFile Upload: ' + fileUpload);
}

function addToQueue() {
  return;
}