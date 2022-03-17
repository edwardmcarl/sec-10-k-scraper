import logo from '../img/logo.svg';
import '../css/App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.min.js';
import React from 'react';
import {useState, useEffect} from 'react';
import {Button, Col, Container, Dropdown, Row, InputGroup, FormControl, FormLabel, Table} from 'react-bootstrap';
import DatePicker from 'react-date-picker';

// interface FilingSearchResult {
  
// }
class Filing {
  num: number; // number in table
  entityName: string; // name of entity
  cikNumber: string; // cik number
  filingDate: string; // filing date
  documentAddress10k: string; // document address for 10-K
  extractInfo: boolean; // true/false if user wants to extract info from 10-K
  constructor(numIn: number, entityNameIn: string, cikNumberIn: string, filingDateIn: string, documentAddress10kIn: string, extractInfoIn: boolean) {
    this.num = numIn;
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

function ResultsRow(props: ResultsRowProps) {

  const handleInfoClick = () => {
    if (props.isQueued) {
      props.removeFiling(props.filing);
    } else {
      props.addFiling(props.filing);
    }
  };
  const getButtonText = () => {
    return props.isQueued ? 'Add to Queue' : 'Remove from Queue'; 
  };
  return (
    <tr>
      <td>{props.filing.num}</td>
      <td>{props.filing.entityName}</td>
      <td>{props.filing.cikNumber}</td>
      <td>{props.filing.filingDate}</td>
      <td>{props.filing.documentAddress10k}</td>
      <td>
        <Button variant="secondary" onClick={(event) => {handleInfoClick();}}>{getButtonText()}</Button>
      </td>
    </tr>
  );
}



function App() {
  
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
    let startDateISO = startDate.toISOString();
    let endDateISO = endDate.toISOString();
    let filingResults = await window.requestRPC.procedure('search_form_info', [searchBarContents, startDateISO, endDateISO]); // Assuming searchBarContents is CIK Number
  };
  
  return (
  <div> {/* Outer div */}

  {/* Title / header*/}
    <Container>
      <Row>
        <Col md={12}>
        <img src="../img/SEC-Logo.jpg" alt="" height="150" width="150"></img>  
        <h1>SEC EDGAR 10-K Information Access</h1>
        </Col>
      </Row>
    </Container>

  {/* Search Bar*/}
    <Container>
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
    <Table striped bordered hover id="results-table">
      <thead>
        <tr>
          <th>#</th>
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
