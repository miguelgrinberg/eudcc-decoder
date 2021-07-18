import './App.css';
import React from 'react';
import { Container } from 'react-bootstrap';
import Qr from './Qr.js';

function App() {
  return (
    <Container>
      <div id="scan"><Qr /></div>
    </Container>
  );
}

export default App;
