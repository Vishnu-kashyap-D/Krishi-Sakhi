// Local knowledge base: crop calendars, key operations and common pests for
// major Kerala / South Indian crops. Used for reminders, advisories and to
// ground the AI assistant. Day offsets are counted from the sowing/planting date.
// Values are general guidance (KAU Package of Practices style); farmers should
// confirm local recommendations with their Krishi Bhavan.

const CROPS = {
  rice: {
    name: 'Rice (Paddy)',
    seasons: [
      { name: 'Virippu (1st crop)', sow: 'April–May', harvest: 'August–September' },
      { name: 'Mundakan (2nd crop)', sow: 'September–October', harvest: 'December–January' },
      { name: 'Puncha (3rd crop)', sow: 'December–January', harvest: 'March–April' },
    ],
    durationDays: 120,
    operations: [
      { day: 0, task: 'Basal fertiliser and lime as per soil test at sowing/transplanting' },
      { day: 15, task: 'First weeding; maintain 2–5 cm standing water' },
      { day: 21, task: 'First top dressing of nitrogen (urea)' },
      { day: 45, task: 'Second top dressing at panicle initiation; watch for stem borer' },
      { day: 60, task: 'Check for blast and sheath blight in humid weather' },
      { day: 100, task: 'Drain the field 10–15 days before harvest' },
      { day: 120, task: 'Harvest when 80–85% of grains are straw coloured' },
    ],
    pests: [
      { name: 'Rice stem borer', signs: 'Dead heart in young plants, white ear heads later', action: 'Release Trichogramma egg parasitoids; remove egg masses; avoid excess nitrogen' },
      { name: 'Brown plant hopper', signs: 'Yellowing and drying in circular patches (hopper burn)', action: 'Drain field for a few days; avoid excess nitrogen; spray only on agronomist advice' },
      { name: 'Blast', signs: 'Spindle-shaped grey lesions on leaves, neck rot', action: 'Use resistant varieties; balanced nitrogen; fungicide if spreading' },
    ],
  },
  banana: {
    name: 'Banana (Nendran)',
    seasons: [{ name: 'Main planting', sow: 'August–September (rainfed) or January–February (irrigated)', harvest: '10–12 months after planting' }],
    durationDays: 330,
    operations: [
      { day: 0, task: 'Plant treated suckers; apply organic manure in pit' },
      { day: 30, task: 'First fertiliser dose; earth up around the plant' },
      { day: 60, task: 'Second fertiliser dose; remove side suckers' },
      { day: 120, task: 'Fertiliser dose; prop plants against wind before monsoon' },
      { day: 150, task: 'Fertiliser dose; check for pseudostem weevil' },
      { day: 210, task: 'Remove male bud after last hand opens; cover bunch' },
      { day: 300, task: 'Harvest when fingers are well filled and angles round off' },
    ],
    pests: [
      { name: 'Pseudostem weevil', signs: 'Jelly-like ooze and holes on the stem', action: 'Remove dried leaves; place cut-stem traps; destroy infested plants' },
      { name: 'Banana bunchy top virus', signs: 'Bunched, narrow upright leaves with dark streaks', action: 'Uproot and destroy infected plants; control aphids; use virus-free suckers' },
      { name: 'Sigatoka leaf spot', signs: 'Yellow streaks turning to brown spots on leaves', action: 'Remove affected leaves; improve drainage and spacing' },
    ],
  },
  coconut: {
    name: 'Coconut',
    seasons: [{ name: 'Planting', sow: 'May–June with onset of monsoon', harvest: 'Every 45–60 days once bearing' }],
    durationDays: 365,
    operations: [
      { day: 0, task: 'First fertiliser split with onset of south-west monsoon (May–June)' },
      { day: 120, task: 'Second fertiliser split with north-east monsoon (September–October)' },
      { day: 150, task: 'Mulch the basin with husk or leaves before the dry season' },
      { day: 210, task: 'Irrigate during summer (about 200 litres per palm every 4 days)' },
    ],
    pests: [
      { name: 'Rhinoceros beetle', signs: 'V-shaped cuts on opened fronds, holes in the crown', action: 'Hook out beetles; fill leaf axils with neem cake + sand; clean manure pits' },
      { name: 'Red palm weevil', signs: 'Brown ooze from holes in the trunk, crown wilting', action: 'Avoid injuring the trunk; use pheromone traps; consult Krishi Bhavan early' },
      { name: 'Bud rot', signs: 'Yellowing and rotting of the spindle leaf in monsoon', action: 'Remove rotten tissue and apply Bordeaux paste; prophylactic Bordeaux spray before monsoon' },
    ],
  },
  pepper: {
    name: 'Black Pepper',
    seasons: [{ name: 'Planting', sow: 'June–July (monsoon)', harvest: 'November–February' }],
    durationDays: 240,
    operations: [
      { day: 0, task: 'Plant rooted cuttings near standards; apply organic manure' },
      { day: 30, task: 'Prophylactic Bordeaux spray / Trichoderma for quick wilt' },
      { day: 90, task: 'Second fertiliser dose (August–September)' },
      { day: 210, task: 'Harvest when one or two berries in a spike turn red' },
    ],
    pests: [
      { name: 'Quick wilt (Phytophthora foot rot)', signs: 'Sudden wilting, black lesions at the collar during monsoon', action: 'Improve drainage; Trichoderma + neem cake; Bordeaux mixture as per KAU advice' },
      { name: 'Pollu beetle', signs: 'Hollow, dark berries that crumble', action: 'Spray during flowering/berry formation only on expert advice' },
    ],
  },
  vegetables: {
    name: 'Vegetables (amaranth, okra, cowpea, bitter gourd)',
    seasons: [{ name: 'Summer', sow: 'January–March (irrigated)', harvest: '45–90 days' }, { name: 'Rainy season', sow: 'May–June', harvest: '45–90 days' }],
    durationDays: 90,
    operations: [
      { day: 0, task: 'Basal dose of compost; seed treatment with Pseudomonas' },
      { day: 20, task: 'First top dressing; weeding' },
      { day: 35, task: 'Second top dressing; install fruit fly traps for gourds' },
      { day: 50, task: 'Begin harvest; pick every 2–3 days' },
    ],
    pests: [
      { name: 'Fruit fly (gourds)', signs: 'Rotting fruits with maggots', action: 'Pheromone / banana-jaggery traps; destroy fallen fruits' },
      { name: 'Aphids and whitefly', signs: 'Curling leaves, sticky honeydew', action: 'Spray neem oil 2% or soap solution; yellow sticky traps' },
    ],
  },
  rubber: {
    name: 'Rubber',
    seasons: [{ name: 'Planting', sow: 'June–July', harvest: 'Tapping from year 7' }],
    durationDays: 365,
    operations: [
      { day: 0, task: 'Apply fertiliser in two splits (April–May and September–October)' },
      { day: 60, task: 'Rain-guard tapping panels before monsoon' },
      { day: 150, task: 'Prophylactic spray against abnormal leaf fall before monsoon' },
    ],
    pests: [{ name: 'Abnormal leaf fall', signs: 'Leaves fall in monsoon with black lesions on petioles', action: 'Prophylactic copper-based spray before the monsoon' }],
  },
};

// Aliases so free-text crop names map to the knowledge base.
const ALIASES = {
  paddy: 'rice', rice: 'rice', nellu: 'rice',
  banana: 'banana', nendran: 'banana', plantain: 'banana',
  coconut: 'coconut', thengu: 'coconut',
  pepper: 'pepper', 'black pepper': 'pepper',
  okra: 'vegetables', bhindi: 'vegetables', amaranth: 'vegetables', cowpea: 'vegetables', 'bitter gourd': 'vegetables', vegetables: 'vegetables', tomato: 'vegetables', chilli: 'vegetables',
  rubber: 'rubber',
};

const resolveCrop = (name) => {
  if (!name) return null;
  const key = String(name).toLowerCase().trim();
  if (CROPS[key]) return key;
  if (ALIASES[key]) return ALIASES[key];
  const hit = Object.keys(ALIASES).find((a) => key.includes(a));
  return hit ? ALIASES[hit] : null;
};

// Government schemes relevant to farmers (official sources, no invented dates).
const SCHEMES = [
  { name: 'PM-KISAN', what: 'Income support of ₹6,000 per year in three instalments to landholding farmer families.', how: 'Register / check status and complete e-KYC on the official portal.', url: 'https://pmkisan.gov.in' },
  { name: 'Pradhan Mantri Fasal Bima Yojana (PMFBY)', what: 'Crop insurance against yield loss from natural calamities, pests and diseases.', how: 'Enrol before the seasonal cut-off date announced for your state and crop.', url: 'https://pmfby.gov.in' },
  { name: 'Soil Health Card', what: 'Free soil testing with crop-wise fertiliser recommendations.', how: 'Contact your Krishi Bhavan or soil testing lab.', url: 'https://soilhealth.dac.gov.in' },
  { name: 'Kisan Credit Card (KCC)', what: 'Short-term crop loans at concessional interest.', how: 'Apply through your bank, cooperative bank or PACS.', url: 'https://www.myscheme.gov.in/schemes/kcc' },
  { name: 'AIMS (Kerala Agriculture Department)', what: 'Kerala online portal for farmer registration, subsidies and crop-loss compensation.', how: 'Register with your land details on the AIMS portal.', url: 'https://www.aims.kerala.gov.in' },
];

module.exports = { CROPS, resolveCrop, SCHEMES };
