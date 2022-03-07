
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