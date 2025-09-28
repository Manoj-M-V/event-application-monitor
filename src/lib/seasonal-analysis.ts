import { format, getMonth, getYear, isWithinInterval, parse } from 'date-fns';

interface Festival {
  name: string;
  dates: {
    start: string;  // Format: MM-DD
    end: string;    // Format: MM-DD
  };
  regions: string[];
  categories: string[];
  description: string;
}

interface Season {
  name: string;
  months: number[];
  regions: string[];
  categories: string[];
  description: string;
}

// Major Indian festivals and their typical dates
const INDIAN_FESTIVALS: Festival[] = [
  {
    name: "Diwali",
    dates: { start: "10-15", end: "11-15" },  // Approximate range
    regions: ["All India", "North India", "South India"],
    categories: ["Sweets", "Gifts", "Electronics", "Clothing", "Home Decor"],
    description: "Major festival of lights with high consumer spending on sweets, gifts, and home items"
  },
  {
    name: "Navratri/Dussehra",
    dates: { start: "09-25", end: "10-25" },  // Approximate range
    regions: ["All India", "North India", "West India"],
    categories: ["Sweets", "Clothing", "Gifts", "Food"],
    description: "Nine-day festival with significant sweet consumption and gift-giving"
  },
  {
    name: "Raksha Bandhan",
    dates: { start: "08-10", end: "08-31" },  // Varies yearly
    regions: ["North India", "West India"],
    categories: ["Sweets", "Gifts"],
    description: "Festival celebrating sibling bonds with exchange of sweets and gifts"
  }
  // Add more festivals as needed
];

const SEASONS: Season[] = [
  {
    name: "Summer",
    months: [3, 4, 5], // March to May
    regions: ["All India"],
    categories: ["Beverages", "Ice Cream", "Cool Foods"],
    description: "Hot season with high demand for cooling products and summer-specific items"
  },
  {
    name: "Monsoon",
    months: [6, 7, 8], // June to August
    regions: ["All India"],
    categories: ["Hot Foods", "Snacks", "Beverages"],
    description: "Rainy season affecting outdoor activities and food preferences"
  },
  {
    name: "Winter",
    months: [11, 0, 1], // November to January
    regions: ["North India", "Central India"],
    categories: ["Hot Foods", "Sweets", "Winter Clothing"],
    description: "Cold season with increased demand for warm foods and winter items"
  }
];

export interface SeasonalContext {
  currentSeason?: Season;
  upcomingFestivals: Festival[];
  currentFestivals: Festival[];
  seasonalTrends: string[];
  businessRecommendations: string[];
}

export function analyzeSeasonalContext(
  businessCategory: string,
  region: string = "All India"
): SeasonalContext {
  const currentDate = new Date();
  const currentMonth = getMonth(currentDate);
  const currentYear = getYear(currentDate);

  // Find current season
  const currentSeason = SEASONS.find(season => 
    season.months.includes(currentMonth) && 
    season.regions.some(r => r === region || r === "All India")
  );

  // Find current and upcoming festivals
  const currentFestivals: Festival[] = [];
  const upcomingFestivals: Festival[] = [];
  const next30Days = new Date(currentDate.getTime() + 30 * 24 * 60 * 60 * 1000);

  INDIAN_FESTIVALS.forEach(festival => {
    const startDate = parse(festival.dates.start, "MM-dd", new Date(currentYear, 0, 1));
    const endDate = parse(festival.dates.end, "MM-dd", new Date(currentYear, 0, 1));
    
    // Adjust for year-end festivals
    if (startDate > endDate) {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    if (isWithinInterval(currentDate, { start: startDate, end: endDate })) {
      currentFestivals.push(festival);
    } else if (startDate > currentDate && startDate <= next30Days) {
      upcomingFestivals.push(festival);
    }
  });

  // Generate seasonal trends
  const seasonalTrends = generateSeasonalTrends(
    currentSeason,
    businessCategory,
    currentFestivals,
    upcomingFestivals
  );

  // Generate business recommendations
  const businessRecommendations = generateBusinessRecommendations(
    businessCategory,
    currentSeason,
    currentFestivals,
    upcomingFestivals
  );

  return {
    currentSeason,
    currentFestivals,
    upcomingFestivals,
    seasonalTrends,
    businessRecommendations
  };
}

function generateSeasonalTrends(
  currentSeason: Season | undefined,
  businessCategory: string,
  currentFestivals: Festival[],
  upcomingFestivals: Festival[]
): string[] {
  const trends: string[] = [];

  if (currentSeason) {
    trends.push(`Current ${currentSeason.name} season typically affects ${businessCategory} consumption patterns`);
    if (currentSeason.categories.includes(businessCategory)) {
      trends.push(`${currentSeason.name} is a key season for ${businessCategory} businesses`);
    }
  }

  currentFestivals.forEach(festival => {
    if (festival.categories.includes(businessCategory)) {
      trends.push(`${festival.name} is currently ongoing - historically high demand period`);
    }
  });

  upcomingFestivals.forEach(festival => {
    if (festival.categories.includes(businessCategory)) {
      trends.push(`${festival.name} is approaching - prepare for increased demand`);
    }
  });

  return trends;
}

function generateBusinessRecommendations(
  businessCategory: string,
  currentSeason: Season | undefined,
  currentFestivals: Festival[],
  upcomingFestivals: Festival[]
): string[] {
  const recommendations: string[] = [];

  if (currentSeason?.categories.includes(businessCategory)) {
    recommendations.push(`Optimize your inventory for ${currentSeason.name} season preferences`);
    recommendations.push(`Adjust pricing strategy considering seasonal demand`);
  }

  const relevantCurrentFestivals = currentFestivals.filter(f => 
    f.categories.includes(businessCategory)
  );

  if (relevantCurrentFestivals.length > 0) {
    recommendations.push(
      `Capitalize on ongoing ${relevantCurrentFestivals.map(f => f.name).join(", ")} festivities`
    );
    recommendations.push("Consider festival-specific promotions and packages");
  }

  const relevantUpcomingFestivals = upcomingFestivals.filter(f => 
    f.categories.includes(businessCategory)
  );

  if (relevantUpcomingFestivals.length > 0) {
    recommendations.push(
      `Prepare inventory for upcoming ${relevantUpcomingFestivals.map(f => f.name).join(", ")}`
    );
    recommendations.push("Plan marketing campaigns for upcoming festivals");
  }

  return recommendations;
}

// Helper function to extract location from business description
export function extractLocation(businessDescription: string): string {
  // Simple location extraction - can be enhanced with NLP
  const indianRegions = [
    "North India", "South India", "East India", "West India", 
    "Central India", "Northeast India"
  ];
  
  const foundRegion = indianRegions.find(region => 
    businessDescription.toLowerCase().includes(region.toLowerCase())
  );
  
  return foundRegion || "All India";
}