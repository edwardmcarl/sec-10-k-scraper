FILING_NAMES = ['number', 'entityName', 'cikNumber', 'filingDate', 'documentAddress10k', 'extractInfo'];

let searchFormInputs = {
  cik: "",
  forms: "",
  startDate: "",
  endDate: ""
};

// #, Entity Name, CIK Number, Filing Date, 10-K Document (link), extract info checkbox boolean
// can you set types in JavaScript???
class Filing {
  constructor(number, entityName, cikNumber, filingDate, documentAddress10k) {
    this.number = number;
    this.entityName = entityName;
    this.cikNumber = cikNumber;
    this.filingDate = filingDate;
    this.documentAddress10k = documentAddress10k;
    this.extractInfo = false;
  }

  select() {
    this.extractInfo = true;
  }

  deselect() {
    this.extractInfo = false;
  }
}

// will be used in the dropdown
class EntityPrediction {
  constructor(entityName, cikNumber) {
    this.entityName = entityName;
    this.cikNumber = cikNumber;
  }
}

// do lists exist in Javascript? unsure. if so, would have list of Filing objects here
// also a list of EntityPrediction objects

function showError() {
    let x = document.getElementById("errorDIV");
    if (x.style.display === "none") {
      x.style.display = "block";
    } else {
      x.style.display = "none";
    }
  }

function retrieveInfo() {
  let searchInput = document.getElementById("searchInput").value;
  let startDate = document.getElementById("startDate").value;
  let endDate = document.getElementById("endDate").value;
  let NERCheck = document.getElementById("NERCheck").checked;
  let fileUpload = document.getElementById("fileUpload").value;
  console.log("Search Input: " + searchInput + "\nStart Date: " + startDate + "\nEnd Date: " + endDate + "\nNER Check: " + NERCheck + "\nFile Upload: " + fileUpload);

  // sample returns from API
  let f1 = new Filing(1, 'Apple', "123456789", "10/10/2010", "10-K");
  let f2 = new Filing(2, 'Google', "987654321", "10/10/2010", "10-K");
  let f3 = new Filing(3, 'Microsoft', "123456789", "10/10/2010", "10-K");
  let f4 = new Filing(4, 'Facebook', "987654321", "10/10/2010", "10-K");
  let f5 = new Filing(5, 'Amazon', "123456789", "10/10/2010", "10-K");
  let f6 = new Filing(6, 'Twitter', "987654321", "10/10/2010", "10-K");
  let f7 = new Filing(7, 'Tesla', "123456789", "10/10/2010", "10-K");
  let f8 = new Filing(8, 'SpaceX', "987654321", "10/10/2010", "10-K");
  let f9 = new Filing(9, 'Nasa', "123456789", "10/10/2010", "10-K");
  let f10 = new Filing(10, 'IBM', "987654321", "10/10/2010", "10-K");
  var filings = [f1, f2, f3, f4, f5, f6, f7, f8, f9, f10];

  removeAllItemsFromTable();
  addItemsToTable(filings)

}

function addToQueue() {
  
}

/* functions to be called as user inputs information
 */

// impacts dropdown
function updateSearchInput() {
  // get the new input
  let searchInput = document.getElementById("searchInput").value;
  // call search function in API library created by Sena
  // would also catch errors
    // let entityList = search(searchInput);
  // potentially a for loop? unsure how to convert python dictionaries to javascript
  // update dropdown
    // UI feature to be implemented later?
}

// user has chosen an entity-CIK pair
function entitySelected() {
  // this line will contain the object of the selected entity, ent
  // just an example
  let ent = { cik: "CIK0000", entity: "Some company" };
  searchFormInputs.cik = ent.cik;
  updateResultsTable();
}

// #, Entity Name, CIK Number, Filing Date, 10-K Document (link), extract info checkbox boolean
function updateResultsTable() {
  // call search_form_info function in API library created by Sena
  // would also catch errors
    // let entity_w_filings = search_form_info(searchFormInputs.cik, searchFormInputs.forms, searchFormInputs.startDate, searchFormInputs.endDate)
    // if start date and end date are empty strings, what happens?
  // based on the list of filings, populate Filing objects
  // var 
  // var filings = entity_w_filings.filings;
  // are there for each loops in javascript? would loop through
  // check scope of variables in JavaScript; don't want these to disappear once function finishes
  // var count = 0;
  // var entity_name = entity_w_filings. some name thing
  // var cik_num = entity_w_filings.cik;
  // for loop here?
  // var curr_filing = filings[index]
  // var populated_filing = new Filing(++count, entity_name, cik_num, curr_filing.filingDate, curr_filing.document);
  // add populated_filing to some global list of populated filings
  // based on the populated Filing objects, update the results table - UI stuff
}

function updateStartDate() {
  searchFormInputs.startDate = document.getElementById("startDate").value;
  // if a cik has been selected, ie cik is not empty, undefined, null
  if(searchFormInputs.cik){
    updateResultsTable();
  }
}

function updateEndDate() {
  searchFormInputs.endDate = document.getElementById("endDate").value;
  // if a cik has been selected, ie cik is not empty, undefined, null
  if(searchFormInputs.cik){
    updateResultsTable();
  }
}

// update the results table based on the user's input
function addItemsToTable(filing_list){
  let tableBodyObject = document.getElementById('results-table').lastElementChild;
  for (let i = 0; i < filing_list.length; i++) {
      let row = tableBodyObject.insertRow();
      for (let j = 0; j < FILING_NAMES.length; j++) {
          let cell = row.insertCell();
          cell.innerText = filing_list[i][FILING_NAMES[j]];
      }
  }
}

// removes all items from the results table
function removeAllItemsFromTable(){
  let tableBodyObject = document.getElementById('results-table').lastElementChild
  tableBodyObject.innerHTML = '\n'
}

