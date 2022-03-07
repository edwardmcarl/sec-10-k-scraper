import logo from '../img/logo.svg'
import '../css/App.css'
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.min.js';
import React from 'react';
import {useState, useEffect} from 'react';
import {Col, Container, Dropdown, Row, InputGroup, FormControl, FormLabel} from 'react-bootstrap'

function App() {
  const [startDate, setStartDate] = useState(null);
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
          aria-label="Search"
          aria-describedby="search-addon"
          id="searchInput"
          />
        </InputGroup>
      </Container>


    {/* Start and End Dates*/}
    <Container>
      <Row>
        <Col>
        <text>Start Date:</text>
        <DatePicker></DatePicker>
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


    </div>
  );

}

export default App
