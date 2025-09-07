import { Platform, Alert, Linking } from 'react-native';

export interface TicketData {
  studentId: string;
  name: string;
  email: string;
  studentIdNumber: string;
  ticketNumber: string;
  ticketNumbers: string[];
  ticketCount: number;
  guestName?: string;
  guestSchool?: string;
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  qrData: string;
}

export interface WalletResult {
  success: boolean;
  walletType?: string;
  error?: string;
}

type WalletType = 'Apple Wallet' | 'Google Wallet' | 'Samsung Wallet';

const detectWalletSupport = (): WalletType[] => {
  const supportedWallets: WalletType[] = [];
  
  if (Platform.OS === 'ios') {
    supportedWallets.push('Apple Wallet');
  } else if (Platform.OS === 'android') {
    supportedWallets.push('Google Wallet');
    supportedWallets.push('Samsung Wallet');
  }
  
  return supportedWallets;
};

const generateAppleWalletPass = (ticketData: TicketData): string => {
  const passData = {
    formatVersion: 1,
    passTypeIdentifier: 'pass.com.studentevent.ticket',
    serialNumber: ticketData.ticketNumber,
    teamIdentifier: 'TEAM123456',
    organizationName: 'Student Event Organization',
    description: ticketData.eventTitle,
    logoText: 'Student Event',
    foregroundColor: 'rgb(255, 255, 255)',
    backgroundColor: 'rgb(108, 172, 228)',
    eventTicket: {
      primaryFields: [
        {
          key: 'event',
          label: 'EVENT',
          value: ticketData.eventTitle
        }
      ],
      secondaryFields: [
        {
          key: 'date',
          label: 'DATE',
          value: ticketData.eventDate
        },
        {
          key: 'location',
          label: 'LOCATION',
          value: ticketData.eventLocation
        }
      ],
      auxiliaryFields: [
        {
          key: 'name',
          label: 'NAME',
          value: ticketData.name
        },
        {
          key: 'studentId',
          label: 'STUDENT ID',
          value: ticketData.studentIdNumber
        },
        {
          key: 'ticketNumber',
          label: 'TICKET',
          value: `#${ticketData.ticketNumber}`
        }
      ],
      backFields: [
        {
          key: 'instructions',
          label: 'Instructions',
          value: `Present this pass at the entrance. Doors open at 6:00 PM. ${ticketData.guestName ? `Guest: ${ticketData.guestName}` : ''}`
        },
        {
          key: 'contact',
          label: 'Contact',
          value: ticketData.email
        }
      ]
    },
    barcode: {
      message: ticketData.qrData,
      format: 'PKBarcodeFormatQR',
      messageEncoding: 'iso-8859-1'
    }
  };
  
  return JSON.stringify(passData);
};

const generateGoogleWalletPass = (ticketData: TicketData): string => {
  const classId = 'student_event_class';
  const objectId = `${ticketData.studentId}_${ticketData.ticketNumber}`;
  
  const eventTicketClass = {
    id: classId,
    classTemplateInfo: {
      cardTemplateOverride: {
        cardRowTemplateInfos: [
          {
            twoItems: {
              startItem: {
                firstValue: {
                  fields: [
                    {
                      fieldPath: 'object.textModulesData["event_name"]'
                    }
                  ]
                }
              },
              endItem: {
                firstValue: {
                  fields: [
                    {
                      fieldPath: 'object.textModulesData["event_date"]'
                    }
                  ]
                }
              }
            }
          }
        ]
      }
    },
    eventName: {
      defaultValue: {
        language: 'en-US',
        value: ticketData.eventTitle
      }
    },
    venue: {
      name: {
        defaultValue: {
          language: 'en-US',
          value: ticketData.eventLocation
        }
      }
    }
  };
  
  const eventTicketObject = {
    id: objectId,
    classId: classId,
    state: 'ACTIVE',
    barcode: {
      type: 'QR_CODE',
      value: ticketData.qrData
    },
    textModulesData: [
      {
        id: 'event_name',
        header: 'Event',
        body: ticketData.eventTitle
      },
      {
        id: 'event_date',
        header: 'Date',
        body: ticketData.eventDate
      },
      {
        id: 'attendee_name',
        header: 'Name',
        body: ticketData.name
      },
      {
        id: 'student_id',
        header: 'Student ID',
        body: ticketData.studentIdNumber
      },
      {
        id: 'ticket_number',
        header: 'Ticket',
        body: `#${ticketData.ticketNumber}`
      }
    ]
  };
  
  if (ticketData.guestName) {
    eventTicketObject.textModulesData.push({
      id: 'guest_name',
      header: 'Guest',
      body: ticketData.guestName
    });
  }
  
  return JSON.stringify({ eventTicketClass, eventTicketObject });
};

const saveToAppleWallet = async (ticketData: TicketData): Promise<WalletResult> => {
  try {
    const passData = generateAppleWalletPass(ticketData);
    
    if (Platform.OS === 'web') {
      const blob = new Blob([passData], { type: 'application/vnd.apple.pkpass' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ticket-${ticketData.ticketNumber}.pkpass`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      return { success: true, walletType: 'Apple Wallet' };
    }
    
    const canOpen = await Linking.canOpenURL('shoebox://');
    if (canOpen) {
      await Linking.openURL('shoebox://');
      return { success: true, walletType: 'Apple Wallet' };
    } else {
      return {
        success: false,
        error: 'Apple Wallet is not available on this device. Please ensure you have iOS 6 or later.'
      };
    }
  } catch (error) {
    console.error('Apple Wallet error:', error);
    return {
      success: false,
      error: 'Failed to save to Apple Wallet. Please try again.'
    };
  }
};

const saveToGoogleWallet = async (ticketData: TicketData): Promise<WalletResult> => {
  try {
    const passData = generateGoogleWalletPass(ticketData);
    
    if (Platform.OS === 'web') {
      const googleWalletUrl = `https://pay.google.com/gp/v/save/${encodeURIComponent(passData)}`;
      window.open(googleWalletUrl, '_blank');
      return { success: true, walletType: 'Google Wallet' };
    }
    
    const googleWalletUrl = `https://pay.google.com/gp/v/save/${encodeURIComponent(passData)}`;
    const canOpen = await Linking.canOpenURL(googleWalletUrl);
    
    if (canOpen) {
      await Linking.openURL(googleWalletUrl);
      return { success: true, walletType: 'Google Wallet' };
    } else {
      return {
        success: false,
        error: 'Google Wallet is not available. Please install Google Wallet from the Play Store.'
      };
    }
  } catch (error) {
    console.error('Google Wallet error:', error);
    return {
      success: false,
      error: 'Failed to save to Google Wallet. Please try again.'
    };
  }
};

const saveToSamsungWallet = async (ticketData: TicketData): Promise<WalletResult> => {
  try {
    const samsungWalletUrl = `samsungpay://wallet/add?data=${encodeURIComponent(JSON.stringify({
      type: 'ticket',
      title: ticketData.eventTitle,
      subtitle: ticketData.eventDate,
      description: ticketData.eventLocation,
      barcode: {
        type: 'QR',
        value: ticketData.qrData
      },
      fields: [
        { label: 'Name', value: ticketData.name },
        { label: 'Student ID', value: ticketData.studentIdNumber },
        { label: 'Ticket', value: `#${ticketData.ticketNumber}` }
      ]
    }))}`;
    
    const canOpen = await Linking.canOpenURL('samsungpay://');
    
    if (canOpen) {
      await Linking.openURL(samsungWalletUrl);
      return { success: true, walletType: 'Samsung Wallet' };
    } else {
      return {
        success: false,
        error: 'Samsung Wallet is not available. Please install Samsung Wallet from the Galaxy Store.'
      };
    }
  } catch (error) {
    console.error('Samsung Wallet error:', error);
    return {
      success: false,
      error: 'Failed to save to Samsung Wallet. Please try again.'
    };
  }
};

const showWalletOptions = (ticketData: TicketData): Promise<WalletResult> => {
  return new Promise((resolve) => {
    const supportedWallets = detectWalletSupport();
    
    if (supportedWallets.length === 0) {
      resolve({
        success: false,
        error: 'No supported wallet apps found on this device.'
      });
      return;
    }
    
    if (supportedWallets.length === 1) {
      const walletType = supportedWallets[0];
      switch (walletType) {
        case 'Apple Wallet':
          saveToAppleWallet(ticketData).then(resolve);
          break;
        case 'Google Wallet':
          saveToGoogleWallet(ticketData).then(resolve);
          break;
        case 'Samsung Wallet':
          saveToSamsungWallet(ticketData).then(resolve);
          break;
      }
      return;
    }
    
    const buttons: { text: string; onPress: () => void }[] = supportedWallets.map(walletType => ({
      text: walletType,
      onPress: () => {
        (async () => {
          let result: WalletResult;
          switch (walletType) {
            case 'Apple Wallet':
              result = await saveToAppleWallet(ticketData);
              break;
            case 'Google Wallet':
              result = await saveToGoogleWallet(ticketData);
              break;
            case 'Samsung Wallet':
              result = await saveToSamsungWallet(ticketData);
              break;
            default:
              result = { success: false, error: 'Unsupported wallet type' };
          }
          resolve(result);
        })();
      }
    }));
    
    buttons.push({
      text: 'Cancel',
      onPress: () => {
        resolve({ success: false, error: 'Cancelled by user' });
      }
    });
    
    Alert.alert(
      'Choose Wallet',
      'Select which wallet to save your ticket to:',
      buttons
    );
  });
};

export const saveToWallet = async (ticketData: TicketData): Promise<WalletResult> => {
  try {
    console.log('Saving ticket to wallet:', {
      ticketNumber: ticketData.ticketNumber,
      ticketCount: ticketData.ticketCount,
      platform: Platform.OS
    });
    
    if (ticketData.ticketCount > 1) {
      const results: WalletResult[] = [];
      
      for (let i = 0; i < ticketData.ticketNumbers.length; i++) {
        const individualTicketData = {
          ...ticketData,
          ticketNumber: ticketData.ticketNumbers[i],
          qrData: JSON.stringify({
            id: ticketData.studentId,
            ticketNumber: ticketData.ticketNumbers[i],
            name: ticketData.name,
            studentId: ticketData.studentIdNumber,
          })
        };
        
        const result = await showWalletOptions(individualTicketData);
        results.push(result);
        
        if (!result.success) {
          break;
        }
      }
      
      const successCount = results.filter(r => r.success).length;
      if (successCount === ticketData.ticketCount) {
        return {
          success: true,
          walletType: results[0].walletType,
        };
      } else {
        return {
          success: false,
          error: `Only ${successCount} of ${ticketData.ticketCount} tickets were saved successfully.`
        };
      }
    } else {
      return await showWalletOptions(ticketData);
    }
  } catch (error) {
    console.error('Wallet service error:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while saving to wallet.'
    };
  }
};