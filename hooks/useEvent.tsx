import { useState, useEffect, useCallback, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import { Event, EventSettings } from "@/types/event";



export const [EventProvider, useEvent] = createContextHook(() => {
  const [eventSettings, setEventSettings] = useState<EventSettings>({
    currentEvent: null,
    events: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadEventSettings();
  }, []);

  const loadEventSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem("eventSettings");
      if (stored) {
        try {
          // Check if the stored value is valid JSON
          const trimmedStored = stored.trim();
          if (!trimmedStored || trimmedStored === 'undefined' || trimmedStored === 'null' || trimmedStored === '') {
            console.warn('Invalid stored event settings, resetting to empty');
            const initialSettings = {
              currentEvent: null,
              events: [],
            };
            setEventSettings(initialSettings);
            await AsyncStorage.setItem("eventSettings", JSON.stringify(initialSettings));
            return;
          }
          
          // Check if it starts with valid JSON characters
          if (!trimmedStored.startsWith('{') && !trimmedStored.startsWith('[')) {
            console.error('Invalid JSON format for event settings, resetting to empty');
            console.log('First 100 chars of corrupted data:', trimmedStored.substring(0, 100));
            const initialSettings = {
              currentEvent: null,
              events: [],
            };
            setEventSettings(initialSettings);
            await AsyncStorage.setItem("eventSettings", JSON.stringify(initialSettings));
            return;
          }
          
          const parsed = JSON.parse(trimmedStored);
          if (parsed && typeof parsed === 'object') {
            // Ensure we have valid structure
            if (!parsed.events || !Array.isArray(parsed.events)) {
              parsed.events = [];
            }
            if (!parsed.currentEvent && parsed.events.length > 0) {
              parsed.currentEvent = parsed.events[0];
            }
            setEventSettings(parsed);
          } else {
            setEventSettings({
              currentEvent: null,
              events: [],
            });
          }
        } catch (parseError) {
          console.error('Failed to parse event settings:', parseError);
          console.log('Corrupted data:', stored?.substring(0, 200));
          const initialSettings = {
            currentEvent: null,
            events: [],
          };
          setEventSettings(initialSettings);
          await AsyncStorage.setItem("eventSettings", JSON.stringify(initialSettings));
        }
      } else {
        // Initialize with empty state
        const initialSettings = {
          currentEvent: null,
          events: [],
        };
        setEventSettings(initialSettings);
        await AsyncStorage.setItem("eventSettings", JSON.stringify(initialSettings));
      }
    } catch (error) {
      console.error("Failed to load event settings:", error);
      const initialSettings = {
        currentEvent: null,
        events: [],
      };
      setEventSettings(initialSettings);
      // Try to reset storage
      try {
        await AsyncStorage.setItem("eventSettings", JSON.stringify(initialSettings));
      } catch (e) {
        console.error("Failed to reset event settings storage:", e);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const saveEventSettings = async (settings: EventSettings) => {
    try {
      // Create a copy to avoid modifying the original
      const settingsToSave = { ...settings };
      
      // Process events to handle large base64 images
      if (settingsToSave.events) {
        settingsToSave.events = settingsToSave.events.map(event => {
          if (event.imageUrl && event.imageUrl.startsWith('data:')) {
            // For base64 images, ensure they're properly formatted
            // and not corrupted
            try {
              // Validate base64 format
              const base64Match = event.imageUrl.match(/^data:([^;]+);base64,(.+)$/);
              if (!base64Match) {
                console.warn('Invalid base64 image format, removing image');
                return { ...event, imageUrl: undefined };
              }
              return event;
            } catch (e) {
              console.error('Error processing base64 image:', e);
              return { ...event, imageUrl: undefined };
            }
          }
          return event;
        });
      }
      
      // Update current event reference if it exists in events array
      if (settingsToSave.currentEvent && settingsToSave.events) {
        const currentEventInArray = settingsToSave.events.find(
          e => e.id === settingsToSave.currentEvent?.id
        );
        if (currentEventInArray) {
          settingsToSave.currentEvent = currentEventInArray;
        }
      }
      
      const jsonString = JSON.stringify(settingsToSave);
      await AsyncStorage.setItem("eventSettings", jsonString);
      setEventSettings(settingsToSave);
    } catch (error) {
      console.error("Failed to save event settings:", error);
      if (error instanceof Error && error.message.includes('JSON')) {
        // If JSON error, try to save without images
        console.warn('Retrying save without images due to JSON error');
        const settingsWithoutImages = {
          ...settings,
          events: settings.events.map(e => ({ ...e, imageUrl: undefined })),
          currentEvent: settings.currentEvent ? 
            { ...settings.currentEvent, imageUrl: undefined } : null
        };
        try {
          await AsyncStorage.setItem("eventSettings", JSON.stringify(settingsWithoutImages));
          setEventSettings(settingsWithoutImages);
        } catch (retryError) {
          console.error("Failed to save even without images:", retryError);
          throw retryError;
        }
      } else {
        throw error;
      }
    }
  };

  const updateCurrentEvent = useCallback(async (eventData: Partial<Omit<Event, 'id' | 'createdAt'>>) => {
    if (!eventSettings.currentEvent) return;

    const updatedEvent: Event = {
      ...eventSettings.currentEvent,
      ...eventData,
      updatedAt: new Date().toISOString(),
    };

    const updatedEvents = eventSettings.events.map(event =>
      event.id === updatedEvent.id ? updatedEvent : event
    );

    const newSettings: EventSettings = {
      currentEvent: updatedEvent,
      events: updatedEvents,
    };

    await saveEventSettings(newSettings);
  }, [eventSettings]);

  const createNewEvent = useCallback(async (eventData: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newEvent: Event = {
      ...eventData,
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const newSettings: EventSettings = {
      currentEvent: newEvent,
      events: [...eventSettings.events, newEvent],
    };

    await saveEventSettings(newSettings);
    return newEvent;
  }, [eventSettings]);

  const switchToEvent = useCallback(async (eventId: string) => {
    const event = eventSettings.events.find(e => e.id === eventId);
    if (!event) return;

    const newSettings: EventSettings = {
      ...eventSettings,
      currentEvent: event,
    };

    await saveEventSettings(newSettings);
  }, [eventSettings]);

  const deleteEvent = useCallback(async (eventId: string) => {
    const filteredEvents = eventSettings.events.filter(e => e.id !== eventId);
    let newCurrentEvent = eventSettings.currentEvent;

    // If we're deleting the current event, switch to the first remaining event or null
    if (eventSettings.currentEvent?.id === eventId) {
      newCurrentEvent = filteredEvents.length > 0 ? filteredEvents[0] : null;
    }

    const newSettings: EventSettings = {
      currentEvent: newCurrentEvent,
      events: filteredEvents,
    };

    await saveEventSettings(newSettings);
  }, [eventSettings]);

  return useMemo(
    () => ({
      eventSettings,
      currentEvent: eventSettings.currentEvent,
      events: eventSettings.events,
      isLoading,
      updateCurrentEvent,
      createNewEvent,
      switchToEvent,
      deleteEvent,
    }),
    [eventSettings, isLoading, updateCurrentEvent, createNewEvent, switchToEvent, deleteEvent]
  );
});