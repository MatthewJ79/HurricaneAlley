export type PrepareSectionId =
  | "supplies"
  | "evacuation"
  | "communication"
  | "documents"
  | "personal";

export type PrepareChecklistGroup = {
  title: string;
  items: Array<{ id: string; label: string; detail?: string }>;
};

export const suppliesGroups: PrepareChecklistGroup[] = [
  {
    title: "Water",
    items: [
      {
        id: "water-supply",
        label: "Store one gallon of water per person per day",
        detail: "Keep at least a three-day supply; seven days is better when space allows.",
      },
      {
        id: "water-filter",
        label: "Pack a water filter or purification tablets",
      },
      {
        id: "water-pets",
        label: "Include drinking water for pets",
      },
  ],
  },
  {
    title: "Food & cooking",
    items: [
      {
        id: "food-supply",
        label: "Pack a three-day supply of shelf-stable food",
        detail: "Choose foods your household will actually eat and that require little preparation.",
      },
      { id: "food-opener", label: "Manual can opener" },
      { id: "food-special", label: "Infant, medical-diet, and pet food" },
      { id: "food-utensils", label: "Disposable plates, cups, and utensils" },
  ],
  },
  {
    title: "Health & personal needs",
    items: [
      {
        id: "health-medicine",
        label: "Seven-day supply of prescriptions",
        detail: "Include a written medication list, dosages, allergies, and pharmacy contact.",
      },
      { id: "health-first-aid", label: "First-aid kit and basic pain relievers" },
      { id: "health-hygiene", label: "Soap, sanitizer, toiletries, and sanitation supplies" },
      { id: "health-glasses", label: "Spare glasses, contacts, and hearing-aid batteries" },
      { id: "health-masks", label: "N95 or dust masks for cleanup" },
  ],
  },
  {
    title: "Power, light & information",
    items: [
      { id: "power-flashlights", label: "Flashlights or headlamps for each person" },
      { id: "power-batteries", label: "Extra batteries in the correct sizes" },
      { id: "power-banks", label: "Charged phone power banks and cables" },
      { id: "power-radio", label: "Battery or hand-crank NOAA weather radio" },
      { id: "power-cash", label: "Small bills and emergency cash" },
      { id: "power-tools", label: "Multipurpose tool, wrench, and work gloves" },
  ],
  },
  {
    title: "Clothing, shelter & pets",
    items: [
      { id: "shelter-clothes", label: "Change of clothes and sturdy closed-toe shoes" },
      { id: "shelter-rain", label: "Rain gear, blankets, and towels" },
      { id: "shelter-tarp", label: "Tarp, plastic sheeting, duct tape, and rope" },
      { id: "shelter-pets", label: "Pet carriers, leashes, medications, and records" },
      { id: "shelter-comfort", label: "Comfort items, games, and supplies for children" },
  ],
  },
];

export const evacuationGroups: PrepareChecklistGroup[] = [
  {
    title: "Route planning",
    items: [
      { id: "evac-zone", label: "Know your official evacuation zone" },
      { id: "evac-routes", label: "Save two routes away from the hazard area" },
      { id: "evac-fuel", label: "Keep the vehicle at least half full of fuel" },
      { id: "evac-transport", label: "Arrange transportation for anyone who needs help" },
  ],
  },
  {
    title: "Destinations & departure",
    items: [
      { id: "evac-destination", label: "Confirm two destinations in different directions" },
      { id: "evac-pets", label: "Confirm each destination accepts pets" },
      { id: "evac-trigger", label: "Choose a household departure trigger" },
      { id: "evac-go-bags", label: "Place go-bags and documents near the exit" },
  ],
  },
];

export const communicationGroups: PrepareChecklistGroup[] = [
  {
    title: "Household contact plan",
    items: [
      { id: "comm-contact", label: "Choose an out-of-area contact" },
      { id: "comm-numbers", label: "Print important phone numbers for every go-bag" },
      { id: "comm-checkin", label: "Set a check-in schedule and preferred method" },
      { id: "comm-text", label: "Agree to text first when networks are congested" },
  ],
  },
  {
    title: "Meeting & accessibility",
    items: [
      { id: "comm-meeting-near", label: "Choose a neighborhood meeting point" },
      { id: "comm-meeting-away", label: "Choose a meeting point outside the evacuation area" },
      { id: "comm-school", label: "Review school, daycare, and workplace emergency plans" },
      { id: "comm-neighbors", label: "Identify neighbors who may need or provide assistance" },
  ],
  },
];

export const documentGroups: PrepareChecklistGroup[] = [
  {
    title: "Identification & medical",
    items: [
      { id: "docs-id", label: "Copies of identification and birth certificates" },
      { id: "docs-medical", label: "Medication, allergy, and medical-device information" },
      { id: "docs-insurance", label: "Health, home, renters, flood, and vehicle policies" },
      { id: "docs-pets", label: "Pet identification and vaccination records" },
  ],
  },
  {
    title: "Property & recovery",
    items: [
      { id: "docs-home", label: "Current home inventory with photos or video" },
      { id: "docs-contacts", label: "Emergency, insurance, utility, and contractor contacts" },
      { id: "docs-property", label: "Lease, deed, vehicle title, and account information" },
      { id: "docs-waterproof", label: "Seal paper copies in a waterproof grab folder" },
      { id: "docs-digital", label: "Store encrypted digital copies in a secure location" },
  ],
  },
];

export const allBuiltInItems = [
  ...suppliesGroups,
  ...evacuationGroups,
  ...communicationGroups,
  ...documentGroups,
].flatMap((group) => group.items);
