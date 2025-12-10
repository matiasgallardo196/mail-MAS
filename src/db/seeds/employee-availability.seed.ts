// Employee Availability data extracted from Excel
// Format: { externalCode, date (YYYY-MM-DD), shiftCode }
// Only include days where shiftCode is not "/" (not available)

export const employeeAvailabilitySeed = [
  // Week 1: Dec 9-15, 2024
  // James Smith (1001)
  { externalCode: 1001, date: '2024-12-09', shiftCode: '1F' },
  { externalCode: 1001, date: '2024-12-10', shiftCode: '2F' },
  { externalCode: 1001, date: '2024-12-11', shiftCode: '3F' },
  { externalCode: 1001, date: '2024-12-12', shiftCode: '1F' },
  { externalCode: 1001, date: '2024-12-13', shiftCode: '2F' },
  { externalCode: 1001, date: '2024-12-15', shiftCode: '3F' },
  // Week 2: Dec 16-22, 2024
  { externalCode: 1001, date: '2024-12-16', shiftCode: '1F' },
  { externalCode: 1001, date: '2024-12-17', shiftCode: '2F' },
  { externalCode: 1001, date: '2024-12-18', shiftCode: '3F' },
  { externalCode: 1001, date: '2024-12-19', shiftCode: '1F' },
  { externalCode: 1001, date: '2024-12-21', shiftCode: '1F' },

  // Emma Johnson (1002)
  { externalCode: 1002, date: '2024-12-09', shiftCode: '1F' },
  { externalCode: 1002, date: '2024-12-11', shiftCode: '3F' },
  { externalCode: 1002, date: '2024-12-12', shiftCode: '1F' },
  { externalCode: 1002, date: '2024-12-13', shiftCode: '2F' },
  { externalCode: 1002, date: '2024-12-14', shiftCode: '1F' },
  { externalCode: 1002, date: '2024-12-15', shiftCode: '3F' },
  { externalCode: 1002, date: '2024-12-16', shiftCode: '1F' },
  { externalCode: 1002, date: '2024-12-17', shiftCode: '2F' },
  { externalCode: 1002, date: '2024-12-19', shiftCode: '1F' },
  { externalCode: 1002, date: '2024-12-20', shiftCode: '2F' },
  { externalCode: 1002, date: '2024-12-21', shiftCode: '1F' },
  { externalCode: 1002, date: '2024-12-22', shiftCode: '3F' },

  // Oliver Williams (1003)
  { externalCode: 1003, date: '2024-12-09', shiftCode: '1F' },
  { externalCode: 1003, date: '2024-12-10', shiftCode: '2F' },
  { externalCode: 1003, date: '2024-12-11', shiftCode: '3F' },
  { externalCode: 1003, date: '2024-12-12', shiftCode: '1F' },
  { externalCode: 1003, date: '2024-12-13', shiftCode: '2F' },
  { externalCode: 1003, date: '2024-12-14', shiftCode: '1F' },
  { externalCode: 1003, date: '2024-12-18', shiftCode: '3F' },
  { externalCode: 1003, date: '2024-12-19', shiftCode: '1F' },
  { externalCode: 1003, date: '2024-12-20', shiftCode: '2F' },
  { externalCode: 1003, date: '2024-12-21', shiftCode: '1F' },
  { externalCode: 1003, date: '2024-12-22', shiftCode: '3F' },

  // Sophia Brown (1004)
  { externalCode: 1004, date: '2024-12-09', shiftCode: '1F' },
  { externalCode: 1004, date: '2024-12-10', shiftCode: '2F' },
  { externalCode: 1004, date: '2024-12-11', shiftCode: '3F' },
  { externalCode: 1004, date: '2024-12-13', shiftCode: '2F' },
  { externalCode: 1004, date: '2024-12-14', shiftCode: '1F' },
  { externalCode: 1004, date: '2024-12-16', shiftCode: '1F' },
  { externalCode: 1004, date: '2024-12-17', shiftCode: '2F' },
  { externalCode: 1004, date: '2024-12-18', shiftCode: '3F' },
  { externalCode: 1004, date: '2024-12-19', shiftCode: '1F' },
  { externalCode: 1004, date: '2024-12-20', shiftCode: '2F' },
  { externalCode: 1004, date: '2024-12-21', shiftCode: '1F' },

  // William Jones (1005)
  { externalCode: 1005, date: '2024-12-09', shiftCode: '1F' },
  { externalCode: 1005, date: '2024-12-10', shiftCode: '2F' },
  { externalCode: 1005, date: '2024-12-11', shiftCode: '3F' },
  { externalCode: 1005, date: '2024-12-12', shiftCode: '1F' },
  { externalCode: 1005, date: '2024-12-14', shiftCode: '1F' },
  { externalCode: 1005, date: '2024-12-15', shiftCode: '3F' },
  { externalCode: 1005, date: '2024-12-16', shiftCode: '1F' },
  { externalCode: 1005, date: '2024-12-17', shiftCode: '2F' },
  { externalCode: 1005, date: '2024-12-19', shiftCode: '1F' },
  { externalCode: 1005, date: '2024-12-20', shiftCode: '2F' },

  // Ava Garcia (1006)
  { externalCode: 1006, date: '2024-12-09', shiftCode: '1F' },
  { externalCode: 1006, date: '2024-12-10', shiftCode: '2F' },
  { externalCode: 1006, date: '2024-12-11', shiftCode: '3F' },
  { externalCode: 1006, date: '2024-12-12', shiftCode: '1F' },
  { externalCode: 1006, date: '2024-12-13', shiftCode: '2F' },
  { externalCode: 1006, date: '2024-12-14', shiftCode: '1F' },
  { externalCode: 1006, date: '2024-12-16', shiftCode: '1F' },
  { externalCode: 1006, date: '2024-12-17', shiftCode: '2F' },
  { externalCode: 1006, date: '2024-12-18', shiftCode: '3F' },
  { externalCode: 1006, date: '2024-12-19', shiftCode: '1F' },
  { externalCode: 1006, date: '2024-12-20', shiftCode: '2F' },
  { externalCode: 1006, date: '2024-12-21', shiftCode: '1F' },
  { externalCode: 1006, date: '2024-12-22', shiftCode: '3F' },

  // Jack Miller (1007)
  { externalCode: 1007, date: '2024-12-09', shiftCode: '1F' },
  { externalCode: 1007, date: '2024-12-11', shiftCode: '3F' },
  { externalCode: 1007, date: '2024-12-13', shiftCode: '2F' },
  { externalCode: 1007, date: '2024-12-14', shiftCode: '1F' },
  { externalCode: 1007, date: '2024-12-16', shiftCode: '1F' },
  { externalCode: 1007, date: '2024-12-18', shiftCode: '3F' },
  { externalCode: 1007, date: '2024-12-20', shiftCode: '2F' },
  { externalCode: 1007, date: '2024-12-21', shiftCode: '1F' },
  { externalCode: 1007, date: '2024-12-22', shiftCode: '3F' },

  // Mia Davis (1008)
  { externalCode: 1008, date: '2024-12-09', shiftCode: '1F' },
  { externalCode: 1008, date: '2024-12-10', shiftCode: '2F' },
  { externalCode: 1008, date: '2024-12-11', shiftCode: '3F' },
  { externalCode: 1008, date: '2024-12-12', shiftCode: '1F' },
  { externalCode: 1008, date: '2024-12-13', shiftCode: '2F' },
  { externalCode: 1008, date: '2024-12-14', shiftCode: '1F' },
  { externalCode: 1008, date: '2024-12-16', shiftCode: '1F' },
  { externalCode: 1008, date: '2024-12-17', shiftCode: '2F' },
  { externalCode: 1008, date: '2024-12-18', shiftCode: '3F' },
  { externalCode: 1008, date: '2024-12-19', shiftCode: '1F' },
  { externalCode: 1008, date: '2024-12-20', shiftCode: '2F' },
  { externalCode: 1008, date: '2024-12-22', shiftCode: '3F' },

  // Lucas Wilson (1009)
  { externalCode: 1009, date: '2024-12-09', shiftCode: '1F' },
  { externalCode: 1009, date: '2024-12-10', shiftCode: '2F' },
  { externalCode: 1009, date: '2024-12-11', shiftCode: '3F' },
  { externalCode: 1009, date: '2024-12-12', shiftCode: '1F' },
  { externalCode: 1009, date: '2024-12-13', shiftCode: '2F' },
  { externalCode: 1009, date: '2024-12-14', shiftCode: '1F' },
  { externalCode: 1009, date: '2024-12-16', shiftCode: '1F' },
  { externalCode: 1009, date: '2024-12-17', shiftCode: '2F' },
  { externalCode: 1009, date: '2024-12-18', shiftCode: '3F' },
  { externalCode: 1009, date: '2024-12-19', shiftCode: '1F' },
  { externalCode: 1009, date: '2024-12-20', shiftCode: '2F' },
  { externalCode: 1009, date: '2024-12-22', shiftCode: '3F' },

  // Isabella Anderson (1010)
  { externalCode: 1010, date: '2024-12-09', shiftCode: '1F' },
  { externalCode: 1010, date: '2024-12-10', shiftCode: '2F' },
  { externalCode: 1010, date: '2024-12-11', shiftCode: '3F' },
  { externalCode: 1010, date: '2024-12-14', shiftCode: '1F' },
  { externalCode: 1010, date: '2024-12-15', shiftCode: '3F' },
  { externalCode: 1010, date: '2024-12-16', shiftCode: '1F' },
  { externalCode: 1010, date: '2024-12-17', shiftCode: '2F' },
  { externalCode: 1010, date: '2024-12-19', shiftCode: '1F' },
  { externalCode: 1010, date: '2024-12-20', shiftCode: '2F' },
  { externalCode: 1010, date: '2024-12-21', shiftCode: '1F' },
  { externalCode: 1010, date: '2024-12-22', shiftCode: '3F' },

  // Henry Thomas (1011)
  { externalCode: 1011, date: '2024-12-09', shiftCode: '1F' },
  { externalCode: 1011, date: '2024-12-10', shiftCode: '2F' },
  { externalCode: 1011, date: '2024-12-11', shiftCode: '3F' },
  { externalCode: 1011, date: '2024-12-12', shiftCode: '1F' },
  { externalCode: 1011, date: '2024-12-13', shiftCode: '2F' },
  { externalCode: 1011, date: '2024-12-14', shiftCode: '1F' },
  { externalCode: 1011, date: '2024-12-15', shiftCode: '3F' },
  { externalCode: 1011, date: '2024-12-16', shiftCode: '1F' },
  { externalCode: 1011, date: '2024-12-17', shiftCode: '2F' },
  { externalCode: 1011, date: '2024-12-18', shiftCode: '3F' },
  { externalCode: 1011, date: '2024-12-19', shiftCode: '1F' },
  { externalCode: 1011, date: '2024-12-20', shiftCode: '2F' },
  { externalCode: 1011, date: '2024-12-21', shiftCode: '1F' },

  // Charlotte Taylor (1012)
  { externalCode: 1012, date: '2024-12-09', shiftCode: '1F' },
  { externalCode: 1012, date: '2024-12-10', shiftCode: '2F' },
  { externalCode: 1012, date: '2024-12-12', shiftCode: '1F' },
  { externalCode: 1012, date: '2024-12-14', shiftCode: '1F' },
  { externalCode: 1012, date: '2024-12-15', shiftCode: '3F' },
  { externalCode: 1012, date: '2024-12-16', shiftCode: '1F' },
  { externalCode: 1012, date: '2024-12-17', shiftCode: '2F' },
  { externalCode: 1012, date: '2024-12-18', shiftCode: '3F' },
  { externalCode: 1012, date: '2024-12-20', shiftCode: '2F' },
  { externalCode: 1012, date: '2024-12-21', shiftCode: '1F' },

  // Ethan Moore (1013) - Part-Time
  { externalCode: 1013, date: '2024-12-09', shiftCode: '2F' },
  { externalCode: 1013, date: '2024-12-11', shiftCode: '1F' },
  { externalCode: 1013, date: '2024-12-13', shiftCode: '1F' },
  { externalCode: 1013, date: '2024-12-14', shiftCode: '1F' },
  { externalCode: 1013, date: '2024-12-15', shiftCode: '2F' },
  { externalCode: 1013, date: '2024-12-16', shiftCode: '2F' },
  { externalCode: 1013, date: '2024-12-17', shiftCode: '2F' },
  { externalCode: 1013, date: '2024-12-18', shiftCode: '2F' },

  // Amelia Jackson (1014) - Part-Time
  { externalCode: 1014, date: '2024-12-09', shiftCode: '1F' },
  { externalCode: 1014, date: '2024-12-11', shiftCode: '2F' },
  { externalCode: 1014, date: '2024-12-13', shiftCode: '1F' },
  { externalCode: 1014, date: '2024-12-14', shiftCode: '1F' },
  { externalCode: 1014, date: '2024-12-15', shiftCode: '2F' },
  { externalCode: 1014, date: '2024-12-16', shiftCode: '1F' },
  { externalCode: 1014, date: '2024-12-17', shiftCode: '1F' },
  { externalCode: 1014, date: '2024-12-18', shiftCode: '1F' },
  { externalCode: 1014, date: '2024-12-20', shiftCode: '1F' },
  { externalCode: 1014, date: '2024-12-21', shiftCode: '2F' },

  // Mason Martin (1015) - Part-Time
  { externalCode: 1015, date: '2024-12-10', shiftCode: '2F' },
  { externalCode: 1015, date: '2024-12-11', shiftCode: '1F' },
  { externalCode: 1015, date: '2024-12-12', shiftCode: '1F' },
  { externalCode: 1015, date: '2024-12-14', shiftCode: '1F' },
  { externalCode: 1015, date: '2024-12-16', shiftCode: '1F' },
  { externalCode: 1015, date: '2024-12-18', shiftCode: '2F' },
  { externalCode: 1015, date: '2024-12-19', shiftCode: '1F' },
  { externalCode: 1015, date: '2024-12-20', shiftCode: '2F' },
  { externalCode: 1015, date: '2024-12-21', shiftCode: '1F' },

  // Harper Lee (1016) - Part-Time
  { externalCode: 1016, date: '2024-12-09', shiftCode: '2F' },
  { externalCode: 1016, date: '2024-12-11', shiftCode: '2F' },
  { externalCode: 1016, date: '2024-12-12', shiftCode: '2F' },
  { externalCode: 1016, date: '2024-12-14', shiftCode: '1F' },
  { externalCode: 1016, date: '2024-12-15', shiftCode: '2F' },
  { externalCode: 1016, date: '2024-12-16', shiftCode: '1F' },
  { externalCode: 1016, date: '2024-12-18', shiftCode: '1F' },
  { externalCode: 1016, date: '2024-12-20', shiftCode: '1F' },

  // Logan Thompson (1017) - Part-Time
  { externalCode: 1017, date: '2024-12-09', shiftCode: '2F' },
  { externalCode: 1017, date: '2024-12-10', shiftCode: '1F' },
  { externalCode: 1017, date: '2024-12-11', shiftCode: '2F' },
  { externalCode: 1017, date: '2024-12-13', shiftCode: '2F' },
  { externalCode: 1017, date: '2024-12-14', shiftCode: '1F' },
  { externalCode: 1017, date: '2024-12-15', shiftCode: '2F' },
  { externalCode: 1017, date: '2024-12-16', shiftCode: '2F' },
  { externalCode: 1017, date: '2024-12-17', shiftCode: '1F' },
  { externalCode: 1017, date: '2024-12-18', shiftCode: '2F' },
  { externalCode: 1017, date: '2024-12-19', shiftCode: '2F' },
  { externalCode: 1017, date: '2024-12-20', shiftCode: '1F' },
  { externalCode: 1017, date: '2024-12-21', shiftCode: '2F' },

  // Evelyn White (1018) - Part-Time
  { externalCode: 1018, date: '2024-12-11', shiftCode: '1F' },
  { externalCode: 1018, date: '2024-12-12', shiftCode: '2F' },
  { externalCode: 1018, date: '2024-12-13', shiftCode: '1F' },
  { externalCode: 1018, date: '2024-12-14', shiftCode: '1F' },
  { externalCode: 1018, date: '2024-12-17', shiftCode: '2F' },
  { externalCode: 1018, date: '2024-12-18', shiftCode: '2F' },
  { externalCode: 1018, date: '2024-12-19', shiftCode: '2F' },
  { externalCode: 1018, date: '2024-12-20', shiftCode: '1F' },
  { externalCode: 1018, date: '2024-12-21', shiftCode: '1F' },

  // Alex Harris (1019) - Part-Time
  { externalCode: 1019, date: '2024-12-09', shiftCode: '2F' },
  { externalCode: 1019, date: '2024-12-10', shiftCode: '1F' },
  { externalCode: 1019, date: '2024-12-11', shiftCode: '1F' },
  { externalCode: 1019, date: '2024-12-12', shiftCode: '2F' },
  { externalCode: 1019, date: '2024-12-14', shiftCode: '1F' },
  { externalCode: 1019, date: '2024-12-16', shiftCode: '1F' },
  { externalCode: 1019, date: '2024-12-18', shiftCode: '1F' },
  { externalCode: 1019, date: '2024-12-19', shiftCode: '1F' },
  { externalCode: 1019, date: '2024-12-20', shiftCode: '1F' },
  { externalCode: 1019, date: '2024-12-21', shiftCode: '1F' },

  // Abigail Clark (1020) - Part-Time
  { externalCode: 1020, date: '2024-12-09', shiftCode: '1F' },
  { externalCode: 1020, date: '2024-12-10', shiftCode: '1F' },
  { externalCode: 1020, date: '2024-12-13', shiftCode: '2F' },
  { externalCode: 1020, date: '2024-12-14', shiftCode: '1F' },
  { externalCode: 1020, date: '2024-12-15', shiftCode: '2F' },
  { externalCode: 1020, date: '2024-12-16', shiftCode: '2F' },
  { externalCode: 1020, date: '2024-12-17', shiftCode: '2F' },
  { externalCode: 1020, date: '2024-12-18', shiftCode: '2F' },
  { externalCode: 1020, date: '2024-12-19', shiftCode: '1F' },
  { externalCode: 1020, date: '2024-12-20', shiftCode: '2F' },
  { externalCode: 1020, date: '2024-12-21', shiftCode: '1F' },

  // Michael Lewis (1021) - Part-Time
  { externalCode: 1021, date: '2024-12-09', shiftCode: '1F' },
  { externalCode: 1021, date: '2024-12-10', shiftCode: '1F' },
  { externalCode: 1021, date: '2024-12-11', shiftCode: '1F' },
  { externalCode: 1021, date: '2024-12-12', shiftCode: '1F' },
  { externalCode: 1021, date: '2024-12-13', shiftCode: '1F' },
  { externalCode: 1021, date: '2024-12-18', shiftCode: '1F' },
  { externalCode: 1021, date: '2024-12-19', shiftCode: '2F' },
  { externalCode: 1021, date: '2024-12-20', shiftCode: '2F' },
  { externalCode: 1021, date: '2024-12-21', shiftCode: '1F' },
  { externalCode: 1021, date: '2024-12-22', shiftCode: '2F' },

  // Emily Walker (1022) - Part-Time
  { externalCode: 1022, date: '2024-12-09', shiftCode: '1F' },
  { externalCode: 1022, date: '2024-12-10', shiftCode: '1F' },
  { externalCode: 1022, date: '2024-12-11', shiftCode: '1F' },
  { externalCode: 1022, date: '2024-12-12', shiftCode: '2F' },
  { externalCode: 1022, date: '2024-12-13', shiftCode: '2F' },
  { externalCode: 1022, date: '2024-12-14', shiftCode: '1F' },
  { externalCode: 1022, date: '2024-12-15', shiftCode: '2F' },
  { externalCode: 1022, date: '2024-12-16', shiftCode: '2F' },
  { externalCode: 1022, date: '2024-12-18', shiftCode: '2F' },
  { externalCode: 1022, date: '2024-12-19', shiftCode: '1F' },
  { externalCode: 1022, date: '2024-12-21', shiftCode: '1F' },
  { externalCode: 1022, date: '2024-12-22', shiftCode: '2F' },

  // Daniel Hall (1023) - Casual
  { externalCode: 1023, date: '2024-12-10', shiftCode: '1F' },
  { externalCode: 1023, date: '2024-12-15', shiftCode: '3F' },
  { externalCode: 1023, date: '2024-12-16', shiftCode: '1F' },
  { externalCode: 1023, date: '2024-12-17', shiftCode: '2F' },
  { externalCode: 1023, date: '2024-12-20', shiftCode: '1F' },
  { externalCode: 1023, date: '2024-12-21', shiftCode: '2F' },
  { externalCode: 1023, date: '2024-12-22', shiftCode: '2F' },

  // Elizabeth Allen (1024) - Casual
  { externalCode: 1024, date: '2024-12-09', shiftCode: '2F' },
  { externalCode: 1024, date: '2024-12-14', shiftCode: '2F' },
  { externalCode: 1024, date: '2024-12-15', shiftCode: '3F' },
  { externalCode: 1024, date: '2024-12-20', shiftCode: '2F' },
  { externalCode: 1024, date: '2024-12-21', shiftCode: '2F' },
  { externalCode: 1024, date: '2024-12-22', shiftCode: '2F' },

  // Matthew Young (1025) - Casual
  { externalCode: 1025, date: '2024-12-13', shiftCode: '2F' },
  { externalCode: 1025, date: '2024-12-14', shiftCode: '3F' },
  { externalCode: 1025, date: '2024-12-15', shiftCode: '2F' },
  { externalCode: 1025, date: '2024-12-20', shiftCode: '1F' },
  { externalCode: 1025, date: '2024-12-21', shiftCode: '3F' },
  { externalCode: 1025, date: '2024-12-22', shiftCode: '3F' },

  // Sofia King (1026) - Casual
  { externalCode: 1026, date: '2024-12-09', shiftCode: '2F' },
  { externalCode: 1026, date: '2024-12-15', shiftCode: '2F' },
  { externalCode: 1026, date: '2024-12-20', shiftCode: '1F' },
  { externalCode: 1026, date: '2024-12-21', shiftCode: '2F' },
  { externalCode: 1026, date: '2024-12-22', shiftCode: '3F' },

  // Samuel Wright (1027) - Casual
  { externalCode: 1027, date: '2024-12-13', shiftCode: '2F' },
  { externalCode: 1027, date: '2024-12-14', shiftCode: '3F' },
  { externalCode: 1027, date: '2024-12-18', shiftCode: '2F' },
  { externalCode: 1027, date: '2024-12-19', shiftCode: '2F' },
  { externalCode: 1027, date: '2024-12-22', shiftCode: '3F' },

  // Avery Scott (1028) - Casual
  { externalCode: 1028, date: '2024-12-13', shiftCode: '2F' },
  { externalCode: 1028, date: '2024-12-14', shiftCode: '2F' },
  { externalCode: 1028, date: '2024-12-15', shiftCode: '2F' },
  { externalCode: 1028, date: '2024-12-22', shiftCode: '2F' },

  // David Green (1029) - Casual
  { externalCode: 1029, date: '2024-12-10', shiftCode: '2F' },
  { externalCode: 1029, date: '2024-12-11', shiftCode: '2F' },
  { externalCode: 1029, date: '2024-12-12', shiftCode: '2F' },
  { externalCode: 1029, date: '2024-12-14', shiftCode: '3F' },
  { externalCode: 1029, date: '2024-12-15', shiftCode: '3F' },
  { externalCode: 1029, date: '2024-12-16', shiftCode: '2F' },
  { externalCode: 1029, date: '2024-12-18', shiftCode: '2F' },
  { externalCode: 1029, date: '2024-12-20', shiftCode: '2F' },

  // Ella Baker (1030) - Casual
  { externalCode: 1030, date: '2024-12-11', shiftCode: '1F' },
  { externalCode: 1030, date: '2024-12-14', shiftCode: '2F' },
  { externalCode: 1030, date: '2024-12-15', shiftCode: '2F' },
  { externalCode: 1030, date: '2024-12-16', shiftCode: '1F' },
  { externalCode: 1030, date: '2024-12-17', shiftCode: '2F' },
  { externalCode: 1030, date: '2024-12-21', shiftCode: '3F' },
  { externalCode: 1030, date: '2024-12-22', shiftCode: '2F' },

  // Joseph Adams (1031) - Casual
  { externalCode: 1031, date: '2024-12-14', shiftCode: '2F' },
  { externalCode: 1031, date: '2024-12-15', shiftCode: '2F' },
  { externalCode: 1031, date: '2024-12-18', shiftCode: '1F' },
  { externalCode: 1031, date: '2024-12-19', shiftCode: '2F' },
  { externalCode: 1031, date: '2024-12-20', shiftCode: '2F' },
  { externalCode: 1031, date: '2024-12-21', shiftCode: '3F' },

  // Scarlett Nelson (1032) - Casual
  { externalCode: 1032, date: '2024-12-09', shiftCode: '1F' },
  { externalCode: 1032, date: '2024-12-14', shiftCode: '2F' },
  { externalCode: 1032, date: '2024-12-15', shiftCode: '2F' },
  { externalCode: 1032, date: '2024-12-18', shiftCode: '1F' },
  { externalCode: 1032, date: '2024-12-20', shiftCode: '1F' },
  { externalCode: 1032, date: '2024-12-21', shiftCode: '2F' },

  // Ben Hill (1033) - Casual
  { externalCode: 1033, date: '2024-12-09', shiftCode: '1F' },
  { externalCode: 1033, date: '2024-12-15', shiftCode: '2F' },
  { externalCode: 1033, date: '2024-12-16', shiftCode: '1F' },
  { externalCode: 1033, date: '2024-12-22', shiftCode: '2F' },

  // Grace Campbell (1034) - Casual
  { externalCode: 1034, date: '2024-12-10', shiftCode: '2F' },
  { externalCode: 1034, date: '2024-12-11', shiftCode: '2F' },
  { externalCode: 1034, date: '2024-12-12', shiftCode: '2F' },
  { externalCode: 1034, date: '2024-12-15', shiftCode: '3F' },
  { externalCode: 1034, date: '2024-12-18', shiftCode: '2F' },
  { externalCode: 1034, date: '2024-12-22', shiftCode: '2F' },

  // Ryan Mitchell (1035) - Casual
  { externalCode: 1035, date: '2024-12-10', shiftCode: '2F' },
  { externalCode: 1035, date: '2024-12-11', shiftCode: '2F' },
  { externalCode: 1035, date: '2024-12-12', shiftCode: '2F' },
  { externalCode: 1035, date: '2024-12-13', shiftCode: '2F' },
  { externalCode: 1035, date: '2024-12-15', shiftCode: '3F' },
  { externalCode: 1035, date: '2024-12-20', shiftCode: '1F' },
  { externalCode: 1035, date: '2024-12-22', shiftCode: '3F' },

  // Chloe Roberts (1036) - Casual
  { externalCode: 1036, date: '2024-12-12', shiftCode: '2F' },
  { externalCode: 1036, date: '2024-12-13', shiftCode: '2F' },
  { externalCode: 1036, date: '2024-12-14', shiftCode: '2F' },
  { externalCode: 1036, date: '2024-12-15', shiftCode: '2F' },
  { externalCode: 1036, date: '2024-12-18', shiftCode: '1F' },
  { externalCode: 1036, date: '2024-12-19', shiftCode: '2F' },
  { externalCode: 1036, date: '2024-12-20', shiftCode: '2F' },
  { externalCode: 1036, date: '2024-12-22', shiftCode: '3F' },

  // Andrew Carter (1037) - Casual
  { externalCode: 1037, date: '2024-12-09', shiftCode: '1F' },
  { externalCode: 1037, date: '2024-12-10', shiftCode: '2F' },
  { externalCode: 1037, date: '2024-12-11', shiftCode: '1F' },
  { externalCode: 1037, date: '2024-12-13', shiftCode: '1F' },
  { externalCode: 1037, date: '2024-12-14', shiftCode: '3F' },
  { externalCode: 1037, date: '2024-12-17', shiftCode: '2F' },
  { externalCode: 1037, date: '2024-12-19', shiftCode: '2F' },
  { externalCode: 1037, date: '2024-12-21', shiftCode: '2F' },

  // Victoria Phillips (1038) - Casual
  { externalCode: 1038, date: '2024-12-10', shiftCode: '2F' },
  { externalCode: 1038, date: '2024-12-12', shiftCode: '2F' },
  { externalCode: 1038, date: '2024-12-13', shiftCode: '2F' },
  { externalCode: 1038, date: '2024-12-15', shiftCode: '2F' },
  { externalCode: 1038, date: '2024-12-19', shiftCode: '2F' },
  { externalCode: 1038, date: '2024-12-22', shiftCode: '2F' },

  // Nathan Evans (1039) - Casual
  { externalCode: 1039, date: '2024-12-10', shiftCode: '1F' },
  { externalCode: 1039, date: '2024-12-11', shiftCode: '2F' },
  { externalCode: 1039, date: '2024-12-12', shiftCode: '1F' },
  { externalCode: 1039, date: '2024-12-14', shiftCode: '2F' },
  { externalCode: 1039, date: '2024-12-17', shiftCode: '2F' },
  { externalCode: 1039, date: '2024-12-19', shiftCode: '2F' },
  { externalCode: 1039, date: '2024-12-20', shiftCode: '2F' },
  { externalCode: 1039, date: '2024-12-21', shiftCode: '3F' },
  { externalCode: 1039, date: '2024-12-22', shiftCode: '2F' },

  // Madison Turner (1040) - Casual
  { externalCode: 1040, date: '2024-12-13', shiftCode: '2F' },
  { externalCode: 1040, date: '2024-12-14', shiftCode: '3F' },
  { externalCode: 1040, date: '2024-12-17', shiftCode: '2F' },
  { externalCode: 1040, date: '2024-12-21', shiftCode: '2F' },
  { externalCode: 1040, date: '2024-12-22', shiftCode: '2F' },
];
