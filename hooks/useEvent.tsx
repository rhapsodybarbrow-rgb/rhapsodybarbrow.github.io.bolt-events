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
      await AsyncStorage.setItem("eventSettings", JSON.stringify(settings));
      setEventSettings(settings);
    } catch (error) {
      console.error("Failed to save event settings:", error);
      throw error;
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