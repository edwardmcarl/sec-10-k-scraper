import logo from '../img/logo.svg';
import FracTrac_logo from '../img/2021-FracTracker-logo.png';
import info_circle from '../img/info-circle.png';
import '../css/App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.min.js';
import React from 'react';
import {useState, useEffect, useRef} from 'react';
import {Button, Col, Container, Dropdown, Row, FormControl, FormCheck, FormGroup, Table, ListGroup, ListGroupItem, Spinner, Offcanvas, OffcanvasHeader, OffcanvasBody, OffcanvasTitle, Alert, Image, Modal, ModalBody, ModalHeader, ModalTitle } from 'react-bootstrap';
import DatePicker from 'react-date-picker';


//Done to make testing possible with react$ in ui/test/specs
const DropdownToggle = Dropdown.Toggle;
const DropdownMenu = Dropdown.Menu;
const DropdownItem = Dropdown.Item;
  
/**
 * @description class that holds result information to be displayed in dropdown
 * @params cik: string, name: string
 */
class Result {
  cik: string; // cik number
  name: string; // name of result
  constructor(cikIn: string, nameIn: string){
    this.cik = cikIn;
    this.name = nameIn;
  }
}

/**
 * @description enumeration of filing states at different stages of the process
 * @params QUEUED: string, PROCESSING: string, COMPLETE: string, ERROR: string
 */
enum DocumentState {
  SEARCH = 1,
  IN_QUEUE,
  IN_PROGRESS,
  DONE,
}

/**
 * @description class that holds filing information to be displayed in results table
 * @params entityName: string, cikNumber: string, filingType: string, filingDate: string, documentAddress10k: string, stateOfIncorporation: string, ein: string, hqAddress: AddressData, status: DocumentState 
 */
class Filing {
  entityName: string; // name of entity
  cikNumber: string; // cik number
  filingType: string; // type of filing
  filingDate: string; // filing date
  documentAddress10k: string; // document address for 10-K
  extractInfo: boolean; // true/false if user wants to extract info from 10-K
  stateOfIncorporation: string; // state of incorporation
  ein: string; // ein
  hqAddress: AddressData; // address of headquarters
  status: DocumentState; // status of the current document

  constructor(entityNameIn: string, cikNumberIn: string, filingTypeIn: string, filingDateIn: string, documentAddress10kIn: string, extractInfoIn: boolean, stateOfIncorporationIn: string, einIn: string, addressIn: AddressData, statusIn: DocumentState) {
    this.entityName = entityNameIn;
    this.cikNumber = cikNumberIn;
    this.filingType = filingTypeIn;
    this.filingDate = filingDateIn;
    this.documentAddress10k = documentAddress10kIn;
    this.extractInfo = extractInfoIn;
    this.stateOfIncorporation = stateOfIncorporationIn;
    this.ein = einIn;
    this.hqAddress = addressIn;
    this.status = statusIn;
  }
}

/**
 * @description class that holds error data to be displayed in error popup
 * @params errorText: string, showAlert: boolean
 */
class AlertData {
  errorText: string; // text in alert popup
  showAlert: boolean; // should the alert show or not
  constructor(errorTextIn: string, showAlertIn: boolean) {
    this.errorText = errorTextIn;
    this.showAlert = showAlertIn;
  }
}

/**
 * @description interface that holds data for each row for the results table
 * @params filings: Filing, isQueued: boolean, addFilingToQueue: (filing: Filing) => void, removeFilingFromQueue: (filing: Filing) => void
 */
interface ResultsRowProps {
  filing: Filing; // filing linked to the row
  isQueued: boolean; // is the filing in the queue
  addFilingToQueue:(filing: Filing)=> void; // add the linked filing to queue
  removeFilingFromQueue:(filing: Filing)=> void; // remove the linked filing from queue
} 

/**
 * @description interface that holds data for each row for the queue table
 * @params filing: Filing, status: DocumentState, addToQueue: (filing: Filing) => void, removeFromQueue: (filing: Filing) => void, disabled: boolean
 */
interface QueueRowProps {
  filing: Filing; // filing linked in queue row
  status: DocumentState; // status of the filing false if in queue, true if extracted
  addToQueue:(filing: Filing)=> void; // add the linked filing to queue
  removeFromQueue:(filing: Filing)=> void; // remove the linked filing from queue
  disabled: boolean; //true if button should be disabled
}

/**
 * @description interface that holds the address data for filings
 * @params street1: string, street2: string, city: string, stateOrCountry: string, zipCode: string, stateOrCountryDescription: string
 */
interface AddressData { 
  street1: string; // street 1
  street2: string; // street 2
  city: string; // city
  stateOrCountry: string; // state or country
  zipCode: string; // zip code
  stateOrCountryDescription: string; // state or country description
}

/**
 * @description interface that holds the data for the filing search
 * @params reportDate: string, filingDate: string, document: string, form: string, isXBRL: number, isInlineXBRL: number
 */
interface FilingData { // data for the filing
  reportDate: string; // report date
  filingDate: string; // filing date
  document: string; // document
  form: string; // form
  isXBRL: number; // if it's xbrl
  isInlineXBRL: number; // if it's inline xbrl
}

/**
 * @description interface that holds the data additional address data
 * @params mailing: AddressData, business: AddressData
 */
interface BulkAddressData { // data for a bulk address
  mailing: AddressData; // mailing address
  business: AddressData; // business address
}

/**
 * @description interface that holds the data for the form data
 * @params cik: string, issuing_entity: string, state_of_incorporation: string, ein: string, forms: Array<string>, address: BulkAddressData, filings: Array<FilingData>
 */
interface FormData { // data for the form
  cik: string; // cik number
  issuing_entity: string; // issuing entity name
  state_of_incorporation: string; // state of incorporation
  ein: string; // ein
  forms: Array<string>; // array of forms
  address: BulkAddressData; // address
  filings: Array<FilingData>; // array of filings
}

/**
 * @description interface that holds the state of backend
 * @params state: JobState, error: any
 */
interface BackendState{
  'state': JobState, // specifies step of the process for a job
  'error' : string | null // error message if any
}

/**
 * @description enumeration of the states of jobs
 * @params NO_WORK, WORKING, COMPLETE, ERROR
 */
enum JobState {
  NO_WORK = 'No Work', // job is not working
  WORKING = 'Working', // job is working
  COMPLETE = 'Complete', // job is complete
  ERROR = 'Error' // job has an error
}

/**
 * @description interface that holds information for a search result
 * @params cik: string, entity: string
 */
interface searchResult {
  cik: string, // cik number
  entity: string // entity name
}

/**
 * @description function that returns a row for the results table with Filing information populated, also handles if user adds specific filing to queue or removes it from queue
 * @param props: ResultsRowProps
 * @returns HTML for a results table row with Filing information populated
 */
function ResultsRow(props: ResultsRowProps) {
  const handleInfoClick = () => { // handle info click
    if (props.isQueued) { // if filing is in queue
      props.removeFilingFromQueue(props.filing); // remove from queue
    } else {
      props.addFilingToQueue(props.filing); // add to queue
    }
  };
  const getButtonText = () => { // get button text
    return props.isQueued ? 'Remove from Queue': 'Add to Queue'; // if filing is in queue, remove from queue, else add to queue
  };
  const getButtonColorScheme = () => { // get button color scheme
    return props.isQueued ? 'danger': 'primary'; // if filing is in queue, remove from queue, else add to queue
  };
  return ( // return the row
    <tr>
      <td>{props.filing.entityName}</td>
      <td>{props.filing.cikNumber}</td>
      <td>{props.filing.filingType}</td>
      <td>{props.filing.filingDate}</td>
      <td>{props.filing.documentAddress10k}</td>
      <td align="center">
        <Button variant={getButtonColorScheme()} onClick={(event) => {handleInfoClick();}}>{getButtonText()}</Button>
      </td>
    </tr>
  );
}

/**
 * @description function that returns a row for the queue table with Filing information populated, also handles user removing filing from queue
 * @param props : QueueRowProps
 * @returns HTML for a queue table row with Filing information populated
 */
function QueueRow(props: QueueRowProps) {
  const handleRemoveClick = () => { // handle remove click
    props.removeFromQueue(props.filing); // remove from queue
  };

  return (  // return the row
    <tr>
      <td>{props.filing.entityName}</td>
      <td>{props.filing.cikNumber}</td>
      <td>{props.filing.filingType}</td>
      <td>{props.filing.filingDate}</td>
      <td align="center">
        <Button variant="danger" disabled = {props.disabled} onClick={(event) => {handleRemoveClick();}}>Remove From Queue</Button>
      </td>
    </tr>
  );
}

/**
 * @description function that builds an alert message for search results
 * @param props: AlertData
 * @returns HTML for an alert message with alert message information displayed
 */
function EmptySearchAlert(props: AlertData) { 
  if (props.showAlert) { // if alert should show
    return ( // return the alert
      <Alert variant="danger">
        <p>
          {props.errorText}
        </p>
      </Alert>
    );
  }
  return (<text></text>); // return nothing
}

/**
 * @description function that builds an alert message for queue
 * @param props: AlertData
 * @returns HTML for an alert message with alert message information displayed
 */
function EmptySearchAlertQueue(props: AlertData) {
  if (props.showAlert) { // if alert should show
    return ( // return the alert
      <Alert variant="danger">
        <p>
          {props.errorText}
        </p>
      </Alert>
    );
  }
  return (<text></text>); // return nothing
}

/**
 * @description function that helps search for entities as user types
 * @param input: string
 * @returns class list for search results
 */
async function executeEntitySearch(input: string): Promise<Result[]> {
  const searchInput = input; // get the new input;
  const entityList: searchResult[] = await window.requestRPC.procedure('search', [searchInput]); // call search function in API library created by Sena
  const entityClassList = (entityList).map((member) => {  // convert entityList to usable form
    return new Result(member.cik, member.entity);
  });
  return entityClassList;
}

/**
 * @description function that helps update suggested forms as user inputs
 * @param cik: string
 * @param formType: string
 * @param startDate: string
 * @param endDate: string
 * @returns map of filings
 */
async function executeFormSearch(cik: string, formType: string, startDate: string, endDate: string): Promise<Filing [] | null> {
  let filingResults: FormData | null = await window.requestRPC.procedure('search_form_info', [cik, [formType], startDate, endDate]);
  if (filingResults === null) { // if filingResults is not null
    return null;
  }else{
    return filingResults.filings.map((filing) => new Filing(filingResults!.issuing_entity, filingResults!.cik, formType, filing.filingDate, filing.document, false, filingResults!.state_of_incorporation, filingResults!.ein, filingResults!.address.business, DocumentState.SEARCH)); // create filing rows
  }
}

/**
 * @description function that holds entire application
 * @returns application
 */
function App() {
  
  // for searching entities
  const [results, setResults] = useState([]); // holds search results
  const [isLoading, setIsLoading] = useState(false); // holds if search is loading
  const [name, setName] = useState(''); // holds search input
  const [isNameSelected, setIsNameSelected] = useState(false); // holds if search input is selected
  
  // For queue/canvas
  const [show, setShow] = useState(false); // holds if queue is shown
  const handleClose = () => setShow(false); // handle close
  const [allowedToExtract, setAllowedToExtract] = useState(false); // button for extract
  const [mostRecentJobErrorMessage, setMostRecentJobErrorMessage] = useState<string | null>(null);

  const handleShow = () => { // handle to show offcanvas
    if (path !== '' && queueFilingMap.size > 0) {
      setAllowedToExtract(true);
    }
    clearOffcanvasAlertMap();
    setShow(true);
  };

  // Date handling
  let oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  let currentDate = new Date();
  let defaultForm = '10-K'; // If toggle not chosen, defaults to 10-K

  //App startup state
  const [startDate, setStartDate] = useState(oneYearAgo); // holds start date
  const [endDate, setEndDate ] = useState(currentDate); // holds end date
  //setStartDate, setEndState and setFormType does not trigger a change that warrants a rerender.
  //Using mutable objects to maintain value of these three before setting them during rerender in updateSuggestedForms
  let startDateMutable = useRef<Date>(startDate);
  let endDateMutable = useRef<Date>(endDate);
  let formTypeMutable = useRef<string>(defaultForm);
  const [filingResultList, setFilingResultList] = useState<Filing[]>([]); // input data from API

  //Map that essentially acts as a Set, to track what filings are in the list
  const [queueFilingMap, setQueueFilingMap] = useState(new Map<string,Filing>()); // "queue of filings"

  // Dropdown menu setup
  const [formType, setFormType] = useState(defaultForm);

  // Alerts setup
  const [alertMessageSearchMap, setAlertMessageSearchMap] = useState(new Map<string, AlertData>()); // holds alert messages for search
  const [alertMessageOffcanvasMap, setAlertMessageOffcanvasMap] = useState(new Map<string, AlertData>()); // holds alert messages for offcanvas

  // Queue drawer setup
  const [performNER, setPerformNER] = useState(false); // check box for NER changes this value
  const [smShow, setSmShow] = useState(false); // shows popup for input file
  const [path, setPath] = useState(''); // path for download] # await window.desktopPath.getDesktopPath()
  const [spinnerOn, setSpinnerOn] = useState(true); // spinner for download
  
  // Entity search and result setup
  let result = useRef<Result>(new Result('', ''));
  let entitySuggestionEventQueue = useRef<string[]>([]);
  let entitySuggestionHandlingOngoing = useRef<boolean>(false);
  let searchEventQueue = useRef<(() => void)[]>([]);
  let searchEventHandlingOngoing = useRef<boolean>(false);
  
  // Setting up a default path to user's desktop
  useEffect(()=> {
    const setPathToDesktop = async () => {
      setPath(await window.desktopPath.getDesktopPath());
    };
    setPathToDesktop().catch(console.log);
  }, []); // empty list as second argument means that it only triggers once, on component mount. Acts like a 'default'

  // Periodically poll the state of the backend
  useEffect(()=> {
    const timer = setInterval(()=>{
      pollJobState();
    }, 1000); //poll every second
    return ()=> clearInterval(timer);
  });

  // Add a new filing to the queue map
  const addQueueFilingToMap = (f: Filing) => {
   let newQueueFilingMap = new Map<string,Filing>(queueFilingMap); // create a new map copying the old queue
   f.status = DocumentState.IN_QUEUE; // set filing to in queue
   newQueueFilingMap.set(f.documentAddress10k, f); // add filing to map queue
   setQueueFilingMap(newQueueFilingMap);  // update the map queue
  };

  // Remove a filing from the queue map
  const removeQueueFilingFromMap = (f: Filing) => { // remove filing from queue
    let newQueueFilingMap = new Map<string,Filing>(queueFilingMap); // create a new map copying the old queue
    newQueueFilingMap.delete(f.documentAddress10k); // remove filing from map queue
    setQueueFilingMap(newQueueFilingMap); // update the map queue
    if (queueFilingMap.size < 1) {
      setAllowedToExtract(false);
    }
  };

  // Add a search alert to the alert map to be displayed
  const addSearchAlertToAlertMap = (alert: AlertData) => { // add alert to alert map
    let newAlertMap = new Map<string, AlertData>(alertMessageSearchMap); // create a new map copying the old alert map
    newAlertMap.set(alert.errorText, alert); // add alert to map
    setAlertMessageSearchMap(newAlertMap); // update the map
  };

  // Clear the alert map for search
  const clearSearchAlertMap = () => { // clear alert map
    setAlertMessageSearchMap(new Map<string, AlertData>()); // update the map
  };

  // Add a offcanvas alert to the alert map to be displayed
  const addOffcanvasAlertToAlertMap = (alert: AlertData) => { // add alert to alert map
    let newAlertMap = new Map<string,AlertData>(alertMessageOffcanvasMap); // create a new map copying the old alert map
    if (!newAlertMap.has(alert.errorText)) { // if alert doesn't exists
      newAlertMap.set(alert.errorText, alert); // add alert to map alert
      setAlertMessageOffcanvasMap(newAlertMap); // update the map alert
    }
  };

  // Clear the alert map for offcanvas
  const clearOffcanvasAlertMap = () => { // remove alert from alert map
    setAlertMessageOffcanvasMap(new Map<string,AlertData>()); // update the map alert
  };

  const returnTimezoneISOFormat: (date: Date) => string = (date: Date) => {
    return `${date.getFullYear()}-`+
      `${date.getMonth() + 1 >= 10 ? date.getMonth() + 1 : '0' + (date.getMonth() + 1)}-`+
      `${date.getDate() >= 10 ? date.getDate() : '0' + date.getDate()}`; // get date in ISO format
  };

  // Update the suggested forms dropdown
  const updateSuggestedForms = () => {
    clearSearchAlertMap(); // clear alert map
    //Set next start date, end date, form type and filing result list even though it does not cause a rerender
    //It will be caused later when all search events are done
    setStartDate(startDateMutable.current);
    setEndDate(endDateMutable.current);
    setFormType(formTypeMutable.current);
    setFilingResultList([]);

    let startDateISO = returnTimezoneISOFormat(startDateMutable.current); // get start date in ISO format
    let endDateISO = returnTimezoneISOFormat(endDateMutable.current);// get end date in ISO format
    executeFormSearch(result.current.cik, formTypeMutable.current, startDateISO, endDateISO)
    .then((results) => {
      let errorMessage: AlertData| null = null;
      if (!results) { //Not likely that the form will never be added to search but let us still handle that
        errorMessage = new AlertData('No form is selected', true); // create error message for empty search
      }else if (results.length === 0){
        errorMessage = new AlertData('No filings found', true); // create error message for empty search
      }else{
        setFilingResultList(results);
      }
      if (errorMessage){
        addSearchAlertToAlertMap(errorMessage); // set alert message
      }
    })
    .catch((error) => { // handle error
      let strError = error.message;
      strError = strError.split(':').pop();
      let errorMessage: AlertData = new AlertData(strError, true); // create error message for empty search
      addSearchAlertToAlertMap(errorMessage); // set alert message
    }).finally(() => {
      processSearchEventQueueRequests();
    });
  };

  
  const handleSuggestedFormsUpdate: () => void = () => {
    searchEventQueue.current.push(updateSuggestedForms);
    if (!searchEventHandlingOngoing.current){
      processSearchEventQueueRequests();
    }
  };

  const handleSearchClick = () => { // Triggers when search button is clicked
    handleSuggestedFormsUpdate();
  };

  const handleFormDropdownClick = (e: any) => { // Triggers when form dropdown is clicked
    formTypeMutable.current = e; // set form type to the selected form
    handleSuggestedFormsUpdate();
  };

  const handleNERCheck = () => { // Triggers when NER checkbox is clicked
    if (path !== '' && queueFilingMap.size > 0) {
      setAllowedToExtract(true);
    }
    setPerformNER(!performNER); // set performNER to the opposite of what it was
  };

  const handleExtractInfoClick = async () => { // Triggers when extract info button is clicked
    setSpinnerOn(true);
    if (queueFilingMap.size < 1) {
      let errorMessage: AlertData = new AlertData('No filings in queue', true); // create error message for empty search
      addOffcanvasAlertToAlertMap(errorMessage); // set alert message
    } else {
      for (let filing of queueFilingMap) {
        filing[1].status = DocumentState.IN_PROGRESS;
      }
    }
    await window.requestRPC.procedure('process_filing_set', [Array.from(queueFilingMap.values()), path, performNER]);

  };

  const pollJobState = async () => { // Triggers every second
    let backendState: BackendState = await window.requestRPC.procedure('get_job_state');
    setSpinnerOn(backendState.state === JobState.WORKING);
    
    // Since the backend will halt a job on its first uncaught exception, there's only ever a single error
    // message to consider from it. Thus, we dedicate a key in the off-canvas alert map to this: 'backend_job_error'.
    let newAlertMap = new Map<string, AlertData>(alertMessageOffcanvasMap);
    if (backendState.error === null){
      newAlertMap.delete('backend_job_error');
    } else {
      newAlertMap.set('backend_job_error', new AlertData(backendState.error, true));
    }
    setAlertMessageOffcanvasMap(newAlertMap);
  };

  const handleOutputPath = async () => {
    let pathInput:string[] | undefined = await window.pathSelector.pathSelectorWindow();
    if (pathInput !== undefined) {
      let inputPath = pathInput[0];
      setPath(inputPath);
      if (queueFilingMap.size > 0) {
        setAllowedToExtract(true);
      }
    }
    else if ( pathInput === undefined && path === '') {
      let errorMessage: AlertData = new AlertData('No path selected', true); // create error message for empty search
      addOffcanvasAlertToAlertMap(errorMessage); // set alert message
    }
  };
  
  const handleInputChange = (e: any) => { // Triggers when search bar is changed
    /*
    This event handling is done with a queue.
    Multiple requests were getting sent and some updates were slow
    hence the results of a trigger made few seconds ago will erase 
    a trigger soon after that.
    
    This queue ensures all requests are executed and completed in order.
    */
    setName(e.target.value); // set the new input
    // even if we've selected already an item from the list, we should reset it since it's been changed
    setIsNameSelected(false);
    entitySuggestionEventQueue.current.push(e.target.value);
    if (!entitySuggestionHandlingOngoing.current){//Check if the queue is currently being processed
      processEntitySuggestionEventQueueRequests(); //Process queue if not
    }
  };

  const processEntitySuggestionEventQueueRequests = () => { // Process the queue
    while (entitySuggestionEventQueue.current.length > 1) entitySuggestionEventQueue.current.shift();
    processEntitySuggestionEventQueueRequestsRecursive(entitySuggestionEventQueue.current.shift());
  };

  const processSearchEventQueueRequests = () => { // Processes all search event requests
    while (searchEventQueue.current.length > 1) searchEventQueue.current.shift();
    processSearchEventQueueRequestsRecursive(searchEventQueue.current.shift());
  };

  const processEntitySuggestionEventQueueRequestsRecursive = (nameValue: string| undefined) => {
    if (nameValue === undefined){ //End of queue
      //Signal processing is done
      entitySuggestionHandlingOngoing.current = false;
      return;
    }
    entitySuggestionHandlingOngoing.current = true; //Signal process is now ongoing
    clearSearchAlertMap(); //Clear offcanvas alert map
    setResults([]); // clean previous results
    if (nameValue.length > 1) { // if the input is more than 1 character
      setIsLoading(true); // set loading to true
      executeEntitySearch(nameValue)  // get the results
        .then((res) => {
          setResults(res as React.SetStateAction<never[]>); // set the results
          setIsLoading(false); // set loading to false
        })
        .catch((error) => {
          // error bubble
          let strError = error.message;
          strError = strError.split(':').pop();
          let errorMessage: AlertData = new AlertData(strError, true); // create error message for empty search
          addSearchAlertToAlertMap(errorMessage); // set alert message
          // loading spinner
          setIsLoading(false);
        })
        .finally(()=>{
          processEntitySuggestionEventQueueRequests(); //Process next requests after promise
        });
    }
    else {
      processEntitySuggestionEventQueueRequests();
    }
  };

  const processSearchEventQueueRequestsRecursive = (eventFunc: (() => void) | undefined) => {
    if (eventFunc === undefined){
      searchEventHandlingOngoing.current = false;
      return;
    }
    searchEventHandlingOngoing.current = true;
    eventFunc();
  };

  const onNameSelected = (selectedResult: Result) => { // Triggers when an item is selected from the dropdown
    // user clicks the little box with the appropriate entity
    // save information about selected entity
    setName(selectedResult.name); // set the new input
    result.current = selectedResult; // set the new input
    setIsNameSelected(true); // set the new input
    setResults([]); // clean previous results
    handleSuggestedFormsUpdate();
  };

  const onStartDateChange = (e: any) => { // Triggers when Start Date input is changed
    startDateMutable.current = e;
    handleSuggestedFormsUpdate();
  };

  const onEndDateChange = (e: any) => { // Triggers when End Date input is changed
    endDateMutable.current = e;
    handleSuggestedFormsUpdate();
  };

  // https://www.pluralsight.com/guides/how-to-use-a-simple-form-submit-with-files-in-react
  // https://thewebdev.info/2021/11/26/how-to-read-a-text-file-in-react/
  // https://www.youtube.com/watch?v=-AR-6X_98rM&ab_channel=KyleRobinsonYoung
  const handleFileUpload = async (e: any) => { // Triggers when a file is uploaded; processes file, adds filings to queue
    e.preventDefault();
    const reader: FileReader = new FileReader();
    reader.onload = async (e: ProgressEvent<FileReader>) => {
      if (e !== null && e.target !== null && e.target.result !== null && !(e.target.result instanceof ArrayBuffer)){
        // e.target is a FileReader
        let res: string = e.target.result;
        // put all of the words into arrays, with white space trimmed
        const lines: string[][] = res.split('\n').map(function (line) {
          return line.split(' ').map(function (word) {
            return word.trim();
          });
        });
        let newQueueFilingMap = new Map<string,Filing>(queueFilingMap);
        for (let i = 0; i < lines.length; i++){ // iterate through all lines
          if (lines[i][0] !== null && lines[i][1] !== null && lines[i][2] !== null) { // check if line has at least 3 words
            let type = '10-K';
            try {
              // get filings from backend
              let filingResults:FormData | null = await window.requestRPC.procedure('search_form_info', [lines[i][0], [type], lines[i][1], lines[i][2]]);
              if (filingResults !== null) {
                let filingRows = filingResults.filings.map((filing) => new Filing(filingResults!.issuing_entity, filingResults!.cik, type, filing.filingDate, filing.document, false, filingResults!.state_of_incorporation, filingResults!.ein, filingResults!.address.business, DocumentState.SEARCH));
                for (let ind = 0; ind < filingRows.length; ind++){ // add all filings to the queue
                  addQueueFilingToMap(filingRows[ind]);
                  newQueueFilingMap = new Map<string,Filing>(newQueueFilingMap);
                  newQueueFilingMap.set(filingRows[ind].documentAddress10k, filingRows[ind]);
                }
              }
            }
            catch(error: any){
              // add error to Alert Map
              let strError = error.message;
              strError = strError.split(':').pop();
              strError = 'Line ' + (i + 1) + ': ' + strError;
              let errorMessage: AlertData = new AlertData(strError, true); // create error message for empty search
              addSearchAlertToAlertMap(errorMessage); // set alert message
          }
        }
          else { // 
            let strError = 'You need to put in a CIK and a start date and an end date for line ' + (i + 1);
            let errorMessage: AlertData = new AlertData(strError, true); // create error message for empty search
            addSearchAlertToAlertMap(errorMessage); // set alert message

          }
        }
        setQueueFilingMap(newQueueFilingMap);
      }
    };
    reader.readAsText(e.target.files[0]);
  };

  return (
  <div> {/* Outer div */}
  
  {/* Title / header*/}
    <Container>
      <Row>
        <Col md={12}>
        <img src={FracTrac_logo} alt="" height="150" width="auto"></img>  
        <h1>SEC EDGAR 10-K Information Access</h1>
        </Col>
      </Row>
    </Container>

    {/* Search Bar */}
    <Container>
      <FormGroup className="typeahead-form-group mb-3">
        <FormControl
          placeholder="Entity/CIK"
          id="searchInput"
          type="text"
          autoComplete="off"
          onChange={handleInputChange}
          value={name}
        />
        <ListGroup className="typeahead-list-group">
          {!isNameSelected &&
            results.length > 0 &&
            results.map((result: Result) => (
              <ListGroupItem
                key={result.cik}
                className="typeahead-list-group-item"
                onClick={() => onNameSelected(result)}
              >
                {result.cik + ' | ' + result.name}
              </ListGroupItem>
            ))}
          {!results.length && isLoading && (
            <div className="typeahead-spinner-container">
              <Spinner animation="border" />
            </div>
          )}
        </ListGroup>
      </FormGroup>
    </Container>

    {/* Start and End Dates*/}
    <Container>
      <Row className="mb-3">
        <Col>
          <text>Start Date: </text>
          <DatePicker onChange={onStartDateChange} value={startDate}/>
        </Col>
        <Col>
          <text>End Date: </text>
          <DatePicker onChange={onEndDateChange} value={endDate} />
        </Col>
        <Col className='input-group'>
          <text>Form Type:&nbsp;&nbsp;&nbsp;</text>
          <Dropdown onSelect={handleFormDropdownClick}>
            <DropdownToggle variant="secondary" id="form-dropdown">
              {formType}
            </DropdownToggle>
            <DropdownMenu>
              <DropdownItem eventKey='10-K'>10-K</DropdownItem>
              <DropdownItem eventKey='10-Q'>10-Q</DropdownItem>
              <DropdownItem eventKey='20-F'>20-F</DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </Col>
      </Row>
    </Container>

    {/* Choose File */}
    <Container>
      <Row className="mb-3">
          <Col>
            <label htmlFor="fileUpload">Read from file (.txt):</label>
            <Button
                variant="light"
                onClick={() => setSmShow(true)}
                className="d-inline-flex align-items-center"
              >
                <Image
                  roundedCircle
                  src={info_circle}
                />
              </Button>
            <Modal
              size="lg"
              show={smShow}
              onHide={() => setSmShow(false)}
              aria-labelledby="example-modal-sizes-title-sm"
            >     
            <ModalHeader closeButton>
              <ModalTitle id="example-modal-sizes-title-sm">
                File Upload Setup
              </ModalTitle>
            </ModalHeader>
            <ModalBody>
              Included in text document: 
              <br/>
              <br/>
              [CIK] [START_DATE] [END_DATE]
              <br/>
              [CIK] [START_DATE] [END_DATE]
              <br/>
              <br/>
              * Dates are in ISO format (YYYY-MM-DD)
            </ModalBody>         
            </Modal>
          </Col>
        </Row>
        <Row className="mb-3">
          <Col>
            <form>
              <input type="file" id="fileUpload" accept=".txt" onChange={handleFileUpload}/>
            </form>
          </Col>
        </Row>
    </Container>
  
    {/* Search Button */}
    <Container id="SearchButton">
      <Row className="mb-3">
        <Col>
          <Button variant="primary" id="search-button" onClick={handleSearchClick}>Search</Button>
        </Col>
      </Row>
    </Container>

    {/* Error Message */}
    <Container id="errorDiv">
      <Row className="mb-3">
        <Col>
            {Array.from(alertMessageSearchMap.values()).map((alertMessage) => (
              <EmptySearchAlert key = {alertMessage.errorText} errorText={alertMessage.errorText} showAlert={alertMessage.showAlert} ></EmptySearchAlert>
            ))}
        </Col>
      </Row>
    </Container>

    {/* Table */}
    <Container>
      <Row>
        <Col>
          <Table striped bordered hover id="results-table" table-layout="fixed">
            <thead>
              <tr>
                <th>Entity Name</th>
                <th>CIK Number</th>
                <th>Form Type</th>
                <th>Filing Date</th>
                <th>Link to Document</th>
                <th>Extract Info?</th>
              </tr>
            </thead>
            <tbody>
              {filingResultList.map((filing) => (
                <ResultsRow 
                key = {filing.documentAddress10k} 
                filing={filing} 
                isQueued={queueFilingMap.has(filing.documentAddress10k)} 
                addFilingToQueue={addQueueFilingToMap} 
                removeFilingFromQueue={removeQueueFilingFromMap}
                ></ResultsRow>
              ))}
            </tbody>
          </Table>
        </Col>
      </Row>
    </Container>

    {/* Show Queue Button */}
    <Container>
      <Row className="mb-3">
        <Col>
          <Button variant="primary" onClick={handleShow}>Show Queue</Button>
        </Col>
      </Row>
    </Container>

    {/* Queue drawer/canvas */}
    <Offcanvas show={show} onHide={handleClose} placement='end' width='99%'>
      <OffcanvasHeader closeButton>
        <OffcanvasTitle>Queue</OffcanvasTitle>
      </OffcanvasHeader>
      <OffcanvasBody>
        <Row className="mb-3">
          {/* Path Button */}
          <Col>
            <Button variant="secondary" disabled = {spinnerOn} onClick={handleOutputPath}>Choose Path for Download</Button>{' '}
          </Col>
        </Row>
        {/* Display Path */}
        <Row className="mb-3">
          <text>{path}</text>
        </Row>
        <Row className="mb-3">
          <Col>
            {Array.from(alertMessageOffcanvasMap.values()).map((alertMessage) => (
              <EmptySearchAlertQueue key = {alertMessage.errorText} errorText={alertMessage.errorText} showAlert={alertMessage.showAlert} ></EmptySearchAlertQueue>
            ))}
          </Col>
        </Row>
        {/* NER Check */}
        <Row className="mb-3">
          <Col>
            <FormCheck id = "NERCheck" disabled = {spinnerOn} type="checkbox" onChange={handleNERCheck} label="Apply Named Entity Recognition to Queue" />
          </Col>
        </Row>
        {/* Download Button */}
        <Row className="mb-3">
          <Col>
            <Button variant="primary" disabled = {!allowedToExtract} onClick={handleExtractInfoClick}>Extract & Download</Button>
          </Col>
          <Col>
            <Spinner animation="border" variant="primary" hidden={!spinnerOn}/>
          </Col>
        </Row>
        {/* Queue Table */}
        <Row className="mb-3">
          <Col> 
            <Table striped bordered hover id="queue-table" table-layout="fixed">
              <thead>
                <tr>
                  <th>Entity Name</th>
                  <th>CIK Number</th>
                  <th>Form Type</th>
                  <th>Filing Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {/* Map for displaying rows in queue table */}
                {Array.from(queueFilingMap.values()).map(((filing) => (
                  <QueueRow
                  status = {filing.status}
                  key = {filing.documentAddress10k} 
                  filing={filing} 
                  addToQueue={addQueueFilingToMap} 
                  removeFromQueue={removeQueueFilingFromMap}
                  disabled={spinnerOn}
                  ></QueueRow>
                )))}
              </tbody>
            </Table>
          </Col>
        </Row>
      </OffcanvasBody>
    </Offcanvas>
    </div>
  );
}

export default App;
