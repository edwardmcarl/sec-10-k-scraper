let form = {
    // add all data from input into this object
}

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

