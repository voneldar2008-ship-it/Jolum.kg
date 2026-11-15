export type Language = 'ru' | 'kg' | 'en';

export type LocalizedString = {
  ru: string;
  kg: string;
  en?: string;
};

export type BusOccupancy = 'low' | 'medium' | 'high';

export interface Stop {
  id: string;
  name: LocalizedString;
  lat: number;
  lng: number;
  routes: string[]; // route IDs passing this stop
  address?: LocalizedString;
  amenities?: ('shelter' | 'wifi' | 'bench' | 'screen' | 'accessible')[];
}

export interface Route {
  id: string;
  number: string;
  name: LocalizedString;
  startStopId: string;
  endStopId: string;
  color: string;
  category: 'bus' | 'minibus' | 'express';
  stops: string[]; // ordered stop IDs for forward direction
  returnStops?: string[]; // ordered stop IDs for backward direction (optional, reverses stops if absent)
  waypoints: [number, number][]; // polyline coordinates for map
  durationMinutes: number;
  frequencyMinutes: number;
  fareKgs: number;
  firstDeparture: string;
  lastDeparture: string;
  description?: LocalizedString;
}

export interface Bus {
  id: string;
  plateNumber: string;
  routeId: string;
  direction: 'forward' | 'backward';
  currentLat: number;
  currentLng: number;
  speedKmh: number;
  bearing: number;
  nextStopId: string;
  progress: number; // 0.0 to 1.0 along the route path
  occupancy: BusOccupancy;
  model: string;
  isAccessible: boolean;
  hasWifi: boolean;
  hasAC: boolean;
  driverName: string;
  isGpsSimulated: boolean; // explicitly marks demo/simulated vs real GPS feed
  lastPingTime: string;
}

export interface Announcement {
  id: string;
  title: LocalizedString;
  content: LocalizedString;
  type: 'info' | 'warning' | 'alert' | 'service';
  date: string;
  affectedRoutes?: string[];
  isImportant?: boolean;
}

export interface TransitStats {
  activeBusesCount: number;
  totalRoutes: number;
  totalStops: number;
  dailyRidershipEstimated: number;
  onTimePercentage: number;
  averageSpeedKmh: number;
  co2SavedTons: number;
}

export interface TripSegment {
  route: Route;
  boardStop: Stop;
  alightStop: Stop;
  stopsCount: number;
  durationMinutes: number;
}

export interface TripPlanOption {
  id: string;
  segments: TripSegment[];
  totalDurationMinutes: number;
  transfersCount: number;
  type: 'direct' | 'transfer';
}

export interface DelayIncident {
  id: string;
  routeId: string;
  routeNumber: string;
  busPlate: string;
  delayMinutes: number;
  reason: LocalizedString;
  time: string;
  status: 'active' | 'resolved';
}

export interface WeeklyLoadDay {
  dayKey: 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
  dayLabel: LocalizedString;
  avgOccupancyPct: number;
  peakOccupancyPct: number;
  passengersCount: number;
  byRoute: Record<string, { avgPct: number; peakPct: number; passengers: number }>;
}
