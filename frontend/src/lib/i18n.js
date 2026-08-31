import { create } from 'zustand';

const KEY = 'chanakya.lang';

const DICTIONARY = {
  en: {
    // Navigation & Shell
    dashboard: 'Dashboard',
    cases: 'Cases',
    people: 'People',
    biometrics: 'Biometrics',
    auditTrail: 'Audit trail',
    collapse: 'Collapse',
    expand: 'Expand',
    services: 'Services',
    servicesOnline: 'services online',
    caseFile: 'Case file',
    workspace: 'Workspace',
    signOut: 'Sign out',
    theme: 'Theme',
    language: 'Language',

    // Dashboard
    overview: 'Overview',
    goodMorning: 'Good morning',
    goodAfternoon: 'Good afternoon',
    goodEvening: 'Good evening',
    dashboardSubtitle: 'Open cases, evidence in the pipeline, and where the network stands today.',
    totalCases: 'Cases',
    evidenceItems: 'Evidence items',
    peopleOnFile: 'People on file',
    processing: 'Processing',
    active: 'active',
    acrossAllCases: 'across all cases',
    linkedToCase: 'linked to a case',
    pipelineIdle: 'pipeline idle',
    docsInPipeline: 'documents in the pipeline',
    recentCases: 'Recent cases',
    mostRecentlyUpdated: 'Most recently updated first',
    noCasesYet: 'No cases yet',
    caseload: 'Caseload',
    byStatusAndPriority: 'By status and priority',
    quickFilters: 'Quick filters',
    highPriority: 'High priority',
    underReview: 'Under review',
    criticalPriority: 'Critical priority',
    
    // Cases List & Detail
    allCases: 'All cases',
    casesSubtitle: 'Active criminal investigations, intelligence operations, and inquiries.',
    newCase: 'New case',
    searchCases: 'Search cases by title, FIR number, suspect...',
    status: 'Status',
    priority: 'Priority',
    classification: 'Classification',
    created: 'Created',
    updated: 'Updated',
    assignedOfficers: 'Assigned officers',
    entities: 'Entities',
    relationships: 'Relationships',
    timelineEvents: 'Timeline events',
    evidence: 'Evidence',
    forensics: 'Forensics',
    osint: 'OSINT',
    reports: 'Reports',
    assistant: 'Assistant',
    patterns: 'Patterns',
    map: 'Map',
    timeline: 'Timeline',
    graph: 'Relationship graph',
    influencers: 'Influencers',

    // Roles & Badges
    suspect: 'Suspect',
    victim: 'Victim',
    witness: 'Witness',
    personOfInterest: 'Person of Interest',
    restricted: 'Restricted',
    confidential: 'Confidential',
    secret: 'Secret',

    // Biometrics & Forensics
    faceRecognition: 'Face recognition',
    fingerprint: 'Fingerprint',
    dropProbePhoto: 'Drop a probe photo, or',
    chooseAnImage: 'Choose an image',
    probeSearch: '1:N biometric search with confidence scoring',
    confirmed: 'Confirmed',
    suggested: 'AI Suggested',
    inferred: 'Inferred',

    // Graph & Patterns
    influencerRank: 'Key Influencer Detection',
    betweenness: 'Betweenness',
    pagerank: 'PageRank',
    degree: 'Degree',
    community: 'Community',
    suspiciousPatterns: 'Suspicious Network Patterns',
    crossCaseBridge: 'Cross-Case Bridge',
    sharedIntermediary: 'Shared Intermediary',
    unnamedBroker: 'Unnamed Broker',
    communityBridge: 'Community Bridge',
    
    // Auth & Login
    signIn: 'Sign in',
    signInTitle: 'Sign in to Chanakya Portal',
    signInSubtitle: 'Use official law enforcement credentials or select a demo account.',
    email: 'Email ID',
    password: 'Password',
    demoAccounts: 'Demo accounts',
    investigator: 'Investigator',
    forensicOfficer: 'Forensic Officer',
    supervisor: 'Supervisor / SP',
    admin: 'System Admin',
  },

  hi: {
    // Navigation & Shell
    dashboard: 'डैशबोर्ड (Dashboard)',
    cases: 'अपराध कांड / केस (Cases)',
    people: 'संदिग्ध एवं व्यक्ति (Persons)',
    biometrics: 'बायोमेट्रिक्स (Biometrics)',
    auditTrail: 'ऑडिट लॉग (Audit Trail)',
    collapse: 'संक्षिप्त करें',
    expand: 'विस्तार करें',
    services: 'सिस्टम सेवाएं',
    servicesOnline: 'सेवाएं सक्रिय हैं',
    caseFile: 'केस पत्रावली (Case File)',
    workspace: 'कार्यक्षेत्र (Workspace)',
    signOut: 'लॉग आउट (Sign Out)',
    theme: 'थीम (Theme)',
    language: 'भाषा (Language)',

    // Dashboard
    overview: 'सिंहावलोकन (Overview)',
    goodMorning: 'शुभ प्रभात',
    goodAfternoon: 'शुभ दोपहर',
    goodEvening: 'शुभ संध्या',
    dashboardSubtitle: 'सक्रिय अनुसंधान, साक्ष्य प्रसंस्करण एवं आपराधिक नेटवर्क की वर्तमान स्थिति।',
    totalCases: 'कुल केस (Total Cases)',
    evidenceItems: 'केस साक्ष्य (Evidence Items)',
    peopleOnFile: 'दर्ज व्यक्ति / संदिग्ध (Persons)',
    processing: 'प्रसंस्करण (Processing)',
    active: 'सक्रिय (Active)',
    acrossAllCases: 'सभी मामलों में',
    linkedToCase: 'केस से संबंधित',
    pipelineIdle: 'पाइपलाइन निष्क्रिय',
    docsInPipeline: 'दस्तावेज़ प्रसंस्करण में',
    recentCases: 'हालिया केस (Recent Cases)',
    mostRecentlyUpdated: 'अद्यतन प्राथमिकता क्रम में',
    noCasesYet: 'कोई केस दर्ज नहीं है',
    caseload: 'केस विवरण व भार (Caseload)',
    byStatusAndPriority: 'स्थिति एवं संवेदनशीलता अनुसार',
    quickFilters: 'त्वरित फ़िल्टर',
    highPriority: 'उच्च प्राथमिकता (High)',
    underReview: 'समीक्षाधीन (Under Review)',
    criticalPriority: 'अति-संवेदनशील (Critical)',

    // Cases List & Detail
    allCases: 'समस्त आपराधिक मामले (All Cases)',
    casesSubtitle: 'सक्रिय आपराधिक अनुसंधान, विशेष आसूचना अभियान एवं जाँच पत्रावलियां।',
    newCase: 'नया केस दर्ज करें (New Case)',
    searchCases: 'केस शीर्षक, प्राथमिकी (FIR) संख्या, संदिग्ध से खोजें...',
    status: 'स्थिति (Status)',
    priority: 'प्राथमिकता (Priority)',
    classification: 'गोपनीयता श्रेणी (Classification)',
    created: 'पंजीकरण तिथि',
    updated: 'अंतिम अद्यतन',
    assignedOfficers: 'नामित अनुसंधान अधिकारी (IO)',
    entities: 'संबंधित इकाइयां (Entities)',
    relationships: 'सम्बन्ध सूत्र (Relationships)',
    timelineEvents: 'घटनाक्रम डायरी (Timeline)',
    evidence: 'साक्ष्य पत्रावली (Evidence)',
    forensics: 'डिजिटल फोरेंसिक (Forensics)',
    osint: 'खुला स्त्रोत आसूचना (OSINT)',
    reports: 'अनुसंधान रिपोर्ट (Reports)',
    assistant: 'एआई सहायक (AI Assistant)',
    patterns: 'संदेहास्पद पैटर्न (Patterns)',
    map: 'भौगोलिक मानचित्र (Map)',
    timeline: 'समयरेखा (Timeline)',
    graph: 'संबंध नेटवर्क ग्राफ़ (Graph)',
    influencers: 'मुख्य सूत्रधार / सरगना (Influencers)',

    // Overview & Details
    caseSummary: 'केस का संक्षिप्त विवरण (Case Summary)',
    caseNumber: 'केस / प्राथमिकी (FIR) क्रमांक',
    opened: 'पंजीकरण दिनांक',
    lastUpdated: 'अंतिम अद्यतन दिनांक',
    assigned: 'नामित अनुसंधान दल (Assigned Team)',
    peopleOnCase: 'इस केस से जुड़े व्यक्ति एवं संदिग्ध',
    onFile: 'रिकॉर्ड में दर्ज',
    noPeopleRecorded: 'कोई व्यक्ति दर्ज नहीं है',
    appearsInNCases: 'अन्य मामलों में भी सक्रिय',
    noDescription: 'कोई विवरण उपलब्ध नहीं है।',
    graphEntities: 'ग्राफ़ इकाइयां (Entities)',
    neo4jUnreachable: 'Neo4j सर्वर से संपर्क नहीं हो सका। ग्राफ़ संख्या एवं सूत्रधार विश्लेषण अस्थायी रूप से अनुपलब्ध है।',
    
    // Timeline & Actions
    allEventTypes: 'समस्त घटना प्रकार (All Types)',
    anyoneInvolved: 'संबंधित व्यक्ति (All Persons)',
    eventsCount: 'घटनाएं दर्ज',
    uploadEvidence: 'साक्ष्य दस्तावेज़ / डिजिटल फ़ाइल अपलोड करें',
    processingPipeline: 'एआई साक्ष्य निष्कर्षण व विश्लेषण पाइपलाइन',
    reprocess: 'पुनः विश्लेषण करें',
    evidenceDetails: 'साक्ष्य विवरण व निष्कर्षित इकाइयां',
    confidenceScore: 'विश्वसनीयता गुणांक (Confidence)',
    sourceEvidence: 'मूल साक्ष्य स्त्रोत',
    exportReport: 'रिपोर्ट डाउनलोड करें (Export Markdown)',
    supervisorSignoff: 'पुलिस अधीक्षक / पर्यवेक्षक डिजिटल हस्ताक्षर',
    
    // Status & Severity
    openStatus: 'खुला (Open)',
    activeStatus: 'सक्रिय अनुसंधान (Active)',
    pendingReviewStatus: 'पर्यवेक्षण हेतु लंबित (Pending Review)',
    closedStatus: 'निस्तारित / बंद (Closed)',
    coldStatus: 'अनिस्तारित / कोल्ड केस (Cold Case)',
    highSeverity: 'अति-गंभीर (High)',
    mediumSeverity: 'मध्यम (Medium)',
    lowSeverity: 'सामान्य (Low)',

    // Graph & Patterns
    influencerRank: 'नेटवर्क सूत्रधार व मुख्य साजिशकर्ता विश्लेषण',
    betweenness: 'मध्यस्थता स्कोर (Betweenness)',
    pagerank: 'पेजरैंक / प्रभाव (PageRank)',
    degree: 'प्रत्यक्ष सम्पर्क (Degree)',
    community: 'आपराधिक गिरोह / सिंडिकेट (Community)',
    suspiciousPatterns: 'संदेहास्पद नेटवर्क विसंगतियां',
    crossCaseBridge: 'अन्तर-केस सम्बन्ध सूत्र (Cross-Case Bridge)',
    sharedIntermediary: 'साझा बिचौलिया / माध्यम (Shared Intermediary)',
    unnamedBroker: 'अनामांकित सिंडिकेट सूत्रधार (Unnamed Broker)',
    communityBridge: 'दो गिरोहों को जोड़ने वाला सेतु (Community Bridge)',

    // Auth & Login
    signIn: 'प्रवेश करें (Sign in)',
    signInTitle: 'चाणक्य - राष्ट्रीय अपराध आसूचना पोर्टल',
    signInSubtitle: 'आधिकारिक कानून प्रवर्तन क्रेडेंशियल्स दर्ज करें या डेमो खाता चुनें।',
    email: 'ईमेल आईडी / यूज़रनेम',
    password: 'पासवर्ड (Password)',
    demoAccounts: 'डेमो खाते (Demo Accounts)',
    investigator: 'अनुसंधान अधिकारी (Investigator)',
    forensicOfficer: 'फोरेंसिक विशेषज्ञ (Forensic)',
    supervisor: 'पर्यवेक्षक / पुलिस अधीक्षक (SP)',
    admin: 'सिस्टम प्रशासक (Admin)',
  },
};

const readLang = () => {
  try {
    return localStorage.getItem(KEY) || 'en';
  } catch {
    return 'en';
  }
};

export const useI18n = create((set, get) => ({
  lang: readLang(),

  setLang(lang) {
    try {
      localStorage.setItem(KEY, lang);
    } catch {
      /* storage failure fallback */
    }
    set({ lang });
  },

  toggleLang() {
    const next = get().lang === 'en' ? 'hi' : 'en';
    get().setLang(next);
  },

  t(key, fallback = '') {
    const currentLang = get().lang;
    return DICTIONARY[currentLang]?.[key] || DICTIONARY.en?.[key] || fallback || key;
  },
}));
