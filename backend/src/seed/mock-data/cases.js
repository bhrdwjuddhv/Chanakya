/**
 * FICTIONAL PROTOTYPE DATA — INDIAN LAW ENFORCEMENT & INTELLIGENCE CONTEXT (NCRB/MHA).
 * Every person, company, address, phone number and vehicle below is invented for demonstration.
 * Any resemblance to real people or events is coincidental.
 *
 * The three case graphs are shaped deliberately:
 *  - Vikramaditya Singhania appears in Sagar Chhaya AND Yamuna Bio-Theft -> cross-case bridge pattern
 *  - Kanch Consultancy Services LLP is a shared intermediary              -> shared-intermediary pattern
 *  - Isha Deshmukh is the only link between two clusters                 -> high-betweenness broker
 *    who is not a named suspect, and a Louvain community bridge
 */

export const seedCases = [
  {
    caseNumber: 'CASE-2025-001',
    title: 'Operation Sagar Chhaya',
    description:
      'Series of high-value electronics and luxury consignment diversions from bonded Container Freight Stations (CFS) at JNPT Port, Nhava Sheva. Losses estimated at ₹19.4 Crore across seven incidents. Inside assistance suspected from port yard staff.',
    status: 'active',
    priority: 'high',
    classification: 'restricted',

    entities: [
      { type: 'Person', name: 'Vikramaditya Singhania', role: 'suspect', aliases: ['Bada Seth', 'The Harbourmaster'], attributes: { age: 47, note: 'Suspected kingpin coordinating transit routes; never touches cargo physically.' } },
      { type: 'Person', name: 'Devendra Shukla', role: 'suspect', aliases: ['Deva'], attributes: { age: 39, note: 'Ground crew supervisor for night-time container diversion at JNPT.' } },
      { type: 'Person', name: 'Esha Ray', role: 'suspect', attributes: { age: 52, note: 'Antiques & luxury dealer in South Mumbai; suspected receiver/fence for diverted goods.' } },
      { type: 'Person', name: 'Tanmay Nambiar', role: 'person_of_interest', attributes: { age: 28, note: 'Night-shift yard clearance officer at Nhava Sheva Logistics.' } },
      { type: 'Person', name: 'Raghav Ojha', role: 'person_of_interest', attributes: { age: 34, note: 'Heavy container vehicle contract driver; GPS tags match incident nights.' } },
      { type: 'Person', name: 'Priya Chandra', role: 'witness', attributes: { age: 41, note: 'Port customs clearing superintendent; flagged missing container seals.' } },

      { type: 'Organization', name: 'Nhava Sheva Freight & CFS Ltd', attributes: { sector: 'freight', note: 'Operator of the JNPT bonded container freight station.' } },
      { type: 'Organization', name: 'Singhania Multi-Modal Logistics', attributes: { sector: 'freight', note: 'Holding company registered under V. Singhania at Nariman Point.' } },
      { type: 'Organization', name: 'Kalamboli Scrap & Logistics Hub', attributes: { sector: 'salvage', note: 'Suspected transit yard for tampering with customs e-seals.' } },
      { type: 'Organization', name: 'Ray Antiques & Curios', attributes: { sector: 'retail', note: 'Art gallery & showroom near Fort, Mumbai.' } },

      { type: 'Location', name: 'JNPT CFS Yard 4', attributes: { address: 'Plot 14, JNPT Port Sector, Nhava Sheva, Navi Mumbai', lat: 18.9496, lng: 72.9512 } },
      { type: 'Location', name: 'Kalamboli Steel & Scrap Yard', attributes: { address: 'Sector 8, Kalamboli Industrial Area, Navi Mumbai', lat: 19.0330, lng: 73.1022 } },
      { type: 'Location', name: 'Ray Curios Storefront', attributes: { address: '22 Kala Ghoda, Fort, Mumbai', lat: 18.9284, lng: 72.8331 } },

      { type: 'Vehicle', name: 'Container Truck MH-06-BW-4417', attributes: { plate: 'MH-06-BW-4417', make: 'Tata Prima', colour: 'white' } },
      { type: 'Vehicle', name: 'Black SUV MH-01-DE-8823', attributes: { plate: 'MH-01-DE-8823', make: 'Toyota Fortuner', colour: 'black' } },

      { type: 'Phone', name: '+91-98201-55142', attributes: { carrier: 'prepaid', note: 'Prepaid burner active exclusively during midnight container movements.' } },
      { type: 'Phone', name: '+91-98201-55197', attributes: { carrier: 'postpaid', note: 'Registered mobile of yard clerk T. Nambiar.' } },
    ],

    relationships: [
      { from: 'Vikramaditya Singhania', to: 'Devendra Shukla', type: 'KNOWS', status: 'CONFIRMED', confidence: 0.95, snippet: 'Surveillance and toll plaza records place both at Kalamboli Yard on four separate dates.' },
      { from: 'Vikramaditya Singhania', to: 'Singhania Multi-Modal Logistics', type: 'OWNS', status: 'CONFIRMED', confidence: 1, snippet: 'MCA-21 filings list V. Singhania as Managing Director (DIN 08412930).' },
      { from: 'Vikramaditya Singhania', to: 'Esha Ray', type: 'ASSOCIATED_WITH', status: 'AI_SUGGESTED', confidence: 0.68, snippet: 'Intercepted WhatsApp metadata references "handing consignment to ER Fort gallery".' },
      { from: 'Vikramaditya Singhania', to: 'Black SUV MH-01-DE-8823', type: 'USED', status: 'CONFIRMED', confidence: 0.9 },
      { from: 'Vikramaditya Singhania', to: '+91-98201-55142', type: 'USED', status: 'INFERRED', confidence: 0.72, snippet: 'Cell tower triangulation matches Singhania\'s movement pattern on 6 out of 7 incident nights.' },

      { from: 'Devendra Shukla', to: 'Tanmay Nambiar', type: 'KNOWS', status: 'CONFIRMED', confidence: 0.88, snippet: 'Nambiar admitted in panchnama inquiry to meeting Shukla twice at Seawoods dhaba.' },
      { from: 'Devendra Shukla', to: 'Container Truck MH-06-BW-4417', type: 'USED', status: 'CONFIRMED', confidence: 0.93 },
      { from: 'Devendra Shukla', to: 'JNPT CFS Yard 4', type: 'VISITED', status: 'CONFIRMED', confidence: 0.97 },
      { from: 'Devendra Shukla', to: 'Raghav Ojha', type: 'ASSOCIATED_WITH', status: 'AI_SUGGESTED', confidence: 0.55 },

      { from: 'Tanmay Nambiar', to: 'Nhava Sheva Freight & CFS Ltd', type: 'ASSOCIATED_WITH', status: 'CONFIRMED', confidence: 1, snippet: 'Service book record: night-shift clearing clerk since 2022.' },
      { from: 'Tanmay Nambiar', to: 'JNPT CFS Yard 4', type: 'LOCATED_AT', status: 'CONFIRMED', confidence: 1 },
      { from: 'Tanmay Nambiar', to: '+91-98201-55197', type: 'USED', status: 'CONFIRMED', confidence: 1 },

      { from: 'Raghav Ojha', to: 'Container Truck MH-06-BW-4417', type: 'USED', status: 'INFERRED', confidence: 0.64 },
      { from: 'Raghav Ojha', to: 'Kalamboli Steel & Scrap Yard', type: 'VISITED', status: 'CONFIRMED', confidence: 0.85 },

      { from: 'Esha Ray', to: 'Ray Antiques & Curios', type: 'OWNS', status: 'CONFIRMED', confidence: 1 },
      { from: 'Esha Ray', to: 'Ray Curios Storefront', type: 'LOCATED_AT', status: 'CONFIRMED', confidence: 1 },
      { from: 'Esha Ray', to: 'Kalamboli Scrap & Logistics Hub', type: 'ASSOCIATED_WITH', status: 'AI_SUGGESTED', confidence: 0.6 },

      { from: 'Singhania Multi-Modal Logistics', to: 'Kalamboli Scrap & Logistics Hub', type: 'ASSOCIATED_WITH', status: 'INFERRED', confidence: 0.7, snippet: 'Shared registered GSTIN and corporate secretarial filing address.' },
      { from: 'Kalamboli Scrap & Logistics Hub', to: 'Kalamboli Steel & Scrap Yard', type: 'LOCATED_AT', status: 'CONFIRMED', confidence: 1 },
      { from: 'Nhava Sheva Freight & CFS Ltd', to: 'JNPT CFS Yard 4', type: 'OWNS', status: 'CONFIRMED', confidence: 1 },
      { from: 'Priya Chandra', to: 'Nhava Sheva Freight & CFS Ltd', type: 'ASSOCIATED_WITH', status: 'CONFIRMED', confidence: 1 },
      { from: 'Priya Chandra', to: 'Tanmay Nambiar', type: 'KNOWS', status: 'CONFIRMED', confidence: 0.8, snippet: 'Colleagues on overlapping customs clearance shifts.' },
    ],

    locations: [
      { name: 'JNPT CFS Yard 4', address: 'Plot 14, JNPT Port Sector, Nhava Sheva, Navi Mumbai', lat: 18.9496, lng: 72.9512, type: 'crime_scene', description: 'Point of container tampering and diversion. RFID electronic cargo seals bypassed.' },
      { name: 'Kalamboli Steel & Scrap Yard', address: 'Sector 8, Kalamboli Industrial Area, Navi Mumbai', lat: 19.0330, lng: 73.1022, type: 'site', description: 'Suspected transit point where stolen electronics are de-palletized.' },
      { name: 'Ray Curios Storefront', address: '22 Kala Ghoda, Fort, Mumbai', lat: 18.9284, lng: 72.8331, type: 'business', description: 'Commercial art and luxury gallery operated by Esha Ray.' },
    ],

    timeline: [
      { occurredAt: '2025-01-14T23:40:00Z', title: 'First container seal breach reported', type: 'event', persons: ['Priya Chandra'], location: 'JNPT CFS Yard 4', description: 'Customs manifest short by 40 units of imported high-end server equipment.', source: 'FIR-2025-MUM-0142' },
      { occurredAt: '2025-02-03T02:15:00Z', title: 'Container truck seen leaving JNPT Gate 3', type: 'movement', persons: ['Devendra Shukla'], location: 'JNPT CFS Yard 4', description: 'CCTV footage captures MH-06-BW-4417 departing unmanifested at 02:15 AM.', source: 'Port CCTV Log 0203-B' },
      { occurredAt: '2025-02-03T03:05:00Z', title: 'Fastag hit at Kalamboli Toll Plaza', type: 'movement', persons: ['Raghav Ojha'], location: 'Kalamboli Steel & Scrap Yard', description: 'Fastag and ANPR hit 50 minutes post-departure from Nhava Sheva.', source: 'National Highway Fastag Stream' },
      { occurredAt: '2025-03-11T19:20:00Z', title: 'Burner mobile activated near Kalamboli', type: 'communication', persons: ['Vikramaditya Singhania'], description: 'Prepaid SIM +91-98201-55142 pings tower near Kalamboli Scrap Yard.', source: 'Special Cell CDR Extract' },
      { occurredAt: '2025-04-02T10:00:00Z', title: 'Nambiar statement recorded under Sec 161 CrPC', type: 'event', persons: ['Tanmay Nambiar'], description: 'Admits meeting Shukla twice; claims ignorance of container loot.', source: 'Case Diary Entry CD-19' },
      { occurredAt: '2025-05-19T14:30:00Z', title: 'Discrepancy report filed by Customs Officer', type: 'event', persons: ['Priya Chandra'], location: 'JNPT CFS Yard 4', description: 'Six-month audit reveals 7 forged out-gate e-passes.', source: 'Customs Audit Report CAR-07' },
    ],
  },

  {
    caseNumber: 'CASE-2025-002',
    title: 'Yamuna Expressway Abduction & Tech Theft',
    description:
      'Dr. Ananya Sen, Chief Scientist of Composite Materials at the Yamuna Bio-Materials Institute, went missing on Yamuna Expressway on 8 March 2025. Proprietary defense composite patents missing; zero ransom calls received.',
    status: 'active',
    priority: 'critical',
    classification: 'confidential',

    entities: [
      { type: 'Person', name: 'Dr. Ananya Sen', role: 'victim', attributes: { age: 36, note: 'Missing scientist. Principal investigator on DRDO-aligned composite shielding.' } },
      { type: 'Person', name: 'Jayant Kumar', role: 'suspect', attributes: { age: 44, note: 'Lab co-investigator. Filed disputed intellectual property claim against Dr. Sen.' } },
      { type: 'Person', name: 'Sunita Aggarwal', role: 'witness', attributes: { age: 29, note: 'Jogger who gave the last confirmed visual sighting at Pari Chowk flyover at 19:10.' } },
      // Deliberate cross-case bridge: also the kingpin in Operation Sagar Chhaya
      { type: 'Person', name: 'Vikramaditya Singhania', role: 'person_of_interest', attributes: { note: 'Linked via hazardous material transport contracts awarded to Singhania Multi-Modal.' } },
      { type: 'Person', name: 'Dr. Hemant Joshi', role: 'witness', attributes: { age: 58, note: 'Director General of Yamuna Bio-Materials Institute.' } },

      { type: 'Organization', name: 'Yamuna Advanced Bio-Materials Institute', attributes: { sector: 'research', note: 'Premier autonomous R&D institute under MeitY/DST.' } },
      { type: 'Organization', name: 'Singhania Multi-Modal Logistics', attributes: { sector: 'freight' } },

      { type: 'Location', name: 'Yamuna Expressway Service Road', attributes: { address: 'Km 11, Yamuna Expressway, Greater Noida', lat: 28.4502, lng: 77.5218 } },
      { type: 'Location', name: 'Institute Lab B', attributes: { address: 'Plot 3, Institutional Area, Knowledge Park II, Greater Noida', lat: 28.4611, lng: 77.4981 } },
      { type: 'Location', name: 'Jayant Kumar Residence', attributes: { address: 'Flat 602, Tower 4, Jaypee Greens, Greater Noida', lat: 28.4720, lng: 77.5110 } },

      { type: 'Vehicle', name: 'Grey Sedan UP-16-AB-2290', attributes: { plate: 'UP-16-AB-2290', make: 'Skoda Octavia', colour: 'grey' } },
      { type: 'Phone', name: '+91-98111-55331', attributes: { carrier: 'postpaid', note: 'Dr. Sen\'s official smartphone. Last tower ping 19:26 at Jewar sector.' } },
      { type: 'Email', name: 'a.sen@yamunabio.ac.in', attributes: {} },
    ],

    relationships: [
      { from: 'Dr. Ananya Sen', to: 'Yamuna Advanced Bio-Materials Institute', type: 'ASSOCIATED_WITH', status: 'CONFIRMED', confidence: 1 },
      { from: 'Dr. Ananya Sen', to: 'Institute Lab B', type: 'LOCATED_AT', status: 'CONFIRMED', confidence: 1 },
      { from: 'Dr. Ananya Sen', to: '+91-98111-55331', type: 'USED', status: 'CONFIRMED', confidence: 1 },
      { from: 'Dr. Ananya Sen', to: 'a.sen@yamunabio.ac.in', type: 'USED', status: 'CONFIRMED', confidence: 1 },
      { from: 'Dr. Ananya Sen', to: 'Yamuna Expressway Service Road', type: 'VISITED', status: 'CONFIRMED', confidence: 0.95, snippet: 'Sunita Aggarwal places her near Pari Chowk / Expressway intersection at 19:10.' },
      { from: 'Dr. Ananya Sen', to: 'Jayant Kumar', type: 'KNOWS', status: 'CONFIRMED', confidence: 1, snippet: 'Co-inventors on 4 research patents; embroiled in bitter arbitration.' },

      { from: 'Jayant Kumar', to: 'Yamuna Advanced Bio-Materials Institute', type: 'ASSOCIATED_WITH', status: 'CONFIRMED', confidence: 1 },
      { from: 'Jayant Kumar', to: 'Jayant Kumar Residence', type: 'LOCATED_AT', status: 'CONFIRMED', confidence: 1 },
      { from: 'Jayant Kumar', to: 'Grey Sedan UP-16-AB-2290', type: 'OWNS', status: 'CONFIRMED', confidence: 1 },
      { from: 'Jayant Kumar', to: 'Yamuna Expressway Service Road', type: 'VISITED', status: 'AI_SUGGESTED', confidence: 0.58, snippet: 'Toll plaza camera captures UP-16-AB-2290 passing Jewar exit at 19:31.' },

      { from: 'Sunita Aggarwal', to: 'Yamuna Expressway Service Road', type: 'VISITED', status: 'CONFIRMED', confidence: 1 },
      { from: 'Sunita Aggarwal', to: 'Dr. Ananya Sen', type: 'KNOWS', status: 'INFERRED', confidence: 0.4, snippet: 'Aggarwal recognized Dr. Sen from the Greater Noida Sports Complex walking club.' },

      { from: 'Vikramaditya Singhania', to: 'Singhania Multi-Modal Logistics', type: 'OWNS', status: 'CONFIRMED', confidence: 1 },
      { from: 'Singhania Multi-Modal Logistics', to: 'Yamuna Advanced Bio-Materials Institute', type: 'ASSOCIATED_WITH', status: 'CONFIRMED', confidence: 0.9, snippet: 'Singhania Logistics held the hazardous isotope and chemical transport contract since 2023.' },
      { from: 'Vikramaditya Singhania', to: 'Institute Lab B', type: 'VISITED', status: 'AI_SUGGESTED', confidence: 0.52, snippet: 'Lab visitor register has a manual entry for "V. Singhania" on 6 March.' },

      { from: 'Dr. Hemant Joshi', to: 'Yamuna Advanced Bio-Materials Institute', type: 'ASSOCIATED_WITH', status: 'CONFIRMED', confidence: 1 },
      { from: 'Dr. Hemant Joshi', to: 'Jayant Kumar', type: 'KNOWS', status: 'CONFIRMED', confidence: 1 },
      { from: 'Dr. Hemant Joshi', to: 'Dr. Ananya Sen', type: 'KNOWS', status: 'CONFIRMED', confidence: 1 },
      { from: 'Yamuna Advanced Bio-Materials Institute', to: 'Institute Lab B', type: 'OWNS', status: 'CONFIRMED', confidence: 1 },
    ],

    locations: [
      { name: 'Yamuna Expressway Service Road', address: 'Km 11, Yamuna Expressway, Greater Noida', lat: 28.4502, lng: 77.5218, type: 'crime_scene', description: 'Last confirmed visual location at 19:10. Blind spot between CCTV surveillance poles 14 and 19.' },
      { name: 'Institute Lab B', address: 'Plot 3, Institutional Area, Knowledge Park II, Greater Noida', lat: 28.4611, lng: 77.4981, type: 'site', description: 'Dr. Sen\'s workplace. Biometric access turnstile shows exit at 18:52.' },
      { name: 'Jayant Kumar Residence', address: 'Flat 602, Tower 4, Jaypee Greens, Greater Noida', lat: 28.4720, lng: 77.5110, type: 'residence', description: 'Home of suspect Jayant Kumar, 2.2 km from the expressway service lane.' },
    ],

    timeline: [
      { occurredAt: '2025-02-24T11:00:00Z', title: 'IP Dispute registered before Patent Controller', type: 'event', persons: ['Dr. Ananya Sen', 'Jayant Kumar'], description: 'Dr. Sen formally contested Kumar\'s sole inventorship claim on lightweight armour polymer.', source: 'Indian Patent Office Dispute IP-881' },
      { occurredAt: '2025-03-06T15:40:00Z', title: 'Visitor V. Singhania signs entry register', type: 'event', persons: ['Vikramaditya Singhania'], location: 'Institute Lab B', description: 'Physical gate diary shows V. Singhania visited Lab B; no formal escort pass issued.', source: 'Security Guard Log Register Page 212' },
      { occurredAt: '2025-03-08T18:52:00Z', title: 'Dr. Sen exits Lab B through North Gate', type: 'movement', persons: ['Dr. Ananya Sen'], location: 'Institute Lab B', description: 'Smart card RFID log records exit through Knowledge Park gate.', source: 'Institute Access Control Server' },
      { occurredAt: '2025-03-08T19:10:00Z', title: 'Last eyewitness sighting near Pari Chowk', type: 'event', persons: ['Dr. Ananya Sen', 'Sunita Aggarwal'], location: 'Yamuna Expressway Service Road', description: 'Aggarwal sees Dr. Sen walking rapidly towards expressway service road while speaking on phone.', source: 'Witness Statement under Section 161 CrPC' },
      { occurredAt: '2025-03-08T19:26:00Z', title: 'Mobile tower black-out', type: 'communication', persons: ['Dr. Ananya Sen'], description: 'Final handset ping on Jewar-Expressway cell tower, followed by complete battery detach/switch off.', source: 'Noida Police Telecom Analysis' },
      { occurredAt: '2025-03-08T19:31:00Z', title: 'Grey Skoda crosses expressway toll camera', type: 'movement', persons: ['Jayant Kumar'], location: 'Yamuna Expressway Service Road', description: 'ANPR capture of UP-16-AB-2290 speeding towards Jewar.', source: 'YEIDA Expressway ANPR Feed' },
      { occurredAt: '2025-03-09T09:00:00Z', title: 'Missing Person FIR registered', type: 'event', persons: ['Dr. Hemant Joshi'], description: 'FIR-2025-UP-0883 lodged at Knowledge Park PS by Director General Dr. Joshi.', source: 'FIR Register UP Police' },
    ],
  },

  {
    caseNumber: 'CASE-2025-003',
    title: 'Operation Kaagazi Company',
    description:
      'High-profile public procurement scam and kickback ring across municipal infrastructure tenders totalling ₹142 Crore. Multi-crore vendor payments routed into a common shell entity holding no physical premises or staff.',
    status: 'active',
    priority: 'high',
    classification: 'confidential',

    entities: [
      // Municipal / Govt cluster
      { type: 'Person', name: 'Harish Chandra Mehra', role: 'suspect', attributes: { age: 61, note: 'Standing Committee Chairperson, Delhi Municipal Development Authority.' } },
      { type: 'Person', name: 'Neeta Bakshi', role: 'suspect', attributes: { age: 45, note: 'Chief Engineer & Tender Evaluation Officer. Approved all 3 contracts.' } },
      { type: 'Person', name: 'Gita Trivedi', role: 'witness', attributes: { age: 38, note: 'Senior Auditor, Directorate of Vigilance, who uncovered the circular invoices.' } },
      // Contractor cluster
      { type: 'Person', name: 'Varun Lodha', role: 'suspect', attributes: { age: 53, note: 'Managing Director of Lodha Infracon Pvt Ltd.' } },
      { type: 'Person', name: 'Sanjay Oswal', role: 'suspect', attributes: { age: 49, note: 'Managing Partner of Oswal Infrastructure Advisors LLP.' } },
      { type: 'Person', name: 'Ananya Roy', role: 'person_of_interest', attributes: { age: 33, note: 'Chief Estimation Engineer at Lodha Infracon.' } },
      // The broker: Not a named suspect in FIR, but the sole bridge between the two clusters
      { type: 'Person', name: 'Isha Deshmukh', role: 'person_of_interest', attributes: { age: 41, note: 'Designated Partner of Kanch Consultancy Services LLP. Not named in initial complaints.' } },

      { type: 'Organization', name: 'Kanch Consultancy Services LLP', attributes: { sector: 'consulting', note: 'Shell LLP receiving kickbacks from all 3 contractors. No active office or employees.' } },
      { type: 'Organization', name: 'Delhi Municipal Development Authority', attributes: { sector: 'public' } },
      { type: 'Organization', name: 'Lodha Infracon Pvt Ltd', attributes: { sector: 'construction' } },
      { type: 'Organization', name: 'Oswal Infrastructure Advisors LLP', attributes: { sector: 'consulting' } },

      { type: 'Location', name: 'DMDA Headquarters', attributes: { address: 'Civic Centre, Minto Road, New Delhi', lat: 28.6384, lng: 77.2272 } },
      { type: 'Location', name: 'Kanch Registered Office', attributes: { address: 'Suite 400, 91 Barakhamba Road, Connaught Place, New Delhi', lat: 28.6295, lng: 77.2248 } },
      { type: 'Location', name: 'Lodha Infracon Engineering Yard', attributes: { address: '17 Okhla Phase III, Industrial Area, New Delhi', lat: 28.5355, lng: 77.2732 } },

      { type: 'Email', name: 'accounts@kanchconsultancy.in', attributes: { note: 'Common email receiving RTGS/NEFT transaction confirmations from all vendors.' } },
      { type: 'Phone', name: '+91-98100-55288', attributes: { note: 'Official contact mobile registered with MCA and listed on suspicious invoice letters.' } },
    ],

    relationships: [
      // Municipal cluster (Louvain community A)
      { from: 'Harish Chandra Mehra', to: 'Delhi Municipal Development Authority', type: 'ASSOCIATED_WITH', status: 'CONFIRMED', confidence: 1 },
      { from: 'Harish Chandra Mehra', to: 'Neeta Bakshi', type: 'KNOWS', status: 'CONFIRMED', confidence: 1, snippet: 'Served together on the DMDA Tender Scrutiny Board for four consecutive years.' },
      { from: 'Harish Chandra Mehra', to: 'DMDA Headquarters', type: 'LOCATED_AT', status: 'CONFIRMED', confidence: 1 },
      { from: 'Neeta Bakshi', to: 'Delhi Municipal Development Authority', type: 'ASSOCIATED_WITH', status: 'CONFIRMED', confidence: 1 },
      { from: 'Neeta Bakshi', to: 'DMDA Headquarters', type: 'LOCATED_AT', status: 'CONFIRMED', confidence: 1 },
      { from: 'Gita Trivedi', to: 'Delhi Municipal Development Authority', type: 'ASSOCIATED_WITH', status: 'CONFIRMED', confidence: 1 },
      { from: 'Gita Trivedi', to: 'Neeta Bakshi', type: 'KNOWS', status: 'CONFIRMED', confidence: 0.9 },
      { from: 'Gita Trivedi', to: 'DMDA Headquarters', type: 'LOCATED_AT', status: 'CONFIRMED', confidence: 1 },
      { from: 'Delhi Municipal Development Authority', to: 'DMDA Headquarters', type: 'LOCATED_AT', status: 'CONFIRMED', confidence: 1 },

      // Contractor cluster (Louvain community B)
      { from: 'Varun Lodha', to: 'Lodha Infracon Pvt Ltd', type: 'OWNS', status: 'CONFIRMED', confidence: 1 },
      { from: 'Varun Lodha', to: 'Lodha Infracon Engineering Yard', type: 'LOCATED_AT', status: 'CONFIRMED', confidence: 1 },
      { from: 'Ananya Roy', to: 'Lodha Infracon Pvt Ltd', type: 'ASSOCIATED_WITH', status: 'CONFIRMED', confidence: 1 },
      { from: 'Ananya Roy', to: 'Varun Lodha', type: 'KNOWS', status: 'CONFIRMED', confidence: 1 },
      { from: 'Ananya Roy', to: 'Lodha Infracon Engineering Yard', type: 'LOCATED_AT', status: 'CONFIRMED', confidence: 0.8 },
      { from: 'Sanjay Oswal', to: 'Oswal Infrastructure Advisors LLP', type: 'OWNS', status: 'CONFIRMED', confidence: 1 },
      { from: 'Sanjay Oswal', to: 'Varun Lodha', type: 'KNOWS', status: 'AI_SUGGESTED', confidence: 0.62, snippet: 'Both attended private pre-bid vendor consortium meetings in Taj Palace, Chanakyapuri.' },
      { from: 'Lodha Infracon Pvt Ltd', to: 'Oswal Infrastructure Advisors LLP', type: 'ASSOCIATED_WITH', status: 'INFERRED', confidence: 0.55 },

      // Shared intermediary: every contractor transfers funds to Kanch Consultancy
      { from: 'Lodha Infracon Pvt Ltd', to: 'Kanch Consultancy Services LLP', type: 'ASSOCIATED_WITH', status: 'CONFIRMED', confidence: 0.95, snippet: '11 RTGS payments totalling ₹4.1 Crore for "Technical Feasibility Analysis" with zero work reports.' },
      { from: 'Oswal Infrastructure Advisors LLP', to: 'Kanch Consultancy Services LLP', type: 'ASSOCIATED_WITH', status: 'CONFIRMED', confidence: 0.95, snippet: '6 bank transfers totalling ₹2.65 Crore using carbon-copy invoice descriptions.' },
      { from: 'Delhi Municipal Development Authority', to: 'Kanch Consultancy Services LLP', type: 'ASSOCIATED_WITH', status: 'AI_SUGGESTED', confidence: 0.6, snippet: 'One payment routed via an unapproved sub-contractor head in drainage works.' },
      { from: 'Kanch Consultancy Services LLP', to: 'accounts@kanchconsultancy.in', type: 'USED', status: 'CONFIRMED', confidence: 1 },
      { from: 'Kanch Consultancy Services LLP', to: '+91-98100-55288', type: 'USED', status: 'CONFIRMED', confidence: 1 },
      { from: 'Kanch Consultancy Services LLP', to: 'Kanch Registered Office', type: 'LOCATED_AT', status: 'CONFIRMED', confidence: 1 },

      // Isha Deshmukh: the sole bridge connecting Municipal authority and Contractors
      { from: 'Isha Deshmukh', to: 'Kanch Consultancy Services LLP', type: 'OWNS', status: 'CONFIRMED', confidence: 1, snippet: 'Sole Designated Partner in MCA incorporation filings (DIN 09283141).' },
      { from: 'Isha Deshmukh', to: 'Neeta Bakshi', type: 'KNOWS', status: 'AI_SUGGESTED', confidence: 0.66, snippet: '18 encrypted mobile calls logged prior to each of the 3 major tender allocations.' },
      { from: 'Isha Deshmukh', to: 'Varun Lodha', type: 'KNOWS', status: 'AI_SUGGESTED', confidence: 0.64, snippet: 'Both recorded attending a private banquet booking at Golf Club, New Delhi on 11 January.' },
      { from: 'Isha Deshmukh', to: 'Sanjay Oswal', type: 'ASSOCIATED_WITH', status: 'INFERRED', confidence: 0.58 },
      { from: 'Isha Deshmukh', to: 'Harish Chandra Mehra', type: 'ASSOCIATED_WITH', status: 'AI_SUGGESTED', confidence: 0.51, snippet: 'Co-trustees on the board of Jan Seva Educational Trust.' },
      { from: 'Isha Deshmukh', to: '+91-98100-55288', type: 'USED', status: 'CONFIRMED', confidence: 0.9 },
    ],

    locations: [
      { name: 'DMDA Headquarters', address: 'Civic Centre, Minto Road, New Delhi', lat: 28.6384, lng: 77.2272, type: 'site', description: 'Central procurement building where the ₹142 Crore infrastructure bids were evaluated.' },
      { name: 'Kanch Registered Office', address: 'Suite 400, 91 Barakhamba Road, Connaught Place, New Delhi', lat: 28.6295, lng: 77.2248, type: 'business', description: 'Virtual business address / mail forwarding suite. Physical verification found zero desks and no operational staff.' },
      { name: 'Lodha Infracon Engineering Yard', address: '17 Okhla Phase III, Industrial Area, New Delhi', lat: 28.5355, lng: 77.2732, type: 'business', description: 'Head office and heavy equipment workshop of Lodha Infracon.' },
    ],

    timeline: [
      { occurredAt: '2024-11-02T09:00:00Z', title: 'Kanch Consultancy Services LLP incorporated', type: 'event', persons: ['Isha Deshmukh'], location: 'Kanch Registered Office', description: 'Designated Partner: Isha Deshmukh. Registered at virtual address in Barakhamba Road.', source: 'Ministry of Corporate Affairs MCA-21 Portal' },
      { occurredAt: '2025-01-11T20:00:00Z', title: 'Private banquet meeting in Chanakyapuri', type: 'event', persons: ['Isha Deshmukh', 'Varun Lodha'], description: 'Private dining lounge booking in the name of Deshmukh with Lodha as confirmed guest.', source: 'Credit Card Intelligence Ledger Line 88' },
      { occurredAt: '2025-01-28T14:00:00Z', title: 'Tender 1 awarded to Lodha Infracon', type: 'transaction', persons: ['Neeta Bakshi', 'Varun Lodha'], location: 'DMDA Headquarters', description: '₹58 Crore Flyover repair contract. 2 competing public sector bids disqualified at technical stage.', source: 'DMDA Tender Award Order PC-2025-01' },
      { occurredAt: '2025-02-14T11:30:00Z', title: 'First kickback transfer to Kanch LLP', type: 'transaction', persons: ['Varun Lodha'], description: '₹62,00,000 transferred via RTGS under bogus head "Consultancy Charges".', source: 'HDFC Bank Suspicious Transaction Report' },
      { occurredAt: '2025-03-19T14:00:00Z', title: 'Tender 2 awarded to Oswal Infrastructure Advisors', type: 'transaction', persons: ['Neeta Bakshi', 'Sanjay Oswal'], location: 'DMDA Headquarters', description: '₹47 Crore Smart City project. Weightage altered after bids opened.', source: 'DMDA Tender Award Order PC-2025-04' },
      { occurredAt: '2025-05-06T16:45:00Z', title: 'Vigilance Auditor flags circular transfers', type: 'event', persons: ['Gita Trivedi'], location: 'DMDA Headquarters', description: 'Vigilance inspection reveals unrelated vendors transferring funds to Kanch LLP.', source: 'Vigilance Inspection Note VN-33' },
      { occurredAt: '2025-06-20T10:00:00Z', title: 'Tender 3 awarded by Standing Committee', type: 'transaction', persons: ['Harish Chandra Mehra', 'Neeta Bakshi'], location: 'DMDA Headquarters', description: '₹37 Crore Urban Drainage contract cleared under Mehra\'s chairmanship.', source: 'DMDA Tender Award Order PC-2025-09' },
    ],
  },
];

/** Users seeded for the demo. Passwords are dev-only and printed to the console. */
export const seedUsers = [
  { name: 'Inspector Vikramaditya', email: 'investigator@demo.local', password: 'Investigate123', role: 'investigator' },
  { name: 'Dr. Archana Rao', email: 'forensic@demo.local', password: 'Forensic123', role: 'forensic' },
  { name: 'SP Rajeshwar Verma, IPS', email: 'supervisor@demo.local', password: 'Supervise123', role: 'supervisor' },
  { name: 'National Crime Portal Admin', email: 'admin@demo.local', password: 'Administer123', role: 'admin' },
];
