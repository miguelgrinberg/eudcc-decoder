import React from 'react';
import {Button} from 'react-bootstrap';
import QrReader from 'react-qr-reader'
import { DateTime } from 'luxon';
import decodeEudcc from './decode.js';

function Qr() {
  const [eudcc, setEudcc] = React.useState(undefined);
  
  const eudccToTable = (data) => {
    const table = [
      ['Health Certificate', [
        ['Signature', data.valid ? 'Validated' : 'Not Validated'],
        ['Issued by', data.issuer],
        ['Issue Date', DateTime.fromMillis(data.issuedAt * 1000).toISODate()],
        ['Expiration', DateTime.fromMillis(data.expiresAt * 1000).toISODate(), (data.expiresAt * 1000 < Date.now()) ? 'Expired' : 'OK'],
        ['Certificate Version', data.version],
      ]],
      ['Personal Information', [
        ['Name', `${data.givenName} ${data.familyName}`],
        ['Date of Birth', data.dateOfBirth],
      ]],
    ];
    if (data.vaccination) {
      table.push(['Vaccination Record', [
        ['Disease', data.vaccination.disease],
        ['Vaccine Type', data.vaccination.vaccineType],
        ['Product', data.vaccination.vaccineProduct],
        ['Manufacturer', data.vaccination.vaccineManufacturer],
        ['Dose', `${data.vaccination.doseNumber} of ${data.vaccination.totalDoses}`],
        ['Date Given', data.vaccination.date],
        ['Country', data.vaccination.country],
        ['Issuer', data.vaccination.issuer],
        ['Certificate ID', data.vaccination.certificateId],
      ]]);
    }
    if (data.test) {
      table.push(['Test Record', [
        ['Disease', data.test.disease],
        ['Test Type', data.test.testType],
        ['Test Name', data.test.testName],
        ['Test Manufacturer', data.test.testManufacturer],
        ['Test Date', data.test.testDate],
        ['Test Result', data.test.testResult],
        ['Test Center', data.test.testCenter],
        ['Country', data.test.country],
        ['Issuer', data.test.issuer],
        ['Certificate ID', data.test.certificateId],
      ]]);
    }
    if (data.recovery) {
      table.push(['Recovery Record', [
        ['Disease', data.recovery.disease],
        ['First Positive Test', data.recovery.firstPositiveTest],
        ['Country', data.recovery.country],
        ['Issuer', data.recovery.issuer],
        ['Valid From', data.recovery.validFrom],
        ['Valid Until', data.recovery.validUntil],
        ['Certificate ID', data.recovery.certificateId],
      ]]);
    }
    return table;
  };

  const handleScan = async (data) => {
    if (data) {
      let decoded;
      try {
        decoded = eudccToTable(await decodeEudcc(data));
      }
      catch (error) {
        decoded = [
          ['Could not read QR Code', [
            ['Error', error.toString()],
          ]],
        ];
      }
      setEudcc(decoded);
    }
  };

  const handleError = (error) => {
    console.log(error);
  };

  const startScan = () => {
    setEudcc(null);
  };

  return (
    <>
      {!eudcc ?
        <>
          {eudcc === undefined ?
            <div id="intro">
              <h1>EU Digital COVID Certificate Decoder</h1>
              <p>Scan your EUDCC QR Code to find out what information is stored inside!</p>
              <Button variant="primary" size="lg" onClick={startScan} >Scan QR Code</Button>
              <div className="faq">
                <h2>Frequently Asked Questions</h2>
                <p>
                  <b>Will my COVID certificate be shared or stored after I scan it?</b><br />
                  No. This application runs entirely in your browser, no information is transmitted anywhere.
                </p>
                <p>
                  <b>Is this legal? How are you able to decode my COVID certificate?</b><br />
                  The information is stored in the QR Code, without encryption. The EU released <a href="https://github.com/eu-digital-green-certificates">documentation</a> on how to extract information out of the QR Codes to allow any person or organization to develop a decoder.
                </p>
                <p>
                  <b>What information does my COVID certificate has about me?</b><br />
                  The certificate includes your name, your date of birth, and details of your vaccination, test result, or recovery from the disease.
                </p>
                <p>
                  <b>How is the information in my COVID certificate verified?</b><br />
                  Each COVID certificate includes a cryptographic signature that confirms that the information is authentic. This application will also attempt to validate the signature in your certificate.
                </p>
              </div>
            </div>
          :
            <div id="qrcode">
              <QrReader onScan={handleScan} onError={handleError} />
            </div>
          }
        </>
      :
        <div id="info">
          {eudcc.map((section, i) =>
              <>
                <h2>{section[0]}</h2>
                <table>
                  {section[1].map((row, j) => 
                    <>
                      {row[0] === 'Signature' ?
                        <tr><th>Signature</th><td><span className={row[1].replace(' ', '')}>{row[1]}</span></td></tr>
                      :
                        <tr key={`${i}-${j}`}><th>{row[0]}</th><td>{row[1]} {row.length > 2 && <span className={row[2].replace(' ', '')}>{row[2]}</span>}</td></tr>
                      }
                    </>
                  )}
                </table>
              </>
          )}
          <Button variant="primary" size="lg" onClick={startScan} >Scan Another QR Code</Button>
        </div>
      }
    </>
  );
}

export default Qr;
