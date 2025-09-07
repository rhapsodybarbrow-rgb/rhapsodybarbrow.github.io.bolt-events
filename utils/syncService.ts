import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { Student, ValidationRecord, SyncData } from '@/types/student';
import { Event } from '@/types/event';

// const SYNC_ENDPOINT = 'https://toolkit.rork.com/sync';
const DEVICE_ID_KEY = 'device_id';
const SYNC_DATA_KEY = 'sync_data';

interface SyncResponse {
  success: boolean;
  data?: SyncData;
  error?: string;
}

interface ShareEventResponse {
  success: boolean;
  shareCode?: string;
  error?: string;
}

class SyncService {
  private deviceId: string | null = null;
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private isOnline = true;

  async initialize(): Promise<string> {
    if (!this.deviceId) {
      this.deviceId = await this.getOrCreateDeviceId();
    }
    return this.deviceId;
  }

  private async getOrCreateDeviceId(): Promise<string> {
    try {
      let deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
      if (!deviceId) {
        deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
      }
      return deviceId;
    } catch (error) {
      console.error('Failed to get/create device ID:', error);
      return `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  }

  async shareEvent(event: Event, students: Student[]): Promise<ShareEventResponse> {
    try {
      await this.initialize();
      
      const shareData = {
        event,
        students: students.filter(s => s.hasTicket), // Only share students with tickets
        deviceId: this.deviceId,
        createdAt: new Date().toISOString()
      };

      if (Platform.OS === 'web') {
        // For web, create a shareable link with encoded data
        const encodedData = btoa(JSON.stringify(shareData));
        const shareCode = `EVT${Date.now().toString(36).toUpperCase()}`;
        
        // Store in localStorage for web sharing
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(`event_${shareCode}`, encodedData);
        }
        
        return { success: true, shareCode };
      }

      // For mobile, we'll simulate a cloud sync
      const shareCode = `EVT${Date.now().toString(36).toUpperCase()}`;
      await AsyncStorage.setItem(`shared_event_${shareCode}`, JSON.stringify(shareData));
      
      return { success: true, shareCode };
    } catch (error) {
      console.error('Failed to share event:', error);
      return { success: false, error: 'Failed to create shareable event' };
    }
  }

  async loadSharedEvent(shareCode: string): Promise<{ success: boolean; event?: Event; students?: Student[]; error?: string }> {
    try {
      let sharedData: string | null = null;

      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        sharedData = localStorage.getItem(`event_${shareCode}`);
      } else {
        sharedData = await AsyncStorage.getItem(`shared_event_${shareCode}`);
      }

      if (!sharedData) {
        return { success: false, error: 'Event not found. Please check the share code.' };
      }

      let parsedData;
      if (Platform.OS === 'web') {
        parsedData = JSON.parse(atob(sharedData));
      } else {
        parsedData = JSON.parse(sharedData);
      }

      return {
        success: true,
        event: parsedData.event,
        students: parsedData.students || []
      };
    } catch (error) {
      console.error('Failed to load shared event:', error);
      return { success: false, error: 'Failed to load shared event' };
    }
  }

  async syncValidations(eventId: string, students: Student[], validations: ValidationRecord[]): Promise<SyncResponse> {
    try {
      await this.initialize();
      
      const syncData: SyncData = {
        students,
        validations,
        lastSync: new Date().toISOString(),
        eventId
      };

      // Store locally first
      await AsyncStorage.setItem(`${SYNC_DATA_KEY}_${eventId}`, JSON.stringify(syncData));

      // In a real implementation, this would sync with a server
      // For now, we'll simulate successful sync
      return { success: true, data: syncData };
    } catch (error) {
      console.error('Sync failed:', error);
      return { success: false, error: 'Failed to sync data' };
    }
  }

  async loadSyncData(eventId: string): Promise<SyncData | null> {
    try {
      const stored = await AsyncStorage.getItem(`${SYNC_DATA_KEY}_${eventId}`);
      if (stored) {
        return JSON.parse(stored);
      }
      return null;
    } catch (error) {
      console.error('Failed to load sync data:', error);
      return null;
    }
  }

  async validateTicketAcrossDevices(
    studentId: string,
    ticketNumber: string,
    eventId: string,
    validatorName: string
  ): Promise<{ success: boolean; alreadyValidated?: boolean; validatedBy?: string; error?: string }> {
    try {
      await this.initialize();
      
      // Check if ticket is already validated
      const syncData = await this.loadSyncData(eventId);
      if (syncData) {
        const existingValidation = syncData.validations.find(
          v => v.studentId === studentId && v.ticketNumber === ticketNumber
        );
        
        if (existingValidation) {
          return {
            success: false,
            alreadyValidated: true,
            validatedBy: existingValidation.validatedBy
          };
        }
      }

      // Create new validation record
      const validation: ValidationRecord = {
        studentId,
        ticketNumber,
        validatedAt: new Date().toISOString(),
        validatedBy: validatorName,
        deviceId: this.deviceId!,
        eventId
      };

      // Update sync data
      const updatedSyncData: SyncData = {
        students: syncData?.students || [],
        validations: [...(syncData?.validations || []), validation],
        lastSync: new Date().toISOString(),
        eventId
      };

      await AsyncStorage.setItem(`${SYNC_DATA_KEY}_${eventId}`, JSON.stringify(updatedSyncData));
      
      return { success: true };
    } catch (error) {
      console.error('Failed to validate ticket:', error);
      return { success: false, error: 'Failed to validate ticket' };
    }
  }

  startAutoSync(eventId: string, onSyncUpdate: (data: SyncData) => void): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(async () => {
      try {
        const syncData = await this.loadSyncData(eventId);
        if (syncData) {
          onSyncUpdate(syncData);
        }
      } catch (error) {
        console.error('Auto-sync failed:', error);
      }
    }, 5000); // Sync every 5 seconds
  }

  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  async generateShareableLink(event: Event, students: Student[]): Promise<string> {
    const shareResult = await this.shareEvent(event, students);
    if (shareResult.success && shareResult.shareCode) {
      const baseUrl = Platform.OS === 'web' ? window.location.origin : 'https://your-app-domain.com';
      return `${baseUrl}/shared/${shareResult.shareCode}`;
    }
    throw new Error('Failed to generate shareable link');
  }

  async exportEventData(event: Event, students: Student[], validations: ValidationRecord[]): Promise<string> {
    const exportData = {
      event,
      students: students.filter(s => s.hasTicket),
      validations,
      exportedAt: new Date().toISOString(),
      exportedBy: this.deviceId
    };

    return JSON.stringify(exportData, null, 2);
  }
}

export const syncService = new SyncService();
export default syncService;