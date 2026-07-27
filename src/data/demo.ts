import type { ForecastPoint, ModelAid } from "../types";

export const forecastPoints: ForecastPoint[] = [
  { time: "THU  2PM", category: "H4", position: "24.5N 84.1W", wind: "145 MPH" },
  { time: "THU  8PM", category: "H4", position: "26.2N 84.8W", wind: "140 MPH", interpolated: true },
  { time: "FRI  2AM", category: "H3", position: "28.1N 85.2W", wind: "125 MPH", interpolated: true },
  { time: "FRI  8AM", category: "H2", position: "30.4N 85.1W", wind: "110 MPH" },
  { time: "SAT  2AM", category: "TS", position: "33.2N 84.5W", wind: "65 MPH" },
];

export const modelAids: ModelAid[] = [
  { name: "GFS", aid: "AGFS", color: "#3B82F6", wind: "105 kt", distance: "42 miles", age: "2h 14m" },
  { name: "ECMWF", aid: "AEMN", color: "#20BA82", wind: "115 kt", distance: "28 miles", age: "2h 18m" },
  { name: "NAM", aid: "ANAM", color: "#F1B709", wind: "95 kt", distance: "67 miles", age: "2h 21m" },
  { name: "HWRF", aid: "AHWRF", color: "#A75CE5", wind: "120 kt", distance: "19 miles", age: "2h 24m" },
  { name: "ICON", aid: "AICON", color: "#FF7C31", wind: "110 kt", distance: "54 miles", age: "2h 27m" },
  { name: "CMC", aid: "AGGEM", color: "#1DB6C5", wind: "90 kt", distance: "81 miles", age: "2h 30m" },
];

export const kitSections = [
  {
    title: "WATER",
    items: ["1 gal/person/day × 3 days", "Backup water filter"],
  },
  {
    title: "FOOD",
    items: ["3-day non-perishable supply", "Manual can opener"],
  },
  {
    title: "HEALTH & SAFETY",
    items: ["Prescription medications", "First-aid supplies", "Flashlights and batteries"],
  },
  {
    title: "DOCUMENTS & POWER",
    items: ["Waterproof document folder", "Phone power banks"],
  },
];
