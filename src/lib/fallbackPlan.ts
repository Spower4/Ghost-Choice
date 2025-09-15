// Intelligent fallback plans based on query analysis
export function createIntelligentFallbackPlan(query: string, budget: number, style: 'Premium' | 'Casual') {
  const lowerQuery = query.toLowerCase();
  
  // Gaming Setup - Most comprehensive
  if (lowerQuery.includes('gaming') || lowerQuery.includes('game') || lowerQuery.includes('pc')) {
    return createGamingSetupPlan(budget, style);
  }
  
  // Home Office Setup
  if (lowerQuery.includes('office') || lowerQuery.includes('work') || lowerQuery.includes('desk')) {
    return createOfficeSetupPlan(budget, style);
  }
  
  // Bedroom Setup
  if (lowerQuery.includes('bedroom') || lowerQuery.includes('bed') || lowerQuery.includes('sleep')) {
    return createBedroomSetupPlan(budget, style);
  }
  
  // Kitchen Setup
  if (lowerQuery.includes('kitchen') || lowerQuery.includes('cook') || lowerQuery.includes('food')) {
    return createKitchenSetupPlan(budget, style);
  }
  
  // Living Room Setup
  if (lowerQuery.includes('living') || lowerQuery.includes('lounge') || lowerQuery.includes('tv')) {
    return createLivingRoomSetupPlan(budget, style);
  }
  
  // Default to gaming setup (most popular)
  return createGamingSetupPlan(budget, style);
}

function createGamingSetupPlan(budget: number, style: 'Premium' | 'Casual') {
  const isPremium = style === 'Premium';
  
  // Smart budget allocation based on importance
  const pcBudget = Math.round(budget * (isPremium ? 0.45 : 0.50)); // 45-50% for PC
  const monitorBudget = Math.round(budget * 0.20); // 20% for monitor
  const chairBudget = Math.round(budget * 0.15); // 15% for chair
  const deskBudget = Math.round(budget * 0.10); // 10% for desk
  const keyboardBudget = Math.round(budget * 0.04); // 4% for keyboard
  const mouseBudget = Math.round(budget * 0.03); // 3% for mouse
  const headsetBudget = Math.round(budget * 0.03); // 3% for headset
  
  return {
    categories: [
      { 
        category: isPremium ? "High-End Gaming PC" : "Gaming PC Desktop Computer", 
        priority: 10,
        budgetAllocation: pcBudget,
        searchTerms: isPremium ? ["gaming pc", "high end gaming computer", "gaming desktop"] : ["gaming pc", "gaming computer", "desktop pc"],
        requirements: isPremium ? ["RTX 4070+", "Intel i7/AMD Ryzen 7+", "16GB+ RAM"] : ["GTX 1660+", "Intel i5/AMD Ryzen 5+", "8GB+ RAM"]
      },
      { 
        category: isPremium ? "4K Gaming Monitor" : "Gaming Monitor 1440p", 
        priority: 9,
        budgetAllocation: monitorBudget,
        searchTerms: isPremium ? ["4k gaming monitor", "27 inch 4k monitor"] : ["gaming monitor", "1440p monitor", "144hz monitor"],
        requirements: isPremium ? ["4K resolution", "144Hz+", "27-32 inch"] : ["1440p resolution", "144Hz", "24-27 inch"]
      },
      { 
        category: isPremium ? "Premium Gaming Chair" : "Gaming Chair", 
        priority: 8,
        budgetAllocation: chairBudget,
        searchTerms: isPremium ? ["premium gaming chair", "ergonomic gaming chair"] : ["gaming chair", "office gaming chair"],
        requirements: isPremium ? ["Premium materials", "Lumbar support", "Adjustable"] : ["Comfortable", "Adjustable height", "Good support"]
      },
      { 
        category: isPremium ? "Premium Gaming Desk" : "Gaming Desk", 
        priority: 7,
        budgetAllocation: deskBudget,
        searchTerms: isPremium ? ["premium gaming desk", "large gaming desk"] : ["gaming desk", "computer desk"],
        requirements: isPremium ? ["Large surface", "Cable management", "Premium build"] : ["Sturdy", "Good size", "Cable management"]
      },
      { 
        category: isPremium ? "Mechanical Gaming Keyboard RGB" : "Mechanical Gaming Keyboard", 
        priority: 6,
        budgetAllocation: keyboardBudget,
        searchTerms: isPremium ? ["mechanical gaming keyboard", "rgb gaming keyboard"] : ["mechanical keyboard", "gaming keyboard"],
        requirements: isPremium ? ["Mechanical switches", "RGB lighting", "Premium build"] : ["Mechanical switches", "Gaming features"]
      },
      { 
        category: isPremium ? "High-End Gaming Mouse" : "Gaming Mouse", 
        priority: 5,
        budgetAllocation: mouseBudget,
        searchTerms: isPremium ? ["high end gaming mouse", "professional gaming mouse"] : ["gaming mouse", "optical gaming mouse"],
        requirements: isPremium ? ["High DPI", "Premium sensor", "Ergonomic"] : ["Good DPI", "Comfortable grip"]
      },
      { 
        category: isPremium ? "Premium Gaming Headset" : "Gaming Headset", 
        priority: 4,
        budgetAllocation: headsetBudget,
        searchTerms: isPremium ? ["premium gaming headset", "high end gaming headset"] : ["gaming headset", "gaming headphones"],
        requirements: isPremium ? ["Premium audio", "Noise cancelling", "Comfortable"] : ["Good audio", "Microphone", "Comfortable"]
      }
    ],
    budgetDistribution: [
      { category: isPremium ? "High-End Gaming PC" : "Gaming PC Desktop Computer", amount: pcBudget, percentage: Math.round((pcBudget/budget)*100), color: "#FF6B6B" },
      { category: isPremium ? "4K Gaming Monitor" : "Gaming Monitor 1440p", amount: monitorBudget, percentage: Math.round((monitorBudget/budget)*100), color: "#4ECDC4" },
      { category: isPremium ? "Premium Gaming Chair" : "Gaming Chair", amount: chairBudget, percentage: Math.round((chairBudget/budget)*100), color: "#45B7D1" },
      { category: isPremium ? "Premium Gaming Desk" : "Gaming Desk", amount: deskBudget, percentage: Math.round((deskBudget/budget)*100), color: "#96CEB4" },
      { category: isPremium ? "Mechanical Gaming Keyboard RGB" : "Mechanical Gaming Keyboard", amount: keyboardBudget, percentage: Math.round((keyboardBudget/budget)*100), color: "#FFA07A" },
      { category: isPremium ? "High-End Gaming Mouse" : "Gaming Mouse", amount: mouseBudget, percentage: Math.round((mouseBudget/budget)*100), color: "#98D8C8" },
      { category: isPremium ? "Premium Gaming Headset" : "Gaming Headset", amount: headsetBudget, percentage: Math.round((headsetBudget/budget)*100), color: "#F7DC6F" }
    ],
    searchStrategy: {
      approach: "setup" as const,
      categories: [
        isPremium ? "High-End Gaming PC" : "Gaming PC Desktop Computer",
        isPremium ? "4K Gaming Monitor" : "Gaming Monitor 1440p", 
        isPremium ? "Premium Gaming Chair" : "Gaming Chair",
        isPremium ? "Premium Gaming Desk" : "Gaming Desk",
        isPremium ? "Mechanical Gaming Keyboard RGB" : "Mechanical Gaming Keyboard",
        isPremium ? "High-End Gaming Mouse" : "Gaming Mouse",
        isPremium ? "Premium Gaming Headset" : "Gaming Headset"
      ],
      totalItems: 7
    }
  };
}

function createOfficeSetupPlan(budget: number, style: 'Premium' | 'Casual') {
  const isPremium = style === 'Premium';
  
  const laptopBudget = Math.round(budget * 0.40);
  const monitorBudget = Math.round(budget * 0.20);
  const chairBudget = Math.round(budget * 0.20);
  const deskBudget = Math.round(budget * 0.15);
  const accessoriesBudget = Math.round(budget * 0.05);
  
  return {
    categories: [
      { 
        category: isPremium ? "Premium Business Laptop" : "Business Laptop", 
        priority: 10,
        budgetAllocation: laptopBudget,
        searchTerms: isPremium ? ["premium laptop", "business laptop", "professional laptop"] : ["laptop", "business laptop"],
        requirements: isPremium ? ["Intel i7+", "16GB+ RAM", "SSD"] : ["Intel i5+", "8GB+ RAM", "SSD"]
      },
      { 
        category: isPremium ? "4K Monitor" : "Monitor 1440p", 
        priority: 9,
        budgetAllocation: monitorBudget,
        searchTerms: isPremium ? ["4k monitor", "professional monitor"] : ["monitor", "1440p monitor"],
        requirements: isPremium ? ["4K resolution", "27+ inch"] : ["1440p resolution", "24+ inch"]
      },
      { 
        category: isPremium ? "Premium Ergonomic Office Chair" : "Ergonomic Office Chair", 
        priority: 8,
        budgetAllocation: chairBudget,
        searchTerms: isPremium ? ["premium office chair", "ergonomic chair"] : ["office chair", "ergonomic chair"],
        requirements: isPremium ? ["Premium materials", "Full adjustability"] : ["Lumbar support", "Adjustable"]
      },
      { 
        category: isPremium ? "Premium Standing Desk" : "Office Desk", 
        priority: 7,
        budgetAllocation: deskBudget,
        searchTerms: isPremium ? ["standing desk", "premium desk"] : ["office desk", "computer desk"],
        requirements: isPremium ? ["Height adjustable", "Large surface"] : ["Sturdy", "Good size"]
      },
      { 
        category: "Office Accessories", 
        priority: 6,
        budgetAllocation: accessoriesBudget,
        searchTerms: ["keyboard mouse combo", "office accessories"],
        requirements: ["Wireless", "Comfortable"]
      }
    ],
    budgetDistribution: [
      { category: isPremium ? "Premium Business Laptop" : "Business Laptop", amount: laptopBudget, percentage: Math.round((laptopBudget/budget)*100), color: "#FF6B6B" },
      { category: isPremium ? "4K Monitor" : "Monitor 1440p", amount: monitorBudget, percentage: Math.round((monitorBudget/budget)*100), color: "#4ECDC4" },
      { category: isPremium ? "Premium Ergonomic Office Chair" : "Ergonomic Office Chair", amount: chairBudget, percentage: Math.round((chairBudget/budget)*100), color: "#45B7D1" },
      { category: isPremium ? "Premium Standing Desk" : "Office Desk", amount: deskBudget, percentage: Math.round((deskBudget/budget)*100), color: "#96CEB4" },
      { category: "Office Accessories", amount: accessoriesBudget, percentage: Math.round((accessoriesBudget/budget)*100), color: "#FFA07A" }
    ],
    searchStrategy: {
      approach: "setup" as const,
      categories: [
        isPremium ? "Premium Business Laptop" : "Business Laptop",
        isPremium ? "4K Monitor" : "Monitor 1440p",
        isPremium ? "Premium Ergonomic Office Chair" : "Ergonomic Office Chair",
        isPremium ? "Premium Standing Desk" : "Office Desk",
        "Office Accessories"
      ],
      totalItems: 5
    }
  };
}

function createBedroomSetupPlan(budget: number, style: 'Premium' | 'Casual') {
  const isPremium = style === 'Premium';
  
  const bedFrameBudget = Math.round(budget * 0.20);
  const mattressBudget = Math.round(budget * 0.35);
  const pillowsBudget = Math.round(budget * 0.06);
  const sheetsBudget = Math.round(budget * 0.05);
  const nightstandBudget = Math.round(budget * 0.10);
  const dresserBudget = Math.round(budget * 0.12);
  const lampBudget = Math.round(budget * 0.04);
  const curtainsBudget = Math.round(budget * 0.04);
  const extrasBudget = Math.round(budget * 0.04);
  
  return {
    categories: [
      { 
        category: isPremium ? "Premium Memory Foam Mattress" : "Quality Mattress", 
        priority: 10,
        budgetAllocation: mattressBudget,
        searchTerms: isPremium ? ["premium memory foam mattress", "luxury mattress"] : ["mattress", "memory foam mattress"],
        requirements: isPremium ? ["Memory foam", "10+ year warranty", "Medium-firm"] : ["Comfortable", "Good support", "Durable"]
      },
      { 
        category: isPremium ? "Premium Bed Frame" : "Bed Frame", 
        priority: 9,
        budgetAllocation: bedFrameBudget,
        searchTerms: isPremium ? ["premium bed frame", "solid wood bed frame"] : ["bed frame", "platform bed"],
        requirements: isPremium ? ["Solid wood", "Premium finish", "Sturdy construction"] : ["Sturdy", "Good design", "Easy assembly"]
      },
      { 
        category: isPremium ? "Large Dresser with Mirror" : "Dresser", 
        priority: 8,
        budgetAllocation: dresserBudget,
        searchTerms: isPremium ? ["large dresser", "dresser with mirror"] : ["dresser", "chest of drawers"],
        requirements: isPremium ? ["Large storage", "Mirror included", "Quality wood"] : ["Good storage", "Sturdy", "Good finish"]
      },
      { 
        category: isPremium ? "Premium Nightstand Set" : "Nightstand", 
        priority: 7,
        budgetAllocation: nightstandBudget,
        searchTerms: isPremium ? ["premium nightstand", "bedside table set"] : ["nightstand", "bedside table"],
        requirements: isPremium ? ["Set of 2", "Drawers", "Premium materials"] : ["Storage", "Matches bed", "Functional"]
      },
      { 
        category: isPremium ? "Premium Pillow Set" : "Pillows", 
        priority: 6,
        budgetAllocation: pillowsBudget,
        searchTerms: isPremium ? ["premium pillows", "memory foam pillows"] : ["pillows", "bed pillows"],
        requirements: isPremium ? ["Memory foam", "Set of 4", "Hypoallergenic"] : ["Comfortable", "Set of 2", "Good support"]
      },
      { 
        category: isPremium ? "Premium Bed Sheet Set" : "Bed Sheets", 
        priority: 5,
        budgetAllocation: sheetsBudget,
        searchTerms: isPremium ? ["premium bed sheets", "luxury bed sheets"] : ["bed sheets", "sheet set"],
        requirements: isPremium ? ["High thread count", "Egyptian cotton", "Deep pockets"] : ["Soft", "Durable", "Easy care"]
      },
      { 
        category: isPremium ? "Designer Table Lamp" : "Bedside Lamp", 
        priority: 4,
        budgetAllocation: lampBudget,
        searchTerms: isPremium ? ["designer table lamp", "premium bedside lamp"] : ["bedside lamp", "table lamp"],
        requirements: isPremium ? ["Designer style", "Adjustable", "Quality materials"] : ["Good lighting", "Attractive", "Functional"]
      },
      { 
        category: isPremium ? "Blackout Curtains Premium" : "Curtains", 
        priority: 3,
        budgetAllocation: curtainsBudget,
        searchTerms: isPremium ? ["blackout curtains", "premium window treatments"] : ["curtains", "window curtains"],
        requirements: isPremium ? ["Blackout", "Premium fabric", "Custom fit"] : ["Light blocking", "Good quality", "Easy install"]
      },
      { 
        category: "Bedroom Accessories", 
        priority: 2,
        budgetAllocation: extrasBudget,
        searchTerms: ["bedroom decor", "throw pillows", "bedroom accessories"],
        requirements: ["Decorative", "Comfortable", "Matches style"]
      }
    ],
    budgetDistribution: [
      { category: isPremium ? "Premium Memory Foam Mattress" : "Quality Mattress", amount: mattressBudget, percentage: Math.round((mattressBudget/budget)*100), color: "#FF6B6B" },
      { category: isPremium ? "Premium Bed Frame" : "Bed Frame", amount: bedFrameBudget, percentage: Math.round((bedFrameBudget/budget)*100), color: "#4ECDC4" },
      { category: isPremium ? "Large Dresser with Mirror" : "Dresser", amount: dresserBudget, percentage: Math.round((dresserBudget/budget)*100), color: "#45B7D1" },
      { category: isPremium ? "Premium Nightstand Set" : "Nightstand", amount: nightstandBudget, percentage: Math.round((nightstandBudget/budget)*100), color: "#96CEB4" },
      { category: isPremium ? "Premium Pillow Set" : "Pillows", amount: pillowsBudget, percentage: Math.round((pillowsBudget/budget)*100), color: "#FECA57" },
      { category: isPremium ? "Premium Bed Sheet Set" : "Bed Sheets", amount: sheetsBudget, percentage: Math.round((sheetsBudget/budget)*100), color: "#FF9FF3" },
      { category: isPremium ? "Designer Table Lamp" : "Bedside Lamp", amount: lampBudget, percentage: Math.round((lampBudget/budget)*100), color: "#54A0FF" },
      { category: isPremium ? "Blackout Curtains Premium" : "Curtains", amount: curtainsBudget, percentage: Math.round((curtainsBudget/budget)*100), color: "#5F27CD" },
      { category: "Bedroom Accessories", amount: extrasBudget, percentage: Math.round((extrasBudget/budget)*100), color: "#FFA07A" }
    ],
    searchStrategy: {
      approach: "setup" as const,
      categories: [
        isPremium ? "Premium Memory Foam Mattress" : "Quality Mattress",
        isPremium ? "Premium Bed Frame" : "Bed Frame",
        isPremium ? "Large Dresser with Mirror" : "Dresser",
        isPremium ? "Premium Nightstand Set" : "Nightstand",
        isPremium ? "Premium Pillow Set" : "Pillows",
        isPremium ? "Premium Bed Sheet Set" : "Bed Sheets",
        isPremium ? "Designer Table Lamp" : "Bedside Lamp",
        isPremium ? "Blackout Curtains Premium" : "Curtains",
        "Bedroom Accessories"
      ],
      totalItems: 9
    }
  };
}

function createKitchenSetupPlan(budget: number, style: 'Premium' | 'Casual') {
  const isPremium = style === 'Premium';
  
  const refrigeratorBudget = Math.round(budget * 0.30);
  const stoveBudget = Math.round(budget * 0.20);
  const microwaveBudget = Math.round(budget * 0.10);
  const knivesBudget = Math.round(budget * 0.06);
  const cookwareBudget = Math.round(budget * 0.10);
  const dinnerwareBudget = Math.round(budget * 0.05);
  const appliancesBudget = Math.round(budget * 0.12);
  const storageBudget = Math.round(budget * 0.04);
  const extrasBudget = Math.round(budget * 0.03);
  
  return {
    categories: [
      { 
        category: isPremium ? "Premium Refrigerator" : "Refrigerator", 
        priority: 10,
        budgetAllocation: refrigeratorBudget,
        searchTerms: isPremium ? ["premium refrigerator", "stainless steel refrigerator"] : ["refrigerator", "fridge"],
        requirements: isPremium ? ["Stainless steel", "Energy efficient", "Large capacity"] : ["Good capacity", "Energy efficient", "Reliable"]
      },
      { 
        category: isPremium ? "Premium Gas Range" : "Stove Cooktop", 
        priority: 9,
        budgetAllocation: stoveBudget,
        searchTerms: isPremium ? ["premium gas range", "professional cooktop"] : ["stove", "cooktop", "range"],
        requirements: isPremium ? ["Gas burners", "Oven included", "Professional grade"] : ["Multiple burners", "Reliable", "Easy to clean"]
      },
      { 
        category: isPremium ? "Convection Microwave" : "Microwave", 
        priority: 8,
        budgetAllocation: microwaveBudget,
        searchTerms: isPremium ? ["convection microwave", "premium microwave"] : ["microwave", "microwave oven"],
        requirements: isPremium ? ["Convection feature", "Large capacity", "Stainless steel"] : ["Good size", "Reliable", "Easy to use"]
      },
      { 
        category: isPremium ? "Professional Cookware Set" : "Cookware Set", 
        priority: 7,
        budgetAllocation: cookwareBudget,
        searchTerms: isPremium ? ["professional cookware set", "premium pots and pans"] : ["cookware set", "pots and pans"],
        requirements: isPremium ? ["Stainless steel", "Professional grade", "Complete set"] : ["Non-stick", "Durable", "Complete set"]
      },
      { 
        category: isPremium ? "Small Kitchen Appliances Premium" : "Small Kitchen Appliances", 
        priority: 6,
        budgetAllocation: appliancesBudget,
        searchTerms: isPremium ? ["premium blender", "stand mixer", "coffee maker"] : ["blender", "toaster", "coffee maker"],
        requirements: isPremium ? ["High-end brands", "Multiple appliances", "Durable"] : ["Essential appliances", "Good quality", "Value"]
      },
      { 
        category: isPremium ? "Professional Knife Set" : "Kitchen Knife Set", 
        priority: 5,
        budgetAllocation: knivesBudget,
        searchTerms: isPremium ? ["professional knife set", "premium kitchen knives"] : ["kitchen knife set", "cooking knives"],
        requirements: isPremium ? ["High carbon steel", "Professional grade", "Complete set"] : ["Sharp", "Durable", "Essential knives"]
      },
      { 
        category: isPremium ? "Premium Dinnerware Set" : "Dinnerware Set", 
        priority: 4,
        budgetAllocation: dinnerwareBudget,
        searchTerms: isPremium ? ["premium dinnerware", "fine china set"] : ["dinnerware set", "plates and bowls"],
        requirements: isPremium ? ["Fine materials", "Complete service", "Elegant design"] : ["Durable", "Complete set", "Dishwasher safe"]
      },
      { 
        category: "Food Storage Containers", 
        priority: 3,
        budgetAllocation: storageBudget,
        searchTerms: ["food storage containers", "kitchen storage", "airtight containers"],
        requirements: ["Airtight", "Various sizes", "BPA-free"]
      },
      { 
        category: "Kitchen Accessories", 
        priority: 2,
        budgetAllocation: extrasBudget,
        searchTerms: ["kitchen utensils", "cutting board", "kitchen accessories"],
        requirements: ["Essential tools", "Good quality", "Functional"]
      }
    ],
    budgetDistribution: [
      { category: isPremium ? "Premium Refrigerator" : "Refrigerator", amount: refrigeratorBudget, percentage: Math.round((refrigeratorBudget/budget)*100), color: "#FF6B6B" },
      { category: isPremium ? "Premium Gas Range" : "Stove Cooktop", amount: stoveBudget, percentage: Math.round((stoveBudget/budget)*100), color: "#4ECDC4" },
      { category: isPremium ? "Convection Microwave" : "Microwave", amount: microwaveBudget, percentage: Math.round((microwaveBudget/budget)*100), color: "#45B7D1" },
      { category: isPremium ? "Professional Cookware Set" : "Cookware Set", amount: cookwareBudget, percentage: Math.round((cookwareBudget/budget)*100), color: "#96CEB4" },
      { category: isPremium ? "Small Kitchen Appliances Premium" : "Small Kitchen Appliances", amount: appliancesBudget, percentage: Math.round((appliancesBudget/budget)*100), color: "#FECA57" },
      { category: isPremium ? "Professional Knife Set" : "Kitchen Knife Set", amount: knivesBudget, percentage: Math.round((knivesBudget/budget)*100), color: "#FF9FF3" },
      { category: isPremium ? "Premium Dinnerware Set" : "Dinnerware Set", amount: dinnerwareBudget, percentage: Math.round((dinnerwareBudget/budget)*100), color: "#54A0FF" },
      { category: "Food Storage Containers", amount: storageBudget, percentage: Math.round((storageBudget/budget)*100), color: "#5F27CD" },
      { category: "Kitchen Accessories", amount: extrasBudget, percentage: Math.round((extrasBudget/budget)*100), color: "#FFA07A" }
    ],
    searchStrategy: {
      approach: "setup" as const,
      categories: [
        isPremium ? "Premium Refrigerator" : "Refrigerator",
        isPremium ? "Premium Gas Range" : "Stove Cooktop",
        isPremium ? "Convection Microwave" : "Microwave",
        isPremium ? "Professional Cookware Set" : "Cookware Set",
        isPremium ? "Small Kitchen Appliances Premium" : "Small Kitchen Appliances",
        isPremium ? "Professional Knife Set" : "Kitchen Knife Set",
        isPremium ? "Premium Dinnerware Set" : "Dinnerware Set",
        "Food Storage Containers",
        "Kitchen Accessories"
      ],
      totalItems: 9
    }
  };
}

function createLivingRoomSetupPlan(budget: number, style: 'Premium' | 'Casual') {
  const isPremium = style === 'Premium';
  
  const sofaBudget = Math.round(budget * 0.35);
  const tvBudget = Math.round(budget * 0.25);
  const coffeeTableBudget = Math.round(budget * 0.10);
  const tvStandBudget = Math.round(budget * 0.08);
  const sideTablesBudget = Math.round(budget * 0.06);
  const lampsBudget = Math.round(budget * 0.05);
  const rugBudget = Math.round(budget * 0.06);
  const decorBudget = Math.round(budget * 0.03);
  const extrasBudget = Math.round(budget * 0.02);
  
  return {
    categories: [
      { 
        category: isPremium ? "Premium Sectional Sofa" : "Sofa Couch", 
        priority: 10,
        budgetAllocation: sofaBudget,
        searchTerms: isPremium ? ["premium sectional sofa", "luxury couch"] : ["sofa", "couch", "sectional"],
        requirements: isPremium ? ["Premium materials", "Large seating", "Comfortable"] : ["Comfortable", "Good size", "Durable"]
      },
      { 
        category: isPremium ? "4K Smart TV Large" : "Smart TV", 
        priority: 9,
        budgetAllocation: tvBudget,
        searchTerms: isPremium ? ["4k smart tv", "large screen tv", "premium tv"] : ["smart tv", "led tv"],
        requirements: isPremium ? ["4K resolution", "55+ inches", "Smart features"] : ["HD/4K", "Good size", "Smart features"]
      },
      { 
        category: isPremium ? "Premium Coffee Table" : "Coffee Table", 
        priority: 8,
        budgetAllocation: coffeeTableBudget,
        searchTerms: isPremium ? ["premium coffee table", "designer coffee table"] : ["coffee table", "living room table"],
        requirements: isPremium ? ["Premium materials", "Designer style", "Storage"] : ["Good size", "Sturdy", "Attractive"]
      },
      { 
        category: isPremium ? "Premium TV Stand Entertainment Center" : "TV Stand", 
        priority: 7,
        budgetAllocation: tvStandBudget,
        searchTerms: isPremium ? ["premium tv stand", "entertainment center"] : ["tv stand", "media console"],
        requirements: isPremium ? ["Large storage", "Premium finish", "Cable management"] : ["Fits TV", "Storage", "Sturdy"]
      },
      { 
        category: isPremium ? "Designer Side Tables Set" : "Side Tables", 
        priority: 6,
        budgetAllocation: sideTablesBudget,
        searchTerms: isPremium ? ["designer side tables", "premium end tables"] : ["side tables", "end tables"],
        requirements: isPremium ? ["Set of 2", "Designer style", "Quality materials"] : ["Functional", "Matches decor", "Good size"]
      },
      { 
        category: isPremium ? "Large Area Rug Premium" : "Area Rug", 
        priority: 5,
        budgetAllocation: rugBudget,
        searchTerms: isPremium ? ["premium area rug", "large living room rug"] : ["area rug", "living room rug"],
        requirements: isPremium ? ["Large size", "Premium materials", "Designer pattern"] : ["Good size", "Comfortable", "Attractive"]
      },
      { 
        category: isPremium ? "Designer Floor Lamps" : "Table Lamps", 
        priority: 4,
        budgetAllocation: lampsBudget,
        searchTerms: isPremium ? ["designer floor lamp", "premium table lamps"] : ["table lamps", "floor lamp"],
        requirements: isPremium ? ["Designer style", "Quality materials", "Good lighting"] : ["Good lighting", "Attractive", "Functional"]
      },
      { 
        category: "Living Room Decor", 
        priority: 3,
        budgetAllocation: decorBudget,
        searchTerms: ["throw pillows", "wall art", "living room decor"],
        requirements: ["Decorative", "Matches style", "Quality"]
      },
      { 
        category: "Living Room Accessories", 
        priority: 2,
        budgetAllocation: extrasBudget,
        searchTerms: ["remote control holder", "coasters", "living room accessories"],
        requirements: ["Functional", "Attractive", "Useful"]
      }
    ],
    budgetDistribution: [
      { category: isPremium ? "Premium Sectional Sofa" : "Sofa Couch", amount: sofaBudget, percentage: Math.round((sofaBudget/budget)*100), color: "#FF6B6B" },
      { category: isPremium ? "4K Smart TV Large" : "Smart TV", amount: tvBudget, percentage: Math.round((tvBudget/budget)*100), color: "#4ECDC4" },
      { category: isPremium ? "Premium Coffee Table" : "Coffee Table", amount: coffeeTableBudget, percentage: Math.round((coffeeTableBudget/budget)*100), color: "#45B7D1" },
      { category: isPremium ? "Premium TV Stand Entertainment Center" : "TV Stand", amount: tvStandBudget, percentage: Math.round((tvStandBudget/budget)*100), color: "#96CEB4" },
      { category: isPremium ? "Designer Side Tables Set" : "Side Tables", amount: sideTablesBudget, percentage: Math.round((sideTablesBudget/budget)*100), color: "#FECA57" },
      { category: isPremium ? "Large Area Rug Premium" : "Area Rug", amount: rugBudget, percentage: Math.round((rugBudget/budget)*100), color: "#FF9FF3" },
      { category: isPremium ? "Designer Floor Lamps" : "Table Lamps", amount: lampsBudget, percentage: Math.round((lampsBudget/budget)*100), color: "#54A0FF" },
      { category: "Living Room Decor", amount: decorBudget, percentage: Math.round((decorBudget/budget)*100), color: "#5F27CD" },
      { category: "Living Room Accessories", amount: extrasBudget, percentage: Math.round((extrasBudget/budget)*100), color: "#FFA07A" }
    ],
    searchStrategy: {
      approach: "setup" as const,
      categories: [
        isPremium ? "Premium Sectional Sofa" : "Sofa Couch",
        isPremium ? "4K Smart TV Large" : "Smart TV",
        isPremium ? "Premium Coffee Table" : "Coffee Table",
        isPremium ? "Premium TV Stand Entertainment Center" : "TV Stand",
        isPremium ? "Designer Side Tables Set" : "Side Tables",
        isPremium ? "Large Area Rug Premium" : "Area Rug",
        isPremium ? "Designer Floor Lamps" : "Table Lamps",
        "Living Room Decor",
        "Living Room Accessories"
      ],
      totalItems: 9
    }
  };
}

// Legacy fallback for compatibility
export const FALLBACK_PLAN = createIntelligentFallbackPlan("gaming setup", 1000, "Premium");