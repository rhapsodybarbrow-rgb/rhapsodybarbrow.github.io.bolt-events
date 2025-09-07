export interface Event {
  id: string;
  name: string;
  date: string; // ISO date string
  time: string; // HH:MM format
  location?: string;
  description?: string;
  instructions?: string;
  directions?: string;
  imageUrl?: string; // URL or base64 image for ticket display
  createdAt: string;
  updatedAt: string;
}

export interface EventSettings {
  currentEvent: Event | null;
  events: Event[];
}