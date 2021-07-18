import fs from 'fs';
import base45 from 'base45-js';
import pako from 'pako';
//import { cbor } from 'cbor-web';
import cose from 'cose-js';
import { PublicKey } from '@fidm/x509';
import countryList from 'country-list';
const cbor = require('cbor-web');

let publicKeys = null;

const decodeEudcc = async (data) => {
  if (!publicKeys) {
    if (typeof window !== 'undefined') {
      const response = await fetch('public_keys.json');
      publicKeys = await response.json();
    }
    else {
      publicKeys = JSON.parse(fs.readFileSync('public/public_keys.json'));
    }
  }

  if (data.startsWith('HC1')) {
    data = data.substring(3)
    if (data.startsWith(':')) {
       data = data.substring(1)
    }
  }

  data = base45.decode(data);

  if (data[0] === 0x78) {
   data = pako.inflate(data)
  }

  const decoded = cbor.decode(data);
  // console.log(decoded);
  const pHeader = cbor.decode(decoded.value[0]);
  const uHeader = decoded.value[1];
  const payload = cbor.decode(decoded.value[2]);
  // console.log(payload);

  const kid = pHeader.get(4) || uHeader.get(4);
  const kidBase64 = kid.toString('base64');

  let valid = false;
  if (kidBase64 in publicKeys.eu_keys) {
    const key = publicKeys.eu_keys[kidBase64][0].subjectPk;
    const pk = PublicKey.fromPEM('-----BEGIN PUBLIC KEY-----\n' + key + '\n-----END PUBLIC KEY-----');
    const keyX = Buffer.from(pk.keyRaw.slice(1, 1 + 32));
    const keyY = Buffer.from(pk.keyRaw.slice(33, 33 + 32));
    const verifier = { 'key': { 'x': keyX, 'y': keyY,  'kid': kid } };

    try {
      const verified = await cose.sign.verify(data, verifier);
      if (verified.equals(decoded.value[2])) {
        valid = true;
      }
    }
    catch (error) {
    }
  }

  const cert = payload.get(-260).get(1);
  const response = {
    valid: valid,
    issuer: countryList.getName(payload.get(1)),
    issuedAt: payload.get(6),
    expiresAt: payload.get(4),
    version: cert.ver,
    givenName: cert.nam.gn,
    familyName: cert.nam.fn,
    dateOfBirth: cert.dob.split('T')[0],
  };

  if ('v' in cert && Array.isArray(cert.v) && cert.v.length > 0) {
    const vp = {
      '1119349007': 'SARS-CoV-2 mRNA vaccine',
      '1119305005': 'SARS-CoV-2 antigen vaccine',
      'J07BX03': 'covid-19 vaccines',
    };
    const mp = {
      'EU/1/20/1528': 'Comirnaty',
      'EU/1/20/1507': 'COVID-19 Vaccine Moderna',
      'EU/1/21/1529': 'Vaxzevria',
      'EU/1/20/1525': 'COVID-19 Vaccine Janssen',
    };
    const ma = {
      'ORG-100001699': 'AstraZeneca AB',
      'ORG-100030215': 'Biontech Manufacturing GmbH',
      'ORG-100001417': 'Janssen-Cilag International',
      'ORG-100031184': 'Moderna Biotech Spain S.L.',
      'ORG-100006270': 'Curevac AG',
      'ORG-100013793': 'CanSino Biologics',
      'ORG-100020693': 'China Sinopharm International Corp. - Beijing location',
      'ORG-100010771': 'Sinopharm Weiqida Europe Pharmaceutical s.r.o. - Prague location',
      'ORG-100024420': 'Sinopharm Zhijun (Shenzhen) Pharmaceutical Co. Ltd. - Shenzhen location',
      'ORG-100032020': 'Novavax CZ AS',
    };
    response.vaccination = {
      disease: (cert.v[0].tg === '840539006') ? 'COVID-19' : cert.v.tg,
      vaccineType: (cert.v[0].vp in vp) ? vp[cert.v[0].vp] : cert.v[0].vp,
      vaccineProduct: (cert.v[0].mp in mp) ? mp[cert.v[0].mp] : cert.v[0].mp,
      vaccineManufacturer: (cert.v[0].ma in ma) ? ma[cert.v[0].ma] : cert.v[0].ma,
      doseNumber: cert.v[0].dn,
      totalDoses: cert.v[0].sd,
      date: cert.v[0].dt.split('T')[0],
      country: countryList.getName(cert.v[0].co),
      issuer: cert.v[0].is,
      certificateId: cert.v[0].ci,
    };
  }

  if ('t' in cert && Array.isArray(cert.t) && cert.t.length > 0) {
    const tt = {
      'LP6464-4': 'Nucleic acid amplification with probe detection',
      'LP217198-3': 'Rapid immunoassay',
    };
    const ma = {
      '1833': 'AAZ-LMB, COVID-VIRO',
      '1232': 'Abbott Rapid Diagnostics, Panbio COVID-19 Ag Rapid Test',
      '1468': 'ACON Laboratories, Inc, Flowflex SARS-CoV-2 Antigen rapid test',
      '1304': 'AMEDA Labordiagnostik GmbH, AMP Rapid Test SARS-CoV-2 Ag',
      '1822': 'Anbio (Xiamen) Biotechnology Co., Ltd, Rapid COVID-19 Antigen Test(Colloidal Gold)',
      '1815': 'Anhui Deep Blue Medical Technology Co., Ltd, COVID-19 (SARS-CoV-2) Antigen Test Kit (Colloidal Gold) - Nasal Swab',
      '1736': 'Anhui Deep Blue Medical Technology Co., Ltd, COVID-19 (SARS-CoV-2) Antigen Test Kit(Colloidal Gold)',
      '768': 'ArcDia International Ltd, mariPOC SARS-CoV-2',
      '1654': 'Asan Pharmaceutical CO., LTD, Asan Easy Test COVID-19 Ag',
      '2010': 'Atlas Link Technology Co., Ltd., NOVA Test® SARS-CoV-2 Antigen Rapid Test Kit (Colloidal Gold Immunochromatography)',
      '1906': 'Azure Biotech Inc, COVID-19 Antigen Rapid Test Device',
      '1870': 'Beijing Hotgen Biotech Co., Ltd, Novel Coronavirus 2019-nCoV Antigen Test (Colloidal Gold)',
      '1331': 'Beijing Lepu Medical Technology Co., Ltd, SARS-CoV-2 Antigen Rapid Test Kit',
      '1484': 'Beijing Wantai Biological Pharmacy Enterprise Co., Ltd, Wantai SARS-CoV-2 Ag Rapid Test (FIA)',
      '1223': 'BIOSYNEX S.A., BIOSYNEX COVID-19 Ag BSS',
      '1236': 'BTNX Inc, Rapid Response COVID-19 Antigen Rapid Test',
      '1173': 'CerTest Biotec, CerTest SARS-CoV-2 Card test',
      '1919': 'Core Technology Co., Ltd, Coretests COVID-19 Ag Test',
      '1225': 'DDS DIAGNOSTIC, Test Rapid Covid-19 Antigen (tampon nazofaringian)',
      '1375': 'DIALAB GmbH, DIAQUICK COVID-19 Ag Cassette',
      '1244': 'GenBody, Inc, Genbody COVID-19 Ag Test',
      '1253': 'GenSure Biotech Inc, GenSure COVID-19 Antigen Rapid Kit (REF: P2004)',
      '1144': 'Green Cross Medical Science Corp., GENEDIA W COVID-19 Ag',
      '1747': 'Guangdong Hecin Scientific, Inc., 2019-nCoV Antigen Test Kit (colloidal gold method)',
      '1360': 'Guangdong Wesail Biotech Co., Ltd, COVID-19 Ag Test Kit',
      '1437': 'Guangzhou Wondfo Biotech Co., Ltd, Wondfo 2019-nCoV Antigen Test (Lateral Flow Method)',
      '1256': 'Hangzhou AllTest Biotech Co., Ltd, COVID-19 and Influenza A+B Antigen Combo Rapid Test',
      '1363': 'Hangzhou Clongene Biotech Co., Ltd, Covid-19 Antigen Rapid Test Kit',
      '1365': 'Hangzhou Clongene Biotech Co., Ltd, COVID-19/Influenza A+B Antigen Combo Rapid Test',
      '1844': 'Hangzhou Immuno Biotech Co.,Ltd, Immunobio SARS-CoV-2 Antigen ANTERIOR NASAL Rapid Test Kit (minimal invasive)',
      '1215': 'Hangzhou Laihe Biotech Co., Ltd, LYHER Novel Coronavirus (COVID-19) Antigen Test Kit(Colloidal Gold)',
      '1392': 'Hangzhou Testsea Biotechnology Co., Ltd, COVID-19 Antigen Test Cassette',
      '1767': 'Healgen Scientific, Coronavirus Ag Rapid Test Cassette',
      '1263': 'Humasis, Humasis COVID-19 Ag Test',
      '1333': 'Joinstar Biomedical Technology Co., Ltd, COVID-19 Rapid Antigen Test (Colloidal Gold)',
      '1764': 'JOYSBIO (Tianjin) Biotechnology Co., Ltd, SARS-CoV-2 Antigen Rapid Test Kit (Colloidal Gold)',
      '1266': 'Labnovation Technologies Inc, SARS-CoV-2 Antigen Rapid Test Kit',
      '1267': 'LumiQuick Diagnostics Inc, QuickProfile COVID-19 Antigen Test',
      '1268': 'LumiraDX, LumiraDx SARS-CoV-2 Ag Test',
      '1180': 'MEDsan GmbH, MEDsan SARS-CoV-2 Antigen Rapid Test',
      '1190': 'möLab, COVID-19 Rapid Antigen Test',
      '1481': 'MP Biomedicals, Rapid SARS-CoV-2 Antigen Test Card',
      '1162': 'Nal von minden GmbH, NADAL COVID-19 Ag Test',
      '1420': 'NanoEntek, FREND COVID-19 Ag',
      '1199': 'Oncosem Onkolojik Sistemler San. ve Tic. A.S., CAT',
      '308': 'PCL Inc, PCL COVID19 Ag Rapid FIA',
      '1271': 'Precision Biosensor, Inc, Exdia COVID-19 Ag',
      '1341': 'Qingdao Hightop Biotech Co., Ltd, SARS-CoV-2 Antigen Rapid Test (Immunochromatography)',
      '1097': 'Quidel Corporation, Sofia SARS Antigen FIA',
      '1606': 'RapiGEN Inc, BIOCREDIT COVID-19 Ag - SARS-CoV 2 Antigen test',
      '1604': 'Roche (SD BIOSENSOR), SARS-CoV-2 Antigen Rapid Test',
      '1489': 'Safecare Biotech (Hangzhou) Co. Ltd, COVID-19 Antigen Rapid Test Kit (Swab)',
      '1490': 'Safecare Biotech (Hangzhou) Co. Ltd, Multi-Respiratory Virus Antigen Test Kit(Swab)  (Influenza A+B/ COVID-19)',
      '344': 'SD BIOSENSOR Inc, STANDARD F COVID-19 Ag FIA',
      '345': 'SD BIOSENSOR Inc, STANDARD Q COVID-19 Ag Test',
      '1319': 'SGA Medikal, V-Chek SARS-CoV-2 Ag Rapid Test Kit (Colloidal Gold)',
      '2017': 'Shenzhen Ultra-Diagnostics Biotec.Co.,Ltd, SARS-CoV-2 Antigen Test Kit',
      '1246': 'VivaChek Biotech (Hangzhou) Co., Ltd, Vivadiag SARS CoV 2 Ag Rapid Test',
      '1763': 'Xiamen AmonMed Biotechnology Co., Ltd, COVID-19 Antigen Rapid Test Kit (Colloidal Gold)',
      '1278': 'Xiamen Boson Biotech Co. Ltd, Rapid SARS-CoV-2 Antigen Test Card',
      '1456': 'Xiamen Wiz Biotech Co., Ltd, SARS-CoV-2 Antigen Rapid Test',
      '1884': 'Xiamen Wiz Biotech Co., Ltd, SARS-CoV-2 Antigen Rapid Test (Colloidal Gold)',
      '1296': 'Zhejiang Anji Saianfu Biotech Co., Ltd, AndLucky COVID-19 Antigen Rapid Test',
      '1295': 'Zhejiang Anji Saianfu Biotech Co., Ltd, reOpenTest COVID-19 Antigen Rapid Test',
      '1343': 'Zhezhiang Orient Gene Biotech Co., Ltd, Coronavirus Ag Rapid Test Cassette (Swab)',
    };
    const tr = {
      '260415000': 'Not detected',
      '260373001': 'Detected',
    };
    response.test = {
      disease: (cert.t[0].tg === '840539006') ? 'COVID-19' : cert.t.tg,
      testType: (cert.t[0].tt in tt) ? tt[cert.t[0].tt] : cert.t[0].tt,
      testName: cert.t[0].nm || '',
      testManufacturer: (cert.t[0].ma in ma) ? ma[cert.t[0].ma] : cert.t[0].ma,
      testDate: cert.t[0].sc.replace('T', ' ').replace('Z', '+00'),
      testResult: (cert.t[0].tr in tr) ? tr[cert.t[0].tr] : cert.t[0].tr,
      testCenter: cert.t[0].tc,
      country: countryList.getName(cert.t[0].co),
      issuer: cert.t[0].is,
      certificateId: cert.t[0].ci,
    };
  }

  if ('r' in cert && Array.isArray(cert.r) && cert.r.length > 0) {
    response.recovery = {
      disease: (cert.r[0].tg === '840539006') ? 'COVID-19' : cert.r.tg,
      firstPositiveTest: cert.r[0].fr.split('T')[0],
      country: countryList.getName(cert.r[0].co),
      issuer: cert.r[0].is,
      validFrom: cert.r[0].df.split('T')[0],
      validUntil: cert.r[0].du.split('T')[0],
      certificateId: cert.r[0].ci,
    };
  }

  return response;
};

export default decodeEudcc;
