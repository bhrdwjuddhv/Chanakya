/**
 * FICTIONAL PROTOTYPE DATA. Every person, company, address, phone number and vehicle
 * below is invented for demonstration. Any resemblance to real people or events is
 * coincidental.
 *
 * The three case graphs are shaped deliberately:
 *  - Marcus Vale appears in Harbor Shadow AND Riverfront  -> cross-case bridge pattern
 *  - Ledger Glass Consulting is a shared intermediary      -> shared-intermediary pattern
 *  - Iris Delacroix is the only link between two clusters  -> high-betweenness broker
 *    who is not a named suspect, and a Louvain community bridge
 */

export const seedCases = [
  {
    caseNumber: 'CASE-2025-001',
    title: 'Operation Harbor Shadow',
    description:
      'Series of high-value cargo thefts from bonded warehouses at Pier 14. Losses estimated at $2.4M across seven incidents. Suspected inside assistance from warehouse staff.',
    status: 'active',
    priority: 'high',
    classification: 'restricted',

    entities: [
      { type: 'Person', name: 'Marcus Vale', role: 'suspect', aliases: ['The Harbourmaster'], attributes: { age: 47, note: 'Believed to coordinate crews; no direct handling of goods.' } },
      { type: 'Person', name: 'Dmitri Sokolov', role: 'suspect', attributes: { age: 39, note: 'Suspected crew lead on the Pier 14 entries.' } },
      { type: 'Person', name: 'Elena Rask', role: 'suspect', attributes: { age: 52, note: 'Antiques dealer; suspected fence for stolen cargo.' } },
      { type: 'Person', name: 'Tommy Nguyen', role: 'person_of_interest', attributes: { age: 28, note: 'Night-shift warehouse clerk at Harbor Logistics.' } },
      { type: 'Person', name: 'Ray Okafor', role: 'person_of_interest', attributes: { age: 34, note: 'Contract driver; three deliveries match incident nights.' } },
      { type: 'Person', name: 'Priya Chandra', role: 'witness', attributes: { age: 41, note: 'Logistics coordinator; reported the manifest discrepancies.' } },

      { type: 'Organization', name: 'Harbor Logistics Ltd', attributes: { sector: 'freight', note: 'Operator of the Pier 14 bonded warehouse.' } },
      { type: 'Organization', name: 'Vale Freight Holdings', attributes: { sector: 'freight', note: 'Shell-like holding company registered to M. Vale.' } },
      { type: 'Organization', name: 'Northside Auto Salvage', attributes: { sector: 'salvage', note: 'Suspected transfer point for stolen cargo.' } },
      { type: 'Organization', name: 'Rask Antiques', attributes: { sector: 'retail' } },

      { type: 'Location', name: 'Pier 14 Warehouse', attributes: { address: '14 Harbor Approach', lat: 40.7012, lng: -74.0165 } },
      { type: 'Location', name: 'Northside Salvage Yard', attributes: { address: '880 Northside Ave', lat: 40.7331, lng: -74.0402 } },
      { type: 'Location', name: 'Rask Antiques Storefront', attributes: { address: '22 Camden Row', lat: 40.7185, lng: -73.9998 } },

      { type: 'Vehicle', name: 'White box truck WGT-4417', attributes: { plate: 'WGT-4417', make: 'Isuzu', colour: 'white' } },
      { type: 'Vehicle', name: 'Black sedan KDP-8823', attributes: { plate: 'KDP-8823', make: 'Audi', colour: 'black' } },

      { type: 'Phone', name: '+1-415-555-0142', attributes: { carrier: 'prepaid', note: 'Burner active only on incident nights.' } },
      { type: 'Phone', name: '+1-415-555-0197', attributes: { carrier: 'postpaid' } },
    ],

    relationships: [
      { from: 'Marcus Vale', to: 'Dmitri Sokolov', type: 'KNOWS', status: 'CONFIRMED', confidence: 0.95, snippet: 'Surveillance places both at the Northside yard on four separate nights.' },
      { from: 'Marcus Vale', to: 'Vale Freight Holdings', type: 'OWNS', status: 'CONFIRMED', confidence: 1, snippet: 'Companies registry lists M. Vale as sole director.' },
      { from: 'Marcus Vale', to: 'Elena Rask', type: 'ASSOCIATED_WITH', status: 'AI_SUGGESTED', confidence: 0.68, snippet: 'Two intercepted messages reference "handing the load to E."' },
      { from: 'Marcus Vale', to: 'Black sedan KDP-8823', type: 'USED', status: 'CONFIRMED', confidence: 0.9 },
      { from: 'Marcus Vale', to: '+1-415-555-0142', type: 'USED', status: 'INFERRED', confidence: 0.72, snippet: 'Handset tower data mirrors Vale\'s known movements on six of seven nights.' },

      { from: 'Dmitri Sokolov', to: 'Tommy Nguyen', type: 'KNOWS', status: 'CONFIRMED', confidence: 0.88, snippet: 'Nguyen admitted to two meetings with Sokolov in interview.' },
      { from: 'Dmitri Sokolov', to: 'White box truck WGT-4417', type: 'USED', status: 'CONFIRMED', confidence: 0.93 },
      { from: 'Dmitri Sokolov', to: 'Pier 14 Warehouse', type: 'VISITED', status: 'CONFIRMED', confidence: 0.97 },
      { from: 'Dmitri Sokolov', to: 'Ray Okafor', type: 'ASSOCIATED_WITH', status: 'AI_SUGGESTED', confidence: 0.55 },

      { from: 'Tommy Nguyen', to: 'Harbor Logistics Ltd', type: 'ASSOCIATED_WITH', status: 'CONFIRMED', confidence: 1, snippet: 'Employment record: night-shift clerk since 2022.' },
      { from: 'Tommy Nguyen', to: 'Pier 14 Warehouse', type: 'LOCATED_AT', status: 'CONFIRMED', confidence: 1 },
      { from: 'Tommy Nguyen', to: '+1-415-555-0197', type: 'USED', status: 'CONFIRMED', confidence: 1 },

      { from: 'Ray Okafor', to: 'White box truck WGT-4417', type: 'USED', status: 'INFERRED', confidence: 0.64 },
      { from: 'Ray Okafor', to: 'Northside Salvage Yard', type: 'VISITED', status: 'CONFIRMED', confidence: 0.85 },

      { from: 'Elena Rask', to: 'Rask Antiques', type: 'OWNS', status: 'CONFIRMED', confidence: 1 },
      { from: 'Elena Rask', to: 'Rask Antiques Storefront', type: 'LOCATED_AT', status: 'CONFIRMED', confidence: 1 },
      { from: 'Elena Rask', to: 'Northside Auto Salvage', type: 'ASSOCIATED_WITH', status: 'AI_SUGGESTED', confidence: 0.6 },

      { from: 'Vale Freight Holdings', to: 'Northside Auto Salvage', type: 'ASSOCIATED_WITH', status: 'INFERRED', confidence: 0.7, snippet: 'Both companies share a registered agent and a filing address.' },
      { from: 'Northside Auto Salvage', to: 'Northside Salvage Yard', type: 'LOCATED_AT', status: 'CONFIRMED', confidence: 1 },
      { from: 'Harbor Logistics Ltd', to: 'Pier 14 Warehouse', type: 'OWNS', status: 'CONFIRMED', confidence: 1 },
      { from: 'Priya Chandra', to: 'Harbor Logistics Ltd', type: 'ASSOCIATED_WITH', status: 'CONFIRMED', confidence: 1 },
      { from: 'Priya Chandra', to: 'Tommy Nguyen', type: 'KNOWS', status: 'CONFIRMED', confidence: 0.8, snippet: 'Colleagues on overlapping shifts.' },
    ],

    locations: [
      { name: 'Pier 14 Warehouse', address: '14 Harbor Approach', lat: 40.7012, lng: -74.0165, type: 'crime_scene', description: 'Point of entry for all seven incidents. Rear loading bay lock defeated without damage.' },
      { name: 'Northside Salvage Yard', address: '880 Northside Ave', lat: 40.7331, lng: -74.0402, type: 'site', description: 'Suspected transfer point. Two vehicles of interest observed here on incident nights.' },
      { name: 'Rask Antiques Storefront', address: '22 Camden Row', lat: 40.7185, lng: -73.9998, type: 'business', description: 'Retail premises of Elena Rask.' },
    ],

    timeline: [
      { occurredAt: '2025-01-14T23:40:00Z', title: 'First cargo theft reported', type: 'event', persons: ['Priya Chandra'], location: 'Pier 14 Warehouse', description: 'Manifest short by 40 units of electronics. No forced entry.', source: 'Incident report HS-001' },
      { occurredAt: '2025-02-03T02:15:00Z', title: 'White box truck seen leaving Pier 14', type: 'movement', persons: ['Dmitri Sokolov'], location: 'Pier 14 Warehouse', description: 'CCTV captures WGT-4417 departing the rear bay outside scheduled hours.', source: 'CCTV log 0203-B' },
      { occurredAt: '2025-02-03T03:05:00Z', title: 'Same truck arrives at Northside yard', type: 'movement', persons: ['Ray Okafor'], location: 'Northside Salvage Yard', description: 'ANPR hit 50 minutes after departure from Pier 14.', source: 'ANPR feed' },
      { occurredAt: '2025-03-11T19:20:00Z', title: 'Burner handset activated', type: 'communication', persons: ['Marcus Vale'], description: 'Prepaid number +1-415-555-0142 first appears on the network, near the Northside yard.', source: 'Call data record' },
      { occurredAt: '2025-04-02T10:00:00Z', title: 'Nguyen interviewed', type: 'event', persons: ['Tommy Nguyen'], description: 'Admits two meetings with Sokolov. Denies knowledge of the thefts.', source: 'Interview transcript IV-19' },
      { occurredAt: '2025-05-19T14:30:00Z', title: 'Chandra reports manifest discrepancies', type: 'event', persons: ['Priya Chandra'], location: 'Pier 14 Warehouse', description: 'Six months of gate logs do not reconcile with outbound manifests.', source: 'Witness statement WS-07' },
    ],
  },

  {
    caseNumber: 'CASE-2025-002',
    title: 'Riverfront Disappearance',
    description:
      'Dr. Alina Petrova, a materials researcher at the Riverfront Bioscience Institute, was last seen on the riverfront walkway on 8 March 2025. No body, no ransom contact, no financial activity since.',
    status: 'active',
    priority: 'critical',
    classification: 'confidential',

    entities: [
      { type: 'Person', name: 'Alina Petrova', role: 'victim', attributes: { age: 36, note: 'Missing person. Senior researcher, composite materials.' } },
      { type: 'Person', name: 'Jonas Kerr', role: 'suspect', attributes: { age: 44, note: 'Lab colleague. Disputed authorship of a patent filing with Petrova.' } },
      { type: 'Person', name: 'Sofia Alvarez', role: 'witness', attributes: { age: 29, note: 'Last confirmed sighting; passed Petrova on the walkway at 19:10.' } },
      // Deliberate cross-case bridge: also a suspect in Operation Harbor Shadow.
      { type: 'Person', name: 'Marcus Vale', role: 'person_of_interest', attributes: { note: 'Appears in this case through a logistics contract with the Institute.' } },
      { type: 'Person', name: 'Dr. Helena Fross', role: 'witness', attributes: { age: 58, note: 'Institute director.' } },

      { type: 'Organization', name: 'Riverfront Bioscience Institute', attributes: { sector: 'research' } },
      { type: 'Organization', name: 'Vale Freight Holdings', attributes: { sector: 'freight' } },

      { type: 'Location', name: 'Riverfront Walkway', attributes: { address: 'Riverfront Walkway, east reach', lat: 40.7422, lng: -74.0102 } },
      { type: 'Location', name: 'Institute Lab B', attributes: { address: '3 Foundry Lane', lat: 40.7466, lng: -74.0051 } },
      { type: 'Location', name: 'Kerr Residence', attributes: { address: '61 Alder Street', lat: 40.7529, lng: -73.9944 } },

      { type: 'Vehicle', name: 'Grey estate car RTM-2290', attributes: { plate: 'RTM-2290', make: 'Volvo', colour: 'grey' } },
      { type: 'Phone', name: '+1-415-555-0331', attributes: { carrier: 'postpaid', note: 'Petrova\'s handset. Last ping 19:26, then off.' } },
      { type: 'Email', name: 'a.petrova@riverfront-bio.example', attributes: {} },
    ],

    relationships: [
      { from: 'Alina Petrova', to: 'Riverfront Bioscience Institute', type: 'ASSOCIATED_WITH', status: 'CONFIRMED', confidence: 1 },
      { from: 'Alina Petrova', to: 'Institute Lab B', type: 'LOCATED_AT', status: 'CONFIRMED', confidence: 1 },
      { from: 'Alina Petrova', to: '+1-415-555-0331', type: 'USED', status: 'CONFIRMED', confidence: 1 },
      { from: 'Alina Petrova', to: 'a.petrova@riverfront-bio.example', type: 'USED', status: 'CONFIRMED', confidence: 1 },
      { from: 'Alina Petrova', to: 'Riverfront Walkway', type: 'VISITED', status: 'CONFIRMED', confidence: 0.95, snippet: 'Alvarez places her on the east reach at 19:10.' },
      { from: 'Alina Petrova', to: 'Jonas Kerr', type: 'KNOWS', status: 'CONFIRMED', confidence: 1, snippet: 'Co-authors on four papers; named in the same patent dispute.' },

      { from: 'Jonas Kerr', to: 'Riverfront Bioscience Institute', type: 'ASSOCIATED_WITH', status: 'CONFIRMED', confidence: 1 },
      { from: 'Jonas Kerr', to: 'Kerr Residence', type: 'LOCATED_AT', status: 'CONFIRMED', confidence: 1 },
      { from: 'Jonas Kerr', to: 'Grey estate car RTM-2290', type: 'OWNS', status: 'CONFIRMED', confidence: 1 },
      { from: 'Jonas Kerr', to: 'Riverfront Walkway', type: 'VISITED', status: 'AI_SUGGESTED', confidence: 0.58, snippet: 'A grey estate matching RTM-2290 passes the walkway camera at 19:31.' },

      { from: 'Sofia Alvarez', to: 'Riverfront Walkway', type: 'VISITED', status: 'CONFIRMED', confidence: 1 },
      { from: 'Sofia Alvarez', to: 'Alina Petrova', type: 'KNOWS', status: 'INFERRED', confidence: 0.4, snippet: 'Alvarez states they recognised each other from the running club.' },

      { from: 'Marcus Vale', to: 'Vale Freight Holdings', type: 'OWNS', status: 'CONFIRMED', confidence: 1 },
      { from: 'Vale Freight Holdings', to: 'Riverfront Bioscience Institute', type: 'ASSOCIATED_WITH', status: 'CONFIRMED', confidence: 0.9, snippet: 'Vale Freight held the Institute\'s specimen transport contract from 2023.' },
      { from: 'Marcus Vale', to: 'Institute Lab B', type: 'VISITED', status: 'AI_SUGGESTED', confidence: 0.52, snippet: 'Visitor log shows an "M. Vale" signed into Lab B on 6 March.' },

      { from: 'Dr. Helena Fross', to: 'Riverfront Bioscience Institute', type: 'ASSOCIATED_WITH', status: 'CONFIRMED', confidence: 1 },
      { from: 'Dr. Helena Fross', to: 'Jonas Kerr', type: 'KNOWS', status: 'CONFIRMED', confidence: 1 },
      { from: 'Dr. Helena Fross', to: 'Alina Petrova', type: 'KNOWS', status: 'CONFIRMED', confidence: 1 },
      { from: 'Riverfront Bioscience Institute', to: 'Institute Lab B', type: 'OWNS', status: 'CONFIRMED', confidence: 1 },
    ],

    locations: [
      { name: 'Riverfront Walkway', address: 'Riverfront Walkway, east reach', lat: 40.7422, lng: -74.0102, type: 'crime_scene', description: 'Last confirmed sighting at 19:10 on 8 March. No CCTV coverage between markers 4 and 7.' },
      { name: 'Institute Lab B', address: '3 Foundry Lane', lat: 40.7466, lng: -74.0051, type: 'site', description: 'Petrova\'s workplace. Badge log shows exit at 18:52.' },
      { name: 'Kerr Residence', address: '61 Alder Street', lat: 40.7529, lng: -73.9944, type: 'residence', description: 'Home address of Jonas Kerr, 1.4km from the walkway.' },
    ],

    timeline: [
      { occurredAt: '2025-02-24T11:00:00Z', title: 'Patent dispute filed', type: 'event', persons: ['Alina Petrova', 'Jonas Kerr'], description: 'Petrova formally contests Kerr\'s sole authorship on the composite filing.', source: 'Institute HR record' },
      { occurredAt: '2025-03-06T15:40:00Z', title: 'Visitor "M. Vale" signs into Lab B', type: 'event', persons: ['Marcus Vale'], location: 'Institute Lab B', description: 'Handwritten visitor log entry; no badge issued, no host recorded.', source: 'Visitor log page 212' },
      { occurredAt: '2025-03-08T18:52:00Z', title: 'Petrova exits Lab B', type: 'movement', persons: ['Alina Petrova'], location: 'Institute Lab B', description: 'Badge log records exit through the north door.', source: 'Access control export' },
      { occurredAt: '2025-03-08T19:10:00Z', title: 'Last confirmed sighting', type: 'event', persons: ['Alina Petrova', 'Sofia Alvarez'], location: 'Riverfront Walkway', description: 'Alvarez passes Petrova walking east. Describes her as "in a hurry, on the phone".', source: 'Witness statement WS-11' },
      { occurredAt: '2025-03-08T19:26:00Z', title: 'Petrova handset goes dark', type: 'communication', persons: ['Alina Petrova'], description: 'Final tower ping on the east reach, then no further network activity.', source: 'Call data record' },
      { occurredAt: '2025-03-08T19:31:00Z', title: 'Grey estate car passes walkway camera', type: 'movement', persons: ['Jonas Kerr'], location: 'Riverfront Walkway', description: 'Partial plate consistent with RTM-2290. Driver not identifiable.', source: 'CCTV still 0308-R' },
      { occurredAt: '2025-03-09T09:00:00Z', title: 'Missing person report filed', type: 'event', persons: ['Dr. Helena Fross'], description: 'Reported by the Institute after Petrova failed to attend a scheduled review.', source: 'MP report 2025-0309' },
    ],
  },

  {
    caseNumber: 'CASE-2025-003',
    title: 'Project Ledger Glass',
    description:
      'Suspected bid-rigging and kickbacks across three municipal infrastructure contracts totalling $18.6M. Award decisions cluster around a small group of vendors with no apparent connection to each other.',
    status: 'active',
    priority: 'high',
    classification: 'confidential',

    entities: [
      // City hall cluster
      { type: 'Person', name: 'Harold Meade', role: 'suspect', attributes: { age: 61, note: 'City councillor, chair of the procurement committee.' } },
      { type: 'Person', name: 'Nadia Brandt', role: 'suspect', attributes: { age: 45, note: 'Senior procurement officer. Signed off all three awards.' } },
      { type: 'Person', name: 'Grace Tan', role: 'witness', attributes: { age: 38, note: 'Internal auditor who raised the original flag.' } },
      // Contractor cluster
      { type: 'Person', name: 'Victor Lindqvist', role: 'suspect', attributes: { age: 53, note: 'Principal of Lindqvist Build Group.' } },
      { type: 'Person', name: 'Selim Okonkwo', role: 'suspect', attributes: { age: 49, note: 'Consultant retained on two of the three tenders.' } },
      { type: 'Person', name: 'Ana Ruiz', role: 'person_of_interest', attributes: { age: 33, note: 'Lindqvist Build bid writer.' } },
      // The broker. Not a named suspect, but the only path between the two clusters.
      { type: 'Person', name: 'Iris Delacroix', role: 'person_of_interest', attributes: { age: 41, note: 'Company secretary for Ledger Glass Consulting. Not named in any complaint.' } },

      { type: 'Organization', name: 'Ledger Glass Consulting', attributes: { sector: 'consulting', note: 'Receives payments from all three vendors. No employees, no premises.' } },
      { type: 'Organization', name: 'Meridian Civic Contracts', attributes: { sector: 'public' } },
      { type: 'Organization', name: 'Lindqvist Build Group', attributes: { sector: 'construction' } },
      { type: 'Organization', name: 'Okonkwo Advisory', attributes: { sector: 'consulting' } },

      { type: 'Location', name: 'City Procurement Office', attributes: { address: '1 Civic Plaza', lat: 40.7128, lng: -74.006 } },
      { type: 'Location', name: 'Ledger Glass Registered Address', attributes: { address: 'Suite 400, 91 Chandler Street', lat: 40.7259, lng: -73.9954 } },
      { type: 'Location', name: 'Lindqvist Build Yard', attributes: { address: '17 Foundry Road', lat: 40.6982, lng: -74.0233 } },

      { type: 'Email', name: 'accounts@ledgerglass.example', attributes: { note: 'Single mailbox receiving invoices from all three vendors.' } },
      { type: 'Phone', name: '+1-415-555-0288', attributes: { note: 'Listed on Ledger Glass filings and on two vendor invoices.' } },
    ],

    relationships: [
      // City hall cluster (Louvain community A)
      { from: 'Harold Meade', to: 'Meridian Civic Contracts', type: 'ASSOCIATED_WITH', status: 'CONFIRMED', confidence: 1 },
      { from: 'Harold Meade', to: 'Nadia Brandt', type: 'KNOWS', status: 'CONFIRMED', confidence: 1, snippet: 'Sat on the same procurement committee for four years.' },
      { from: 'Harold Meade', to: 'City Procurement Office', type: 'LOCATED_AT', status: 'CONFIRMED', confidence: 1 },
      { from: 'Nadia Brandt', to: 'Meridian Civic Contracts', type: 'ASSOCIATED_WITH', status: 'CONFIRMED', confidence: 1 },
      { from: 'Nadia Brandt', to: 'City Procurement Office', type: 'LOCATED_AT', status: 'CONFIRMED', confidence: 1 },
      { from: 'Grace Tan', to: 'Meridian Civic Contracts', type: 'ASSOCIATED_WITH', status: 'CONFIRMED', confidence: 1 },
      { from: 'Grace Tan', to: 'Nadia Brandt', type: 'KNOWS', status: 'CONFIRMED', confidence: 0.9 },
      { from: 'Grace Tan', to: 'City Procurement Office', type: 'LOCATED_AT', status: 'CONFIRMED', confidence: 1 },
      { from: 'Meridian Civic Contracts', to: 'City Procurement Office', type: 'LOCATED_AT', status: 'CONFIRMED', confidence: 1 },

      // Contractor cluster (Louvain community B)
      { from: 'Victor Lindqvist', to: 'Lindqvist Build Group', type: 'OWNS', status: 'CONFIRMED', confidence: 1 },
      { from: 'Victor Lindqvist', to: 'Lindqvist Build Yard', type: 'LOCATED_AT', status: 'CONFIRMED', confidence: 1 },
      { from: 'Ana Ruiz', to: 'Lindqvist Build Group', type: 'ASSOCIATED_WITH', status: 'CONFIRMED', confidence: 1 },
      { from: 'Ana Ruiz', to: 'Victor Lindqvist', type: 'KNOWS', status: 'CONFIRMED', confidence: 1 },
      { from: 'Ana Ruiz', to: 'Lindqvist Build Yard', type: 'LOCATED_AT', status: 'CONFIRMED', confidence: 0.8 },
      { from: 'Selim Okonkwo', to: 'Okonkwo Advisory', type: 'OWNS', status: 'CONFIRMED', confidence: 1 },
      { from: 'Selim Okonkwo', to: 'Victor Lindqvist', type: 'KNOWS', status: 'AI_SUGGESTED', confidence: 0.62, snippet: 'Both attended the same three pre-tender briefings.' },
      { from: 'Lindqvist Build Group', to: 'Okonkwo Advisory', type: 'ASSOCIATED_WITH', status: 'INFERRED', confidence: 0.55 },

      // Shared intermediary: every vendor pays the same entity.
      { from: 'Lindqvist Build Group', to: 'Ledger Glass Consulting', type: 'ASSOCIATED_WITH', status: 'CONFIRMED', confidence: 0.95, snippet: 'Eleven invoices totalling $410,000 for "advisory services", no deliverables attached.' },
      { from: 'Okonkwo Advisory', to: 'Ledger Glass Consulting', type: 'ASSOCIATED_WITH', status: 'CONFIRMED', confidence: 0.95, snippet: 'Six invoices totalling $265,000, identical wording to the Lindqvist invoices.' },
      { from: 'Meridian Civic Contracts', to: 'Ledger Glass Consulting', type: 'ASSOCIATED_WITH', status: 'AI_SUGGESTED', confidence: 0.6, snippet: 'One payment routed via a subcontractor line item.' },
      { from: 'Ledger Glass Consulting', to: 'accounts@ledgerglass.example', type: 'USED', status: 'CONFIRMED', confidence: 1 },
      { from: 'Ledger Glass Consulting', to: '+1-415-555-0288', type: 'USED', status: 'CONFIRMED', confidence: 1 },
      { from: 'Ledger Glass Consulting', to: 'Ledger Glass Registered Address', type: 'LOCATED_AT', status: 'CONFIRMED', confidence: 1 },

      // Iris Delacroix: the only bridge between the two clusters.
      { from: 'Iris Delacroix', to: 'Ledger Glass Consulting', type: 'OWNS', status: 'CONFIRMED', confidence: 1, snippet: 'Sole named officer on the Ledger Glass incorporation filing.' },
      { from: 'Iris Delacroix', to: 'Nadia Brandt', type: 'KNOWS', status: 'AI_SUGGESTED', confidence: 0.66, snippet: 'Eighteen calls between the two handsets in the fortnight before each award.' },
      { from: 'Iris Delacroix', to: 'Victor Lindqvist', type: 'KNOWS', status: 'AI_SUGGESTED', confidence: 0.64, snippet: 'Both listed as attendees on a private dinner booking, 11 January.' },
      { from: 'Iris Delacroix', to: 'Selim Okonkwo', type: 'ASSOCIATED_WITH', status: 'INFERRED', confidence: 0.58 },
      { from: 'Iris Delacroix', to: 'Harold Meade', type: 'ASSOCIATED_WITH', status: 'AI_SUGGESTED', confidence: 0.51, snippet: 'Named on the same charity board minutes as Meade in 2023.' },
      { from: 'Iris Delacroix', to: '+1-415-555-0288', type: 'USED', status: 'CONFIRMED', confidence: 0.9 },
    ],

    locations: [
      { name: 'City Procurement Office', address: '1 Civic Plaza', lat: 40.7128, lng: -74.006, type: 'site', description: 'Where all three tenders were evaluated and awarded.' },
      { name: 'Ledger Glass Registered Address', address: 'Suite 400, 91 Chandler Street', lat: 40.7259, lng: -73.9954, type: 'business', description: 'Mail-forwarding suite. Site visit found no office and no staff.' },
      { name: 'Lindqvist Build Yard', address: '17 Foundry Road', lat: 40.6982, lng: -74.0233, type: 'business', description: 'Operating yard of Lindqvist Build Group.' },
    ],

    timeline: [
      { occurredAt: '2024-11-02T09:00:00Z', title: 'Ledger Glass Consulting incorporated', type: 'event', persons: ['Iris Delacroix'], location: 'Ledger Glass Registered Address', description: 'Sole officer: I. Delacroix. Registered at a mail-forwarding suite.', source: 'Companies registry extract' },
      { occurredAt: '2025-01-11T20:00:00Z', title: 'Private dinner booking', type: 'event', persons: ['Iris Delacroix', 'Victor Lindqvist'], description: 'Restaurant booking for six under the Delacroix name; Lindqvist listed as a guest.', source: 'Card statement line 88' },
      { occurredAt: '2025-01-28T14:00:00Z', title: 'Tender 1 awarded to Lindqvist Build Group', type: 'transaction', persons: ['Nadia Brandt', 'Victor Lindqvist'], location: 'City Procurement Office', description: '$7.2M. Two of three competing bids withdrawn in the final week.', source: 'Award notice PC-2025-01' },
      { occurredAt: '2025-02-14T11:30:00Z', title: 'First Ledger Glass invoice paid', type: 'transaction', persons: ['Victor Lindqvist'], description: '$62,000 for "advisory services". No scope, no deliverable, no timesheet.', source: 'Ledger export LG-014' },
      { occurredAt: '2025-03-19T14:00:00Z', title: 'Tender 2 awarded to Okonkwo Advisory', type: 'transaction', persons: ['Nadia Brandt', 'Selim Okonkwo'], location: 'City Procurement Office', description: '$5.9M. Scoring sheet shows a late adjustment to the technical weighting.', source: 'Award notice PC-2025-04' },
      { occurredAt: '2025-05-06T16:45:00Z', title: 'Auditor flags payment pattern', type: 'event', persons: ['Grace Tan'], location: 'City Procurement Office', description: 'Tan notes that three unrelated vendors all pay the same consulting entity.', source: 'Internal audit memo IA-33' },
      { occurredAt: '2025-06-20T10:00:00Z', title: 'Tender 3 awarded', type: 'transaction', persons: ['Harold Meade', 'Nadia Brandt'], location: 'City Procurement Office', description: '$5.5M. Committee chaired by Meade; Brandt signs off.', source: 'Award notice PC-2025-09' },
    ],
  },
];

/** Users seeded for the demo. Passwords are dev-only and printed to the console. */
export const seedUsers = [
  { name: 'Dana Whitlock', email: 'investigator@demo.local', password: 'Investigate123', role: 'investigator' },
  { name: 'Owen Baptiste', email: 'forensic@demo.local', password: 'Forensic123', role: 'forensic' },
  { name: 'Miriam Cole', email: 'supervisor@demo.local', password: 'Supervise123', role: 'supervisor' },
  { name: 'Root Admin', email: 'admin@demo.local', password: 'Administer123', role: 'admin' },
];
