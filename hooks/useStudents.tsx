import { useState, useEffect, useCallback, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import { Student, ValidationRecord } from "@/types/student";
import { mockStudents } from "@/mocks/students";
import { syncService } from "@/utils/syncService";

export const [StudentProvider, useStudents] = createContextHook(() => {
  const [students, setStudents] = useState<Student[]>([]);
  const [validations, setValidations] = useState<ValidationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deviceId, setDeviceId] = useState<string>('');

  useEffect(() => {
    initializeSync();
    loadStudents();
  }, []);

  const initializeSync = async () => {
    try {
      const id = await syncService.initialize();
      setDeviceId(id);
    } catch (error) {
      console.error('Failed to initialize sync service:', error);
    }
  };

  const loadStudents = async () => {
    try {
      const stored = await AsyncStorage.getItem("students");
      if (stored) {
        // Add better error handling for JSON parsing
        try {
          // Check if the stored value is valid JSON
          if (stored === 'undefined' || stored === 'null' || stored === '' || stored.trim() === '') {
            console.warn('Invalid stored data, resetting to mock data');
            setStudents(mockStudents);
            await AsyncStorage.setItem("students", JSON.stringify(mockStudents));
          } else {
            // First check if it starts with valid JSON characters
            const trimmedStored = stored.trim();
            if (!trimmedStored.startsWith('[') && !trimmedStored.startsWith('{')) {
              console.error('Invalid JSON format detected, resetting to mock data');
              console.log('First 100 chars of corrupted data:', trimmedStored.substring(0, 100));
              setStudents(mockStudents);
              await AsyncStorage.setItem("students", JSON.stringify(mockStudents));
              return;
            }
            
            const parsed = JSON.parse(trimmedStored);
            // Validate that it's an array
            if (Array.isArray(parsed)) {
              setStudents(parsed);
            } else {
              console.warn('Stored data is not an array, resetting to mock data');
              setStudents(mockStudents);
              await AsyncStorage.setItem("students", JSON.stringify(mockStudents));
            }
          }
        } catch (parseError) {
          console.error('JSON Parse error:', parseError);
          console.log('Corrupted data:', stored?.substring(0, 200));
          // Reset to mock data if parsing fails
          setStudents(mockStudents);
          await AsyncStorage.setItem("students", JSON.stringify(mockStudents));
        }
      } else {
        // Initialize with mock data
        setStudents(mockStudents);
        await AsyncStorage.setItem("students", JSON.stringify(mockStudents));
      }
    } catch (error) {
      console.error("Failed to load students:", error);
      setStudents(mockStudents);
      // Try to reset storage
      try {
        await AsyncStorage.setItem("students", JSON.stringify(mockStudents));
      } catch (e) {
        console.error("Failed to reset storage:", e);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const generateTicket = useCallback(async (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    if (!student) {
      console.error('Student not found:', studentId);
      return false;
    }

    const ticketCount = student.ticketCount || 1;
    const ticketNumbers: string[] = [];
    
    // Generate multiple ticket numbers based on ticket count
    for (let i = 0; i < ticketCount; i++) {
      const timestamp = Date.now() + i; // Ensure unique timestamps
      ticketNumbers.push(`TKT${timestamp.toString().slice(-8)}`);
    }

    const updatedStudents = students.map(s => {
      if (s.id === studentId) {
        return {
          ...s,
          hasTicket: true,
          ticketNumber: ticketNumbers[0], // Primary ticket number
          ticketNumbers, // Array of all ticket numbers
          isValidated: false,
        };
      }
      return s;
    });

    setStudents(updatedStudents);
    try {
      await AsyncStorage.setItem("students", JSON.stringify(updatedStudents));
    } catch (storageError) {
      console.error('Failed to save updated students:', storageError);
    }
    
    // Simulate email sending with all tickets
    console.log(`Sending ${ticketCount} ticket(s) to ${student.name} (${student.email}):`);
    ticketNumbers.forEach((ticketNum, index) => {
      console.log(`  Ticket ${index + 1}: ${ticketNum}`);
    });
    
    if (student.guestName && ticketCount > 1) {
      console.log(`  Guest: ${student.guestName}${student.guestSchool ? ` (${student.guestSchool})` : ''}`);
    }
    
    return true;
  }, [students]);

  const validateTicket = useCallback(async (
    studentId: string, 
    eventId: string = 'default',
    validatorName: string = 'Scanner'
  ): Promise<{ success: boolean; alreadyValidated?: boolean; validatedBy?: string }> => {
    const student = students.find(s => s.id === studentId);
    if (!student || !student.hasTicket) {
      return { success: false };
    }
    
    const ticketNumber = student.ticketNumber || student.ticketNumbers?.[0] || '';
    
    // Use sync service for cross-device validation
    const result = await syncService.validateTicketAcrossDevices(
      studentId,
      ticketNumber,
      eventId,
      validatorName
    );

    if (result.success) {
      // Update local state
      const updatedStudents = students.map(s => {
        if (s.id === studentId) {
          return { 
            ...s, 
            isValidated: true,
            validatedAt: new Date().toISOString(),
            validatedBy: validatorName
          };
        }
        return s;
      });

      setStudents(updatedStudents);
      
      // Create validation record
      const validation: ValidationRecord = {
        studentId,
        ticketNumber,
        validatedAt: new Date().toISOString(),
        validatedBy: validatorName,
        deviceId,
        eventId
      };
      
      setValidations(prev => [...prev, validation]);
      
      // Save to storage
      try {
        await AsyncStorage.setItem("students", JSON.stringify(updatedStudents));
        await syncService.syncValidations(eventId, updatedStudents, [...validations, validation]);
      } catch (error) {
        console.error('Failed to save validated ticket:', error);
      }
    }

    return result;
  }, [students, validations, deviceId]);

  const importStudentsFromSheets = useCallback(async (sheetsUrl: string): Promise<{ success: boolean; count?: number; error?: string }> => {
    try {
      // Validate URL format first
      if (!sheetsUrl || sheetsUrl.trim().length === 0) {
        throw new Error('Please provide a Google Sheets URL.');
      }
      
      // Basic URL validation
      const trimmedUrl = sheetsUrl.trim();
      if (!trimmedUrl.includes('docs.google.com/spreadsheets') && 
          !trimmedUrl.includes('sheets.google.com') && 
          !trimmedUrl.match(/^[a-zA-Z0-9-_]{20,}$/)) {
        throw new Error('Please provide a valid Google Sheets URL. It should look like:\n' +
          'https://docs.google.com/spreadsheets/d/YOUR_SPREADSHEET_ID/edit');
      }
      
      // Convert Google Sheets URL to CSV export URL
      const csvUrl = convertToCSVUrl(sheetsUrl);
      
      console.log('Original URL:', sheetsUrl);
      console.log('Fetching CSV from:', csvUrl);
      
      // Add timeout and better error handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      // Try to fetch the CSV
      let response;
      try {
        response = await fetch(csvUrl, {
          signal: controller.signal,
          method: 'GET',
          headers: {
            'Accept': 'text/csv,text/plain,*/*',
          },
        });
      } catch (fetchError) {
        clearTimeout(timeoutId);
        console.error('Fetch error:', fetchError);
        
        // If CORS error, provide specific guidance
        if (fetchError instanceof TypeError && fetchError.message.includes('Failed to fetch')) {
          throw new Error('Unable to access the Google Sheet. This usually means:\n\n' +
            '1. The sheet is not publicly accessible\n' +
            '   • Go to your Google Sheet\n' +
            '   • Click Share → Change to "Anyone with the link"\n' +
            '   • Set permission to "Viewer"\n\n' +
            '2. The spreadsheet ID is incorrect\n' +
            '   • Copy the full URL from your browser\n' +
            '   • The ID is the long string after /d/\n\n' +
            '3. Network issues\n' +
            '   • Check your internet connection');
        }
        throw fetchError;
      }
      
      clearTimeout(timeoutId);
      
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      
      if (!response.ok) {
        // Try to get error details from response
        let errorDetails = '';
        try {
          const errorText = await response.text();
          if (errorText && errorText.length < 500) {
            errorDetails = `\nServer response: ${errorText}`;
          }
        } catch (e) {
          // Ignore error reading response
        }
        
        if (response.status === 400) {
          // Check if it's an HTML error page
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('text/html')) {
            throw new Error('Invalid request. The Google Sheets URL may be malformed or the sheet may not exist. Please check the URL and try again.');
          }
          
          throw new Error('Failed to fetch data (HTTP 400). Please check the sheet URL and permissions.\n\n' +
            'Common causes:\n' +
            '• The spreadsheet ID is incorrect or malformed\n' +
            '• The URL format is not recognized\n' +
            '• The sheet doesn\'t exist or was deleted\n' +
            '• The sheet is not publicly accessible\n\n' +
            'To fix this:\n' +
            '1. Copy the URL directly from your browser address bar\n' +
            '2. Make sure the sheet is set to "Anyone with the link can view"\n' +
            '3. Try opening the URL in an incognito window to test access' + errorDetails);
        } else if (response.status === 403 || response.status === 401) {
          throw new Error('Access denied. Please make sure the Google Sheet is publicly accessible:\n' +
            '1. Open your Google Sheet\n' +
            '2. Click "Share" button (top right)\n' +
            '3. Click "Change to anyone with the link"\n' +
            '4. Set permission to "Viewer"\n' +
            '5. Click "Done"' + errorDetails);
        } else if (response.status === 404) {
          throw new Error('Sheet not found. Please check that:\n' +
            '1. The URL is correct and complete\n' +
            '2. The sheet exists and hasn\'t been deleted\n' +
            '3. You have the right spreadsheet ID\n\n' +
            'The spreadsheet ID should be the long string of characters in your URL.' + errorDetails);
        } else {
          throw new Error(`Failed to fetch data (HTTP ${response.status}). This might be due to:\n` +
            '• Invalid spreadsheet ID\n' +
            '• Sheet is private\n' +
            '• Network issues\n' +
            'Please verify the URL and permissions.' + errorDetails);
        }
      }
      
      const csvText = await response.text();
      console.log('CSV data received:', csvText.substring(0, 200) + '...');
      
      if (!csvText || csvText.trim().length === 0) {
        throw new Error('The sheet appears to be empty or contains no data.');
      }
      
      const parsedStudents = parseCSVToStudents(csvText);
      
      if (parsedStudents.length === 0) {
        return { success: false, error: 'No valid student data found in the sheet. Please check the format and ensure you have Name, Email, and Student ID columns.' };
      }
      
      // Merge with existing students (avoid duplicates based on email)
      const existingEmails = new Set(students.map(s => s.email.toLowerCase()));
      const newStudents = parsedStudents.filter(s => !existingEmails.has(s.email.toLowerCase()));
      
      const updatedStudents = [...students, ...newStudents];
      setStudents(updatedStudents);
      // Ensure we're storing valid JSON
      try {
        await AsyncStorage.setItem('students', JSON.stringify(updatedStudents));
      } catch (storageError) {
        console.error('Failed to save students to storage:', storageError);
        // Continue anyway since the data is in memory
      }
      
      console.log(`Successfully imported ${newStudents.length} new students`);
      return { success: true, count: newStudents.length };
      
    } catch (error) {
      console.error('Import error:', error);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return { success: false, error: 'Request timed out. Please check your internet connection and try again.' };
        }
        return { success: false, error: error.message };
      }
      
      return { success: false, error: 'An unexpected error occurred while importing data.' };
    }
  }, [students]);

  const convertToCSVUrl = (sheetsUrl: string): string => {
    // Clean the URL first
    const cleanUrl = sheetsUrl.trim();
    
    // Extract the spreadsheet ID from various Google Sheets URL formats
    let spreadsheetId = '';
    let gid = '0'; // Default to first sheet
    
    // More comprehensive patterns to extract the spreadsheet ID
    const patterns = [
      // Standard format: https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
      /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/,
      // Alternative with /u/0/ or /u/1/ etc
      /\/u\/\d+\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/,
      // Shortened format: https://docs.google.com/d/SPREADSHEET_ID/edit
      /\/d\/([a-zA-Z0-9-_]+)/,
      // Alternative format
      /spreadsheets\/([a-zA-Z0-9-_]+)/,
      // Just the ID (typically 44 characters but can vary)
      /^([a-zA-Z0-9-_]{20,})$/
    ];
    
    // First check if it's just an ID
    if (/^[a-zA-Z0-9-_]{20,}$/.test(cleanUrl)) {
      spreadsheetId = cleanUrl;
      console.log('Using direct spreadsheet ID:', spreadsheetId);
    } else {
      // Try to extract from URL
      for (const pattern of patterns) {
        const match = cleanUrl.match(pattern);
        if (match && match[1]) {
          spreadsheetId = match[1];
          console.log('Extracted spreadsheet ID:', spreadsheetId);
          break;
        }
      }
    }
    
    // Try to extract gid if present (for specific sheet)
    const gidMatch = cleanUrl.match(/[#&]gid=([0-9]+)/);
    if (gidMatch && gidMatch[1]) {
      gid = gidMatch[1];
      console.log('Extracted sheet gid:', gid);
    }
    
    if (!spreadsheetId) {
      console.error('Failed to extract ID from URL:', cleanUrl);
      throw new Error('Could not extract spreadsheet ID from URL. Please ensure you\'re using a valid Google Sheets URL in one of these formats:\n' +
        '• https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit\n' +
        '• https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit#gid=0\n' +
        '• Or just the spreadsheet ID itself (the long string of characters)');
    }
    
    // Clean the spreadsheet ID (remove any trailing slashes or parameters)
    spreadsheetId = spreadsheetId.split('/')[0].split('?')[0].split('#')[0];
    
    // Validate spreadsheet ID format (should be alphanumeric with hyphens/underscores)
    if (!/^[a-zA-Z0-9-_]+$/.test(spreadsheetId)) {
      throw new Error('Invalid spreadsheet ID format. The ID should only contain letters, numbers, hyphens, and underscores.');
    }
    
    // Return CSV export URL - using the simpler format that works better
    const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
    console.log('Generated CSV URL:', csvUrl);
    return csvUrl;
  };

  const clearStudentData = useCallback(async () => {
    try {
      await AsyncStorage.removeItem('students');
      setStudents(mockStudents);
      await AsyncStorage.setItem('students', JSON.stringify(mockStudents));
      console.log('Student data cleared and reset to mock data');
      return true;
    } catch (error) {
      console.error('Failed to clear student data:', error);
      return false;
    }
  }, []);

  const parseCSVToStudents = (csvText: string): Student[] => {
    // More robust CSV parsing that handles quoted fields and commas within quotes
    const parseCSVLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            // Handle escaped quotes
            current += '"';
            i++; // Skip next quote
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      
      result.push(current.trim());
      return result;
    };
    
    const lines = csvText.trim().split(/\r?\n/).filter(line => line.trim().length > 0);
    
    if (lines.length < 2) {
      throw new Error('The sheet must have at least a header row and one data row.');
    }
    
    const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
    console.log('CSV headers found:', headers);
    
    // Find column indices with more flexible matching for Google Form responses
    // Google Forms often adds "Timestamp" as first column and uses specific question formats
    
    // Look for first name and last name columns separately, then combine them
    const firstNameIndex = headers.findIndex(h => 
      h.includes('firstname') || h === 'firstname' || h.includes('first')
    );
    const lastNameIndex = headers.findIndex(h => 
      h.includes('lastname') || h === 'lastname' || h.includes('last')
    );
    
    // Also look for a single name column as fallback
    const nameIndex = headers.findIndex(h => 
      h.includes('name') || h.includes('fullname') || h.includes('student') || 
      h.includes('yourname') || h === 'name' // Exact match
    );
    
    const emailIndex = headers.findIndex(h => 
      h.includes('email') || h.includes('mail') || h.includes('emailaddress') ||
      h === 'email' || h === 'emailaddress' // Exact matches
    );
    
    // For this specific form, we'll use Grade as student ID since there's no explicit student ID
    const studentIdIndex = headers.findIndex(h => 
      h.includes('grade') || h.includes('studentid') || h.includes('id') || h.includes('number') ||
      h.includes('studentnumber') || h.includes('idnumber') || h.includes('studentno') ||
      h === 'id' || h === 'studentid' || h === 'grade' // Exact matches
    );
    
    const ticketCountIndex = headers.findIndex(h => 
      h.includes('howmanytickets') || h.includes('ticketcount') || h.includes('tickets') || 
      h.includes('quantity') || h.includes('count') || h.includes('howmany') || h.includes('numberof') ||
      h.includes('ticketnumber') || h.includes('ticketquantity') || h.includes('numberoftickets') ||
      h.includes('ticketspurchased') || h.includes('doyouneed') || h.includes('need')
    );
    
    const guestNameIndex = headers.findIndex(h => 
      h.includes('guestname') || h.includes('guest') || h.includes('companion') ||
      h.includes('guestfullname') || h.includes('companionname') || h.includes('plusone') ||
      h.includes('nameofguest') || h.includes('guestsname') || h === 'guestsname' ||
      h.includes('guestfirst') || h.includes('guestlast') || h.includes('attendee') ||
      h.includes('partner') || h.includes('date') || h.includes('bring') ||
      h === 'guest' || h === 'guestname' || h === 'companion' || h === 'partner'
    );
    
    const guestSchoolIndex = headers.findIndex(h => 
      h.includes('guestschool') || h.includes('companionschool') || h.includes('school') ||
      h.includes('guestuniversity') || h.includes('companionuniversity') || h.includes('guestcollege') ||
      h.includes('guestsschool') || h.includes('schoolofguest') || h === 'guestsschool'
    );
    
    console.log('Column indices:', { firstNameIndex, lastNameIndex, nameIndex, emailIndex, studentIdIndex, ticketCountIndex, guestNameIndex, guestSchoolIndex });
    console.log('Available headers:', headers);
    
    // Log specific column detection results
    if (guestNameIndex !== -1) {
      console.log(`✅ Guest Name column found at index ${guestNameIndex}: "${headers[guestNameIndex]}"`);
    } else {
      console.log('❌ Guest Name column not found. Looking for columns containing: guestname, guest, companion, partner, date, bring, attendee, etc.');
    }
    
    if (guestSchoolIndex !== -1) {
      console.log(`✅ Guest School column found at index ${guestSchoolIndex}: "${headers[guestSchoolIndex]}"`);
    } else {
      console.log('ℹ️ Guest School column not found (optional).');
    }
    
    // Check if we have either separate first/last name columns OR a single name column
    const hasNameData = (firstNameIndex !== -1 && lastNameIndex !== -1) || nameIndex !== -1;
    
    if (!hasNameData) {
      throw new Error('Name column(s) not found. Available columns: ' + headers.join(', ') + '\n\nPlease ensure your sheet has either:\n• "First Name" and "Last Name" columns, OR\n• A single "Name" column');
    }
    if (emailIndex === -1) {
      throw new Error('Email column not found. Available columns: ' + headers.join(', ') + '\n\nPlease ensure your sheet has a column with "Email" in the header.');
    }
    if (studentIdIndex === -1) {
      throw new Error('Student ID/Grade column not found. Available columns: ' + headers.join(', ') + '\n\nPlease ensure your sheet has a column with "Grade", "Student ID" or "ID" in the header.');
    }
    
    const students: Student[] = [];
    let validRows = 0;
    let skippedRows = 0;
    
    for (let i = 1; i < lines.length; i++) {
      try {
        const values = parseCSVLine(lines[i]);
        
        const requiredColumns = Math.max(
          firstNameIndex !== -1 ? firstNameIndex : nameIndex, 
          lastNameIndex !== -1 ? lastNameIndex : nameIndex,
          emailIndex, 
          studentIdIndex
        ) + 1;
        if (values.length < requiredColumns) {
          console.warn(`Row ${i + 1}: Not enough columns (${values.length} found, need at least ${requiredColumns})`);
          skippedRows++;
          continue;
        }
        
        // Build name from either separate first/last name columns or single name column
        let name = '';
        if (firstNameIndex !== -1 && lastNameIndex !== -1) {
          const firstName = values[firstNameIndex]?.trim() || '';
          const lastName = values[lastNameIndex]?.trim() || '';
          name = `${firstName} ${lastName}`.trim();
        } else if (nameIndex !== -1) {
          name = values[nameIndex]?.trim() || '';
        }
        
        const email = values[emailIndex]?.trim();
        const studentId = values[studentIdIndex]?.trim();
        const ticketCountStr = ticketCountIndex !== -1 ? values[ticketCountIndex]?.trim() : '';
        const guestName = guestNameIndex !== -1 ? values[guestNameIndex]?.trim() : '';
        const guestSchool = guestSchoolIndex !== -1 ? values[guestSchoolIndex]?.trim() : '';
        
        // Debug guest name extraction
        if (guestName) {
          console.log(`Row ${i + 1}: Found guest name: "${guestName}"`);
        }
        
        if (!name || !email || !studentId) {
          console.warn(`Row ${i + 1}: Missing required data - Name: "${name}", Email: "${email}", Student ID: "${studentId}"`);
          skippedRows++;
          continue;
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          console.warn(`Row ${i + 1}: Invalid email format: "${email}"`);
          skippedRows++;
          continue;
        }
        
        // Parse ticket count (default to 1 if not specified or invalid)
        let ticketCount = 1;
        if (ticketCountStr) {
          const parsed = parseInt(ticketCountStr, 10);
          if (!isNaN(parsed) && parsed > 0) {
            ticketCount = Math.min(parsed, 10); // Cap at 10 tickets max
          }
        }
        
        students.push({
          id: `imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name,
          email,
          studentId,
          hasTicket: false,
          ticketCount,
          guestName: guestName || undefined,
          guestSchool: guestSchool || undefined,
        });
        
        validRows++;
      } catch (error) {
        console.warn(`Row ${i + 1}: Error parsing row -`, error);
        skippedRows++;
      }
    }
    
    console.log(`Parsing complete: ${validRows} valid rows, ${skippedRows} skipped rows`);
    
    if (students.length === 0) {
      throw new Error(`No valid student records found. ${skippedRows} rows were skipped due to missing or invalid data.`);
    }
    
    return students;
  };

  const shareEvent = useCallback(async (event: any) => {
    try {
      const result = await syncService.shareEvent(event, students);
      return result;
    } catch (error) {
      console.error('Failed to share event:', error);
      return { success: false, error: 'Failed to share event' };
    }
  }, [students]);

  const loadSharedEvent = useCallback(async (shareCode: string) => {
    try {
      const result = await syncService.loadSharedEvent(shareCode);
      if (result.success && result.students) {
        // Merge shared students with existing ones
        const existingEmails = new Set(students.map(s => s.email.toLowerCase()));
        const newStudents = result.students.filter(s => !existingEmails.has(s.email.toLowerCase()));
        
        if (newStudents.length > 0) {
          const updatedStudents = [...students, ...newStudents];
          setStudents(updatedStudents);
          await AsyncStorage.setItem("students", JSON.stringify(updatedStudents));
        }
      }
      return result;
    } catch (error) {
      console.error('Failed to load shared event:', error);
      return { success: false, error: 'Failed to load shared event' };
    }
  }, [students]);

  const syncWithOtherDevices = useCallback(async (eventId: string) => {
    try {
      const syncData = await syncService.loadSyncData(eventId);
      if (syncData) {
        // Update validations from other devices
        const newValidations = syncData.validations.filter(
          v => !validations.some(existing => 
            existing.studentId === v.studentId && 
            existing.ticketNumber === v.ticketNumber
          )
        );
        
        if (newValidations.length > 0) {
          setValidations(prev => [...prev, ...newValidations]);
          
          // Update student validation status
          const updatedStudents = students.map(student => {
            const validation = newValidations.find(v => v.studentId === student.id);
            if (validation) {
              return {
                ...student,
                isValidated: true,
                validatedAt: validation.validatedAt,
                validatedBy: validation.validatedBy
              };
            }
            return student;
          });
          
          setStudents(updatedStudents);
          await AsyncStorage.setItem("students", JSON.stringify(updatedStudents));
        }
      }
    } catch (error) {
      console.error('Failed to sync with other devices:', error);
    }
  }, [students, validations]);

  return useMemo(
    () => ({
      students,
      validations,
      deviceId,
      isLoading,
      generateTicket,
      validateTicket,
      importStudentsFromSheets,
      clearStudentData,
      shareEvent,
      loadSharedEvent,
      syncWithOtherDevices,
    }),
    [students, validations, deviceId, isLoading, generateTicket, validateTicket, importStudentsFromSheets, clearStudentData, shareEvent, loadSharedEvent, syncWithOtherDevices]
  );
});