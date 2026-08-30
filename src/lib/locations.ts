export type CountryOption = {
  name: string;
  cities: string[];
};

// Curated for Aurevyn's target markets. "Other" is always appended in the UI
// as a fallback so nobody is ever blocked from registering.
export const COUNTRIES: CountryOption[] = [
  { name: "Kenya", cities: ["Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret", "Thika", "Malindi"] },
  { name: "Uganda", cities: ["Kampala", "Entebbe", "Jinja", "Mbarara", "Gulu"] },
  { name: "Tanzania", cities: ["Dar es Salaam", "Dodoma", "Arusha", "Mwanza", "Zanzibar City"] },
  { name: "Rwanda", cities: ["Kigali", "Butare", "Gisenyi", "Musanze"] },
  { name: "Nigeria", cities: ["Lagos", "Abuja", "Kano", "Ibadan", "Port Harcourt"] },
  { name: "Ghana", cities: ["Accra", "Kumasi", "Tamale", "Takoradi"] },
  { name: "South Africa", cities: ["Johannesburg", "Cape Town", "Durban", "Pretoria", "Port Elizabeth"] },
  { name: "Ethiopia", cities: ["Addis Ababa", "Dire Dawa", "Mekelle"] },
  { name: "Egypt", cities: ["Cairo", "Alexandria", "Giza"] },
  { name: "Zambia", cities: ["Lusaka", "Ndola", "Kitwe"] },
  { name: "Zimbabwe", cities: ["Harare", "Bulawayo"] },
  { name: "Senegal", cities: ["Dakar", "Thiès"] },
  { name: "Côte d'Ivoire", cities: ["Abidjan", "Yamoussoukro"] },
  { name: "Cameroon", cities: ["Douala", "Yaoundé"] },
  { name: "Morocco", cities: ["Casablanca", "Rabat", "Marrakesh"] },
  { name: "Botswana", cities: ["Gaborone", "Francistown"] },
  { name: "Malawi", cities: ["Lilongwe", "Blantyre"] },
  { name: "Mozambique", cities: ["Maputo", "Beira"] },
  { name: "Namibia", cities: ["Windhoek", "Walvis Bay"] },
  { name: "DR Congo", cities: ["Kinshasa", "Lubumbashi"] },
];

export const OTHER_OPTION = "Other";
