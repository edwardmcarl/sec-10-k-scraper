import logo from '../img/logo.svg';
import FracTrac_logo from '../img/2021-FracTracker-logo.png';
import '../css/App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.min.js';
import React from 'react';
import {useState, useEffect} from 'react';
import {Button, Col, Container, Dropdown, Row, InputGroup, FormControl, FormLabel, Table, ListGroup, Spinner, Form, Offcanvas} from 'react-bootstrap';
import DatePicker from 'react-date-picker';
import { string } from 'prop-types';

// interface FilingSearchResult {
  
class Result {
  cik: string;
  name: string;
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

class Filing {
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

interface ResultsRowProps {
  filing: Filing;
  isQueued: boolean;
  addFilingToQueue:(filing: Filing)=> void;
  removeFilingFromQueue:(filing: Filing)=> void;
} 

interface QueueRowProps {
  filing: Filing
  addToQueue:(filing: Filing)=> void;
  removeFromQueue:(filing: Filing)=> void;
}

interface AddressData {
  street1: string;
  street2: string;
  city: string;
  stateOrCountry: string;
  zipCode: string;
  stateOrCountryDescription: string;
}

interface FilingData {
  reportDate: string;
  filingDate: string;
  document: string;
  form: string;
  isXBRL: number;
  isInlineXBRL: number;
}

interface BulkAddressData {
  mailing: AddressData;
  business: AddressData;
}

interface FormData {
  cik: string;
  issuing_entity: string;
  state_of_incorporation: string;
  ein: string;
  forms: Array<string>;
  address: BulkAddressData;
  filings: Array<FilingData>;
}

function ResultsRow(props: ResultsRowProps) {
  const handleInfoClick = () => {
    if (props.isQueued) {
      props.removeFilingFromQueue(props.filing);
      console.log('REMOVED ' + props.filing.filingDate + ' FROM QUEUE');
    } else {
      props.addFilingToQueue(props.filing);
      console.log('ADDED ' + props.filing.filingDate + ' TO QUEUE');
    }
  };
  const getButtonText = () => {
    return props.isQueued ? 'Remove from Queue': 'Add to Queue'; 
  };
  const getButtonColorScheme = () => {
    return props.isQueued ? 'danger': 'primary';
  };
  return (
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

function QueueRow(props: QueueRowProps) {
  const handleRemoveClick = () => {
    props.removeFromQueue(props.filing);
  };
  return (
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

// experimenting https://devrecipes.net/typeahead-with-react-hooks-and-bootstrap/
let dropdownData: (Result | undefined)[];/* [
  { cik: '1', name: 'devrecipes.net' },
  { cik: '2', name: 'devrecipes' },
  { cik: '3', name: 'devrecipe' },
  { cik: '4', name: 'dev recipes' },
  { cik: '5', name: 'development' },
]; */

const mockResults = (keyword: string) => {
  return new Promise((res, rej) => {
    setTimeout(() => {
      const searchResults = dropdownData;
      res(searchResults);
    }, 500);
  });
};

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

// called by handleInputChange, has to be async
async function updateSearchInput(input: string) {
  // get the new input
  const searchInput = input;
  // call search function in API library created by Sena
  // TO DO would also catch errors
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

// // called by onNameSelected, has to be async
// async function selectEntity(res: Result, startDate: Date, endDate: Date){
//   // get the date strings
//   let startDateISO = startDate.toISOString().split('T')[0];
//   let endDateISO = endDate.toISOString().split('T')[0];
//   // for development purposes
//   console.log('start date: ' + startDateISO);
//   console.log('end date: ' + endDateISO);
//   // call API to get filing information for selected entity and dates
//   let filingResults = await window.requestRPC.procedure('search_form_info', [res.cik, startDateISO, endDateISO]); // Assuming searchBarContents is CIK Number
//   // for development purposes
//   console.log('selected entity');
//   console.log(filingResults);
//   // TO DO would call function to update results table below
//   let filingResults:FormData | null = await window.requestRPC.procedure('search_form_info', [searchBarContents, ['10-K'], startDateISO, endDateISO]); // Assuming searchBarContents is CIK Number, MUST have CIK present in search bar
//     if(filingResults !== null) {
//     console.log(filingResults);
//       let filingRows = filingResults.filings.map((filing) => new Filing(filingResults!.issuing_entity, filingResults!.cik, filing.filingDate, filing.document, false));
//       console.log(filingRows);
//       setFilingResultList(filingRows); //takes in something that is a Filing[]
//     }
// }

//TODO: Add the CIK and Form type to queue table and results table
//TODO: Link to form instad of 10-k doc

function App() {
  // experimenting https://devrecipes.net/typeahead-with-react-hooks-and-bootstrap/
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

  const addQueueFilingToMap = (f: Filing) => {
   let newQueueFilingMap = new Map<string,Filing>(queueFilingMap);
   newQueueFilingMap.set(f.documentAddress10k, f);
   setQueueFilingMap(newQueueFilingMap);
  };

  const removeQueueFilingFromMap = (f: Filing) => {
    let newQueueFilingMap = new Map<string,Filing>(queueFilingMap);
    newQueueFilingMap.delete(f.documentAddress10k);
    setQueueFilingMap(newQueueFilingMap);
  };

  const handleSearchClick = async () => {
    let startDateISO = startDate.toISOString().split('T')[0];
    let endDateISO = endDate.toISOString().split('T')[0];
    console.log(result.cik);
    console.log(startDateISO);
    console.log(endDateISO);
    let filingResults:FormData | null = await window.requestRPC.procedure('search_form_info', [result.cik, [formType], startDateISO, endDateISO]); // Assuming searchBarContents is CIK Number, MUST have CIK present in search bar
    if(filingResults !== null) {
    console.log(filingResults);
      let filingRows = filingResults.filings.map((filing) => new Filing(filingResults!.issuing_entity, filingResults!.cik, formType, filing.filingDate, filing.document, false));
      console.log(filingRows);
      setFilingResultList(filingRows); //takes in something that is a Filing[]
    }    
  };

  const handleFormDropdownClick = (e: any) => {
    // const formInput:string = e.target.value;
    setFormType(e);
    console.log(e);
  };

  
  // experimenting https://devrecipes.net/typeahead-with-react-hooks-and-bootstrap/
  const handleInputChange = (e: any) => {
    const nameValue = e.target.value;
    setName(nameValue);
    // adapting for senior project code
    setSearchBarContents(nameValue);
    updateSearchInput(nameValue);
    // even if we've selected already an item from the list, we should reset it since it's been changed
    setIsNameSelected(false);
    // clean previous results, as would be the case if we get the results from a server
    // TO DO figure out how this works. and make it better. catch errors, basically.
    setResults([]);
    if (nameValue.length > 1) {
      setIsLoading(true);
      mockResults(nameValue)
        .then((res) => {
          setResults(res as React.SetStateAction<never[]>);
          setIsLoading(false);
        })
        .catch(() => {
          setIsLoading(false);
        });
    }
  };

  const onNameSelected = async (selectedResult: Result) => {
    // user clicks the little box with the appropriate entity
    // save information about selected entity
    setName(selectedResult.name);
    setResult(selectedResult);
    setIsNameSelected(true);
    setResults([]);
    let startDateISO = startDate.toISOString().split('T')[0];
    let endDateISO = endDate.toISOString().split('T')[0];
    console.log(selectedResult.cik); //TODO use 'result' instead; handle timing of React updates
    console.log(startDateISO);
    console.log(endDateISO);
    let filingResults:FormData | null = await window.requestRPC.procedure('search_form_info', [selectedResult.cik, [formType], startDateISO, endDateISO]); // Assuming searchBarContents is CIK Number, MUST have CIK present in search bar
    if(filingResults !== null) {
    console.log(filingResults);
      let filingRows = filingResults.filings.map((filing) => new Filing(filingResults!.issuing_entity, filingResults!.cik, formType, filing.filingDate, filing.document, false));
      console.log(filingRows);
      setFilingResultList(filingRows); //takes in something that is a Filing[]
    }
    // call selectEntity
    //selectEntity(result, startDate, endDate);
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

  {/* Search Bar*/}
    {/* <Container>
      <InputGroup>
        <FormControl 
        placeholder="Entity/CIK"
        id="searchInput"
        onChange={(changeEvent)=>{
          let changedPropertyValue = changeEvent.target.value;
          setSearchBarContents(changedPropertyValue);
          }}
        />
      </InputGroup>
    </Container> */}

    {/* Search Bar Two (Experimenting) */}
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
    <Row>
        <Col>
          <label htmlFor="fileUpload">Read from file (.txt):</label>
        </Col>
      </Row>
      <Row>
        <Col>
          <form>
            <input type="file" id="fileUpload" accept=".txt" onChange={handleFileUpload}/>
          </form>
        </Col>
      </Row>
  </Container>

  {/* Error Message */}
  <Container id="errorDiv">
    <Row className="mb-3">
      <Col>

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
          <Form.Check id = "NERCheck" type="checkbox" label="Apply Named Entity Recognition to Queue" />
        </Col>
      </Row>
      <Row className="mb-3">
        <Col>
          <Button variant="primary" onClick={handleShow}>Extract Information</Button>
        </Col>
      </Row>
    </Offcanvas.Body>
  </Offcanvas>
  </div>
  );

}

export default App;
