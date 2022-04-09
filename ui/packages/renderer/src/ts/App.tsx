import logo from '../img/logo.svg';
import FracTrac_logo from '../img/2021-FracTracker-logo.png';
import info_circle from '../img/info-circle.png';
import '../css/App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.min.js';
import React from 'react';
import {useState, useEffect} from 'react';
import {Button, Col, Container, Dropdown, Row, InputGroup, FormControl, FormLabel, Table, ListGroup, Spinner, Form, Offcanvas, Alert, Image, Modal} from 'react-bootstrap';
import DatePicker from 'react-date-picker';
import { string } from 'prop-types';

// interface FilingSearchResult {
  
class Result { // result
  cik: string; // cik number
  name: string; // name of result
  constructor(cikIn: string, nameIn: string){
    this.cik = cikIn;
    this.name = nameIn;
  }
}

// }

// for user inputs through file uploads
// assuming only 10-K to start
class UserInput {
  // CIK of entity
  cik: string;
  // year of filings
  year: string;
  constructor(cikIn: string, yearIn: string){
    this.cik = cikIn;
    this.year = yearIn;
  }
}

class Filing { // filing info
  entityName: string; // name of entity
  cikNumber: string; // cik number
  filingType: string; // type of filing
  filingDate: string; // filing date
  documentAddress10k: string; // document address for 10-K
  extractInfo: boolean; // true/false if user wants to extract info from 10-K
  constructor(entityNameIn: string, cikNumberIn: string, filingTypeIn: string, filingDateIn: string, documentAddress10kIn: string, extractInfoIn: boolean) {
    this.entityName = entityNameIn;
    this.cikNumber = cikNumberIn;
    this.filingType = filingTypeIn;
    this.filingDate = filingDateIn;
    this.documentAddress10k = documentAddress10kIn;
    this.extractInfo = extractInfoIn;
  }
}

class AlertData { // Help with the alert handling
  errorText: string; // text in alert popup
  showAlert: boolean; // should the alert show or not
  constructor(errorTextIn: string, showAlertIn: boolean) {
    this.errorText = errorTextIn;
    this.showAlert = showAlertIn;
  }
}

interface ResultsRowProps { // props for the results row
  filing: Filing; // filing linked to the row
  isQueued: boolean; // is the filing in the queue
  addFilingToQueue:(filing: Filing)=> void; // add the linked filing to queue
  removeFilingFromQueue:(filing: Filing)=> void; // remove the linked filing from queue
} 

interface QueueRowProps { // props for the queue row
  filing: Filing // filing linked in queue row
  addToQueue:(filing: Filing)=> void; // add the linked filing to queue
  removeFromQueue:(filing: Filing)=> void; // remove the linked filing from queue
}

interface AddressData { // data for the address
  street1: string; // street 1
  street2: string; // street 2
  city: string; // city
  stateOrCountry: string; // state or country
  zipCode: string; // zip code
  stateOrCountryDescription: string; // state or country description
}

interface FilingData { // data for the filing
  reportDate: string; // report date
  filingDate: string; // filing date
  document: string; // document
  form: string; // form
  isXBRL: number; // if it's xbrl
  isInlineXBRL: number; // if it's inline xbrl
}

interface BulkAddressData { // data for a bulk address
  mailing: AddressData; // mailing address
  business: AddressData; // business address
}

interface FormData { // data for the form
  cik: string; // cik number
  issuing_entity: string; // issuing entity name
  state_of_incorporation: string; // state of incorporation
  ein: string; // ein
  forms: Array<string>; // forms
  address: BulkAddressData; // address
  filings: Array<FilingData>; // filings
}

function ResultsRow(props: ResultsRowProps) { // row for results
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

function QueueRow(props: QueueRowProps) { // row for queue
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
        <Button variant="danger" onClick={(event) => {handleRemoveClick();}}>X</Button>
      </td>
    </tr>
  );
}

// TODO: Figure out why it takes 2 clicks to bring this up. also getting date errors
function EmptySearchAlert(props: AlertData) { // alert for empty search
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

// experimenting https://devrecipes.net/typeahead-with-react-hooks-and-bootstrap/
let dropdownData: (Result | undefined)[]; // data for the dropdown
const mockResults = (keyword: string) => { // mock results
  return new Promise((res, rej) => {
    setTimeout(() => {
      const searchResults = dropdownData;
      res(searchResults);
    }, 500);
  });
};

// type for the result of the search() Python call
interface searchResult { // type for the result of the search() Python call
  cik: string, // cik number
  entity: string // entity name
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

// called by handleInputChange, has to be async
async function updateSearchInput(input: string) {
  // get the new input
  const searchInput = input;
  // call search function in API library created by Sena
  try {
    let entityList = await window.requestRPC.procedure('search', [searchInput]);
    // convert entityList to usable form
    let entityClassList = (entityList as searchResult[]).map((member) => { 
      if ((member as searchResult).cik !== undefined && (member as searchResult).entity !== undefined) { //type guard
        return new Result(member.cik, member.entity);
      }
    });
    // update the dropdownData
    dropdownData = entityClassList;
    // for development purposes
    console.log(entityClassList);
    console.log('searched');
  } 
  catch (error) {
    console.log(error);
  }
}

function App() {
  
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState('');
  const [isNameSelected, setIsNameSelected] = useState(false);

  // adding something to store entire result
  const [result, setResult] = useState(new Result('', ''));
  
  // For queue/canvas
  const [show, setShow] = useState(false);
  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  // regularly scheduled programming
  let oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  let currentDate = new Date();
  currentDate.setUTCHours(0,1,0,0); // start of day
  const [startDate, setStartDate] = useState(oneYearAgo);
  const [endDate, setEndDate ] = useState(currentDate);
  const [filingResultList, setFilingResultList] = useState(new Array<Filing>()); // input data from API
  const [searchBarContents, setSearchBarContents] = useState('');
  //Map that essentially acts as a Set, to track what filings are in the list
  const [queueFilingMap, setQueueFilingMap] = useState(new Map<string,Filing>()); // "queue of filings"

  // Dropdown menu setup
  let defaultForm = '10-K'; // If toggle not chosen, defaults to 10-K
  const [formType, setFormType] = useState(defaultForm);

  const [alertMessage, setAlertMessage] = useState(new AlertData('', false));

  const [performNER, setPerfromNER] = useState(false); // check box for NER changes this value

  const [smShow, setSmShow] = useState(false);


  const addQueueFilingToMap = (f: Filing) => { // add filing to queue
   let newQueueFilingMap = new Map<string,Filing>(queueFilingMap); // create a new map copying the old queue
   newQueueFilingMap.set(f.documentAddress10k, f); // add filing to map queue
   setQueueFilingMap(newQueueFilingMap);  // update the map queue
  };

  const removeQueueFilingFromMap = (f: Filing) => { // remove filing from queue
    let newQueueFilingMap = new Map<string,Filing>(queueFilingMap); // create a new map copying the old queue
    newQueueFilingMap.delete(f.documentAddress10k); // remove filing from map queue
    setQueueFilingMap(newQueueFilingMap); // update the map queue
  };

  const handleSearchClick = async () => { // Triggers when search button is clicked
    setAlertMessage(new AlertData('', false)); // reset alert
    let startDateISO = startDate.toISOString().split('T')[0]; // get start date in ISO format
    let endDateISO = endDate.toISOString().split('T')[0]; // get end date in ISO format
    try {
      let filingResults:FormData | null = await window.requestRPC.procedure('search_form_info', [result.cik, [formType], startDateISO, endDateISO]); // Assuming searchBarContents is CIK Number, MUST have CIK present in search bar
      if(filingResults !== null) { // if filingResults is not null
        let filingRows = filingResults.filings.map((filing) => new Filing(filingResults!.issuing_entity, filingResults!.cik, formType, filing.filingDate, filing.document, false)); // create filing rows
        setFilingResultList(filingRows); //takes in something that is a Filing[]
      }
      if(filingResultList.length === 0) { // Checking to see if no results were found
        let errorMessage: AlertData = new AlertData('No filings found', true); // create error message for empty search
        setAlertMessage(errorMessage); // set alert message
      }
    }
    catch (error: any) {
      let strError = error.message;
      strError = strError.split(':').pop();
      let errorMessage: AlertData = new AlertData(strError, true); // create error message for empty search
      setAlertMessage(errorMessage); // set alert message
    }
  };

  const handleFormDropdownClick = (e: any) => { // Triggers when form dropdown is clicked
    setFormType(e); // set form type to the selected form
  };

  const handleNERCheck = () => { // Triggers when NER checkbox is clicked
    setPerfromNER(!performNER); // set performNER to the opposite of what it was
  };

  const handleExtractInfoClick = () => {
    // include perfromNER in the call
    console.log('NER: '+ performNER);

  };
  
  // experimenting https://devrecipes.net/typeahead-with-react-hooks-and-bootstrap/
  const handleInputChange = (e: any) => { // Triggers when search bar is changed
    const nameValue = e.target.value; // get the new input
    setName(nameValue); // set the new input
    setSearchBarContents(nameValue); // set the new input
    updateSearchInput(nameValue); // update the search input
    // even if we've selected already an item from the list, we should reset it since it's been changed
    setIsNameSelected(false);
    // clean previous results, as would be the case if we get the results from a server
    // TO DO figure out how this works. and make it better. catch errors, basically.
    setResults([]); // clean previous results
    if (nameValue.length > 1) { // if the input is more than 1 character
      setIsLoading(true); // set loading to true
      mockResults(nameValue)  // get the results
        .then((res) => { 
          setResults(res as React.SetStateAction<never[]>); // set the results
          setIsLoading(false); // set loading to false
        })
        .catch(() => {
          setIsLoading(false);
        });
    }
  };

  const onNameSelected = async (selectedResult: Result) => { // Triggers when an item is selected from the dropdown
    // user clicks the little box with the appropriate entity
    // save information about selected entity
    setName(selectedResult.name); // set the new input
    setResult(selectedResult); // set the new input
    setIsNameSelected(true); // set the new input
    setResults([]); // clean previous results
    let startDateISO = startDate.toISOString().split('T')[0];   // get start date in ISO format
    let endDateISO = endDate.toISOString().split('T')[0]; // get end date in ISO format
    try {
      let filingResults:FormData | null = await window.requestRPC.procedure('search_form_info', [selectedResult.cik, [formType], startDateISO, endDateISO]); // Assuming searchBarContents is CIK Number, MUST have CIK present in search bar
      if(filingResults !== null) { // if filingResults is not null
        let filingRows = filingResults.filings.map((filing) => new Filing(filingResults!.issuing_entity, filingResults!.cik, formType, filing.filingDate, filing.document, false)); // create filing rows
        setFilingResultList(filingRows); //takes in something that is a Filing[]
      }
    }
    catch (error: any) {
      let strError = error.message;
      strError = strError.split(':').pop();
      let errorMessage: AlertData = new AlertData(strError, true); // create error message for empty search
      setAlertMessage(errorMessage); // set alert message
    }
  };

  // https://www.pluralsight.com/guides/how-to-use-a-simple-form-submit-with-files-in-react
  // https://thewebdev.info/2021/11/26/how-to-read-a-text-file-in-react/
  // https://www.youtube.com/watch?v=-AR-6X_98rM&ab_channel=KyleRobinsonYoung
  // TODO change from e: any to e: some other thing
  // TODO error checking
  const handleFileUpload = async (e: any) => {
    e.preventDefault();
    const reader: FileReader = new FileReader();
    reader.onload = async (e: ProgressEvent<FileReader>) => {
      if(e !== null && e.target !== null && e.target.result !== null && /* e.target.result instanceof string && */ !(e.target.result instanceof ArrayBuffer)){
        // e.target is a FileReader
        let res: string = e.target.result;
        // put all of the words into arrays, with white space trimmed
        const lines: string[][] = res.split('\n').map(function (line) {
          return line.split(' ').map(function (word) {
            return word.trim();
          });
        });
        console.log(lines);
        // is this where I would close the file? certainly doesn't have to be open now. unsure.
        let newQueueFilingMap = new Map<string,Filing>(queueFilingMap);
        for(let i = 0; i < lines.length; i++){
          if(lines[i][0] !== null && lines[i][1] !== null && lines[i][2] !== null) {
            // probably need to check stuff here
            let type = '10-K';
            console.log(lines[i][0]);
            console.log(lines[i][1]);
            console.log(lines[i][2]);
            let filingResults:FormData | null = await window.requestRPC.procedure('search_form_info', [lines[i][0], [type], lines[i][1], lines[i][2]]);
            if(filingResults !== null) {
            console.log(filingResults);
              let filingRows = filingResults.filings.map((filing) => new Filing(filingResults!.issuing_entity, filingResults!.cik, type, filing.filingDate, filing.document, false));
              console.log(filingRows);
              //setFilingResultList(filingRows); //takes in something that is a Filing[]
              // this seems... messy
              for(let ind = 0; ind < filingRows.length; ind++){
                console.log(filingRows[ind]);
                addQueueFilingToMap(filingRows[ind]);
                newQueueFilingMap = new Map<string,Filing>(newQueueFilingMap);
                newQueueFilingMap.set(filingRows[ind].documentAddress10k, filingRows[ind]);
              }
            }
          }
          else {
            // This is where some error handling would happen
            console.log('You need to put in a CIK and a start date and an end date for line ' + (i + 1));
          }
        }
        setQueueFilingMap(newQueueFilingMap);
      }
      /* else if(e !== null && e.target !== null && e.target.result !== null){
        const text = e.target.result;
        console.log(text);
      } */
    };
    /* reader.onload = (e: ProgressEvent<FileReader>) => {
      if(e !== null){
        if(e.target !== null){
          const text = e.target.result;
          console.log(text);
          if(reader !== null && reader.result !== null && reader.result instanceof string) {
            const res = reader.result;
            if(res instanceof string)
            {
              const lines = res.split('\n').map(function (line) {
                return line.split(' ')
              })
            }
            const lines = reader.result.split('\n').map(function (line) {
              return line.split(' ')
            })
          }
        }
      }
    }; */
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

    {/* Search Bar Two */}
    <Container>
      <Form.Group className="typeahead-form-group mb-3">
        <Form.Control
          placeholder="Entity/CIK"
          id="searchInput"
          type="text"
          autoComplete="off"
          onChange={handleInputChange}
          value={name}
        />
        <ListGroup className="typeahead-list-group">
          {!isNameSelected &&
            results !== undefined &&
            results.length > 0 &&
            results.map((result: Result) => (
              <ListGroup.Item
                key={result.cik}
                className="typeahead-list-group-item"
                onClick={() => onNameSelected(result)}
              >
                {result.cik + ' | ' + result.name}
              </ListGroup.Item>
            ))}
          {results !== undefined && !results.length && isLoading && (
            <div className="typeahead-spinner-container">
              <Spinner animation="border" />
            </div>
          )}
        </ListGroup>
      </Form.Group>
    </Container>

    {/* Start and End Dates*/}
    <Container>
      <Row className="mb-3">
        <Col>
          <text>Start Date: </text>
          <DatePicker onChange={setStartDate} value={startDate}/>
        </Col>
        <Col>
          <form>
            <input type="file" id="fileUpload" accept=".txt" onChange={handleFileUpload}/>
          </form>
          <text>End Date: </text>
          <DatePicker onChange={setEndDate} value={endDate} />
        </Col>
        <Col className='input-group'>
          <text>Form Type:&nbsp;&nbsp;&nbsp;</text>
          <Dropdown onSelect={handleFormDropdownClick}>
            <Dropdown.Toggle variant="secondary" id="form-dropdown">
              {formType}
            </Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.Item eventKey='10-K'>10-K</Dropdown.Item>
              <Dropdown.Item eventKey='10-Q'>10-Q</Dropdown.Item>
              <Dropdown.Item eventKey='20-F'>20-F</Dropdown.Item>
            </Dropdown.Menu>
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
            <Modal.Header closeButton>
              <Modal.Title id="example-modal-sizes-title-sm">
                File Upload Setup
              </Modal.Title>
            </Modal.Header>
            <Modal.Body>
              [CIK] [START_DATE] [END_DATE]
              <br/>
              [CIK] [START_DATE] [END_DATE]
              <br/>
              <br/>
              * Dates are in ISO format (YYYY-MM-DD)
            </Modal.Body>         
            </Modal>
          </Col>
        </Row>
        <Row className="mb-3">
          <Col>
            <form>
              <input type="file" id="fileUpload" accept=".txt"/>
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
          <EmptySearchAlert errorText={alertMessage.errorText} showAlert={alertMessage.showAlert} ></EmptySearchAlert>
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
      <Offcanvas.Header closeButton>
        <Offcanvas.Title>Queue</Offcanvas.Title>
      </Offcanvas.Header>
      <Offcanvas.Body>
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
                {/* TO BE CHANGED */}
                {Array.from(queueFilingMap.values()).map(((filing) => (
                  <QueueRow 
                  key = {filing.documentAddress10k} 
                  filing={filing} 
                  addToQueue={addQueueFilingToMap} 
                  removeFromQueue={removeQueueFilingFromMap}
                  ></QueueRow>
                )))}
              </tbody>
            </Table>
          </Col>
        </Row>
        <Row className="mb-3">
          <Col>
            <Form.Check id = "NERCheck" type="checkbox" onChange={handleNERCheck} label="Apply Named Entity Recognition to Queue" />
          </Col>
        </Row>
        <Row className="mb-3">
          <Col>
            <Button variant="primary" onClick={handleExtractInfoClick}>Extract Information</Button>
          </Col>
        </Row>
      </Offcanvas.Body>
    </Offcanvas>
    </div>
  );
}

export default App;
