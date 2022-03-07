
const form = {
    // add all data from input into this object
};

export function showError() {
    const x = document.getElementById('errorDIV'); //getElementById returns "HTMLElement | null", so we have to handle both cases
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

export function retrieveInfo() {  
  // Again, getElementById returns "HTMLElement | null".
  // Here, we assert non-null status fo the result by putting a "!" after it.
  // It would be better programming practice to actually handle the 'null' case to avoid runtime errors.
  const searchInput = (<HTMLInputElement>document.getElementById('searchInput'))!.value; // Also note the casting to HTMLInputElement, bc HTMLElement doesn't have the `value` field.
  const startDate = (<HTMLInputElement>document.getElementById('startDate'))!.value;
  const endDate = (<HTMLInputElement>document.getElementById('endDate'))!.value;
  const NERCheck = (<HTMLInputElement>document.getElementById('NERCheck'))!.checked;
  const fileUpload = (<HTMLInputElement>document.getElementById('fileUpload'))!.value;
  console.log('Search Input: ' + searchInput + '\nStart Date: ' + startDate + '\nEnd Date: ' + endDate + '\nNER Check: ' + NERCheck + '\nFile Upload: ' + fileUpload);


  // sample returns from API, dummy data
  let f1 = new Filing(1, 'Apple', '123456789', '10/10/2010', '10-K', false);
  let f2 = new Filing(2, 'Google', '987654321', '10/10/2010', '10-K', false);
  let f3 = new Filing(3, 'Microsoft', '123456789', '10/10/2010', '10-K', false);
  let f4 = new Filing(4, 'Facebook', '987654321', '10/10/2010', '10-K', false);
  let f5 = new Filing(5, 'Amazon', '123456789', '10/10/2010', '10-K', false);
  let f6 = new Filing(6, 'Twitter', '987654321', '10/10/2010', '10-K', false);
  let f7 = new Filing(7, 'Tesla', '123456789', '10/10/2010', '10-K', false);
  let f8 = new Filing(8, 'SpaceX', '987654321', '10/10/2010', '10-K', false);
  let f9 = new Filing(9, 'Nasa', '123456789', '10/10/2010', '10-K', false);
  let f10 = new Filing(10, 'IBM', '987654321', '10/10/2010', '10-K', false);
  let filings = [f1, f2, f3, f4, f5, f6, f7, f8, f9, f10];

  removeAllItemsFromTable();
  addItemsToTable(filings);
}

function addToQueue() {
  return;
}

// type for the result of the search() Python call
interface searchResult {
  cik: string,
  entity: string
}

// class for search results entity-cik pairs
class WhateverFiling {
  cik: string;
  entity:string;
  constructor(cikIn:string, entityIn:string) {
    this.cik = cikIn;
    this.entity = entityIn;
  }
}

class Filing {
  num: number; // number in table
  entityName: string; // name of entity
  cikNumber: string; // cik number
  filingDate: string; // filing date
  documentAdress10k: string; // document address for 10-K
  extractInfo: boolean; // true/false if user wants to extract info from 10-K
  constructor(numIn: number, entityNameIn: string, cikNumberIn: string, filingDateIn: string, documentAdress10kIn: string, extractInfoIn: boolean) {
    this.num = numIn;
    this.entityName = entityNameIn;
    this.cikNumber = cikNumberIn;
    this.filingDate = filingDateIn;
    this.documentAdress10k = documentAdress10kIn;
    this.extractInfo = extractInfoIn;
  }
}

 // update the results table based on the user's input
 function addItemsToTable(filing_list: Filing[]) {
  const FILING_NAMES = ['number', 'entityName', 'cikNumber', 'filingDate', 'documentAddress10k', 'extractInfo']; // names of variables contained in Filing class
  let tableBodyObject = (<HTMLTableElement>document.getElementById('results-table')?.lastElementChild); // get the table body object
  for (let i = 0; i < filing_list.length; i++) { // loops over each filing object in inputted list
    let row = tableBodyObject.insertRow(); // create a new row
    for (let j = 0; j < FILING_NAMES.length; j++) { // loops over each variable in Filing class
      let cell = row.insertCell(); // inserts cell into row
      let propName = FILING_NAMES[j] as keyof Filing;
      let f = filing_list[i];
      let t = f[propName];
      let ty = typeof(t);
      if(ty === 'string' || ty === 'number' || ty === 'boolean') {
        cell.innerText = f[propName].toString(); // sets the cell's text to the value of the variable in the filing object
      }
    }
  }
}

// removes all items from the results table
function removeAllItemsFromTable() {
  let tableBodyObject = (<HTMLInputElement>document.getElementById('results-table')?.lastElementChild); // get the table body object
  tableBodyObject.innerHTML = '\n'; // set the table body object's innerHTML to an empty string
}

export async function updateSearchInput() {
  // get the new input
  const searchInput = (<HTMLInputElement>document.getElementById('searchInput'))!.value; // Also note the casting to HTMLInputElement, bc HTMLElement doesn't have the `value` field.
  // call search function in API library created by Sena
  // would also catch errors
    // let entityList = search(searchInput);
  let entityList = await window.requestRPC.procedure('search', [searchInput]);
  
  let entityClassList = (entityList as searchResult[]).map((member) => { 
    if ((member as searchResult).cik !== undefined && (member as searchResult).entity !== undefined) { //type guard
      return new WhateverFiling(member.cik, member.entity);
    }
  });
  console.log(entityClassList);
  console.log('searched');

  // potentially a for loop? unsure how to convert python dictionaries to javascript
  // update dropdown
    // UI feature to be implemented later?
}



// document.getElementById("clickyButton").addEventListener("click", updateSearchInput);
let cb = document.getElementById('clickyButton');
if(cb !== null) {
  cb.addEventListener('click', updateSearchInput);
}

let sb = document.getElementById('searchButton');
if(sb !== null) {
  sb.addEventListener('click', retrieveInfo);
}