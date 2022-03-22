import logo from '../img/logo.svg';
import FracTrac_logo from '../img/2021-FracTracker-logo.png';
import '../css/App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.min.js';
import React from 'react';
import {useState, useEffect} from 'react';
import {Button, Col, Container, Dropdown, Row, InputGroup, FormControl, FormLabel, Table, ListGroup, Spinner, Form} from 'react-bootstrap';
import DatePicker from 'react-date-picker';

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
class Filing {
  entityName: string; // name of entity
  cikNumber: string; // cik number
  filingDate: string; // filing date
  documentAddress10k: string; // document address for 10-K
  extractInfo: boolean; // true/false if user wants to extract info from 10-K
  constructor(entityNameIn: string, cikNumberIn: string, filingDateIn: string, documentAddress10kIn: string, extractInfoIn: boolean) {
    this.entityName = entityNameIn;
    this.cikNumber = cikNumberIn;
    this.filingDate = filingDateIn;
    this.documentAddress10k = documentAddress10kIn;
    this.extractInfo = extractInfoIn;
  }
}

interface ResultsRowProps {
  filing: Filing;
  isQueued: boolean;
  addFiling:(filing: Filing)=> void;
  removeFiling:(filing: Filing)=> void;
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
      props.removeFiling(props.filing);
    } else {
      props.addFiling(props.filing);
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
      <td>{props.filing.filingDate}</td>
      <td>{props.filing.documentAddress10k}</td>
      <td align="center">
        <Button variant={getButtonColorScheme()} onClick={(event) => {handleInfoClick();}}>{getButtonText()}</Button>
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

function App() {
  // experimenting https://devrecipes.net/typeahead-with-react-hooks-and-bootstrap/
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState('');
  const [isNameSelected, setIsNameSelected] = useState(false);
  // adding something to store entire result
  const [result, setResult] = useState(new Result('', ''));

  // regularly scheduled programming
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate ] = useState(new Date());
  const [filingResultList, setFilingResultList] = useState(new Array<Filing>()); // input data from API
  const [searchBarContents, setSearchBarContents] = useState('');
  //Map that essentially acts as a Set, to track what filings are in the list
  const [filingMap, setFilingMap] = useState(new Map<string,Filing>()); // "queue of filings"
  
  const addFilingToMap = (f: Filing) => {
   let newFilingMap = new Map<string,Filing>(filingMap);
   newFilingMap.set(f.documentAddress10k, f);
   setFilingMap(newFilingMap);
  };

  const removeFilingFromMap = (f: Filing) => {
    let newFilingMap = new Map<string,Filing>(filingMap);
    newFilingMap.delete(f.documentAddress10k);
    setFilingMap(newFilingMap);
  };

  const handleSearchClick = async () => {
    let startDateISO = startDate.toISOString().split('T')[0];
    let endDateISO = endDate.toISOString().split('T')[0];
    console.log(searchBarContents);
    console.log(startDateISO);
    console.log(endDateISO);
    let filingResults:FormData | null = await window.requestRPC.procedure('search_form_info', [searchBarContents, ['10-K'], startDateISO, endDateISO]); // Assuming searchBarContents is CIK Number, MUST have CIK present in search bar
    if(filingResults !== null) {
    console.log(filingResults);
      let filingRows = filingResults.filings.map((filing) => new Filing(filingResults!.issuing_entity, filingResults!.cik, filing.filingDate, filing.document, false));
      console.log(filingRows);
      setFilingResultList(filingRows); //takes in something that is a Filing[]
    }    
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
    console.log(selectedResult.cik);
    console.log(startDateISO);
    console.log(endDateISO);
    let filingResults:FormData | null = await window.requestRPC.procedure('search_form_info', [selectedResult.cik, ['10-K'], startDateISO, endDateISO]); // Assuming searchBarContents is CIK Number, MUST have CIK present in search bar
    if(filingResults !== null) {
    console.log(filingResults);
      let filingRows = filingResults.filings.map((filing) => new Filing(filingResults!.issuing_entity, filingResults!.cik, filing.filingDate, filing.document, false));
      console.log(filingRows);
      setFilingResultList(filingRows); //takes in something that is a Filing[]
    }
    // call selectEntity
    //selectEntity(result, startDate, endDate);
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
      <Form.Group className="typeahead-form-group">
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
    <Row>
      <Col>
      <text>Start Date:</text>
      <DatePicker onChange={setStartDate} value={startDate}/>
      </Col>
      <Col>
      <DatePicker onChange={setEndDate} value={endDate} />
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
            <input type="file" id="fileUpload" accept=".txt"/>
          </form>
        </Col>
      </Row>
    </Container>

    {/* Error Message */}
    <Container id="errorDiv">
      <Row>
        <Col>

        </Col>
      </Row>
    </Container>

    <Container id="SearchButton">
      <Row>
        <Col>
          <Button variant="primary" id="search-button" onClick={handleSearchClick}>Search</Button>
        </Col>
      </Row>

    </Container>

  {/* Table */}
  <Container>
    <Table striped bordered hover id="results-table" table-layout="fixed">
      <thead>
        <tr>
          <th>Entity Name</th>
          <th>CIK Number</th>
          <th>Filing Date</th>
          <th>10-K Document</th>
          <th>Extract Info?</th>
        </tr>
      </thead>
      <tbody>
        {filingResultList.map((filing) => (
          <ResultsRow key = {filing.documentAddress10k} filing={filing} isQueued={filingMap.has(filing.documentAddress10k)} addFiling={addFilingToMap} removeFiling={removeFilingFromMap}></ResultsRow>
        ))}
      </tbody>

    </Table>
  </Container>


  </div>
  );

}

export default App;
