// A deterministic random number generator based on a string seed
const getSeededRandom = (seed) => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }
  return () => {
    h = Math.imul(1597334677, h) + 1 | 0;
    return ((h >>> 0) / 4294967296);
  };
};

const REVIEWER_NAMES = [
  "Ayesha K.", "Nimal P.", "Samantha S.", "Kamal D.", "Sanjeewa R.", "Kumari M.", "Nuwan T.", "Dinesh W.",
  "Chaminda J.", "Dilani F.", "Roshan G.", "Amila H.", "Thilini L.", "Malith N.", "Isuru B.", "Kasun V."
];

const REVIEW_COMMENTS = [
  "Very effective, saw results quickly. Would highly recommend.",
  "Good product but the packaging was slightly damaged.",
  "Standard quality. Works exactly as prescribed by my doctor.",
  "Easy to use and no side effects for me.",
  "Fast delivery by DocX, and the medicine is genuine.",
  "Helped a lot with my symptoms. Feeling much better now.",
  "Price is a bit high, but the quality is unmatched.",
  "Always keep this in my home medical kit. Very reliable."
];

export const enrichMedicineData = (medicine) => {
  const seed = medicine.medicineId || medicine.name || "default";
  const random = getSeededRandom(seed);

  // Pick a random number of reviews between 3 and 8
  const reviewCount = Math.floor(random() * 6) + 3;
  const reviews = [];
  let totalRating = 0;

  for (let i = 0; i < reviewCount; i++) {
    // Generate realistic ratings biased towards 4 and 5
    const ratingPool = [5, 5, 5, 4, 4, 4, 4, 3, 3, 2, 1];
    const rating = ratingPool[Math.floor(random() * ratingPool.length)];
    totalRating += rating;
    
    // Pick random name and comment
    const name = REVIEWER_NAMES[Math.floor(random() * REVIEWER_NAMES.length)];
    const comment = REVIEW_COMMENTS[Math.floor(random() * REVIEW_COMMENTS.length)];
    
    // Generate a random recent date
    const daysAgo = Math.floor(random() * 60) + 1;
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);

    reviews.push({
      id: `${seed}-review-${i}`,
      reviewerName: name,
      rating,
      comment,
      date: date.toISOString().split("T")[0]
    });
  }

  const averageRating = (totalRating / reviewCount).toFixed(1);

  // Generate Advanced Specifications based on Category
  const specifications = [
    { label: "Category", value: medicine.category || "General wellness" },
    { label: "Subcategory", value: medicine.subCategory || "Not specified" },
    { label: "Manufacturer", value: medicine.manufacturer || "DocX Pharmacy" }
  ];

  let longDescription = {
    overview: `This is a high-quality ${medicine.category.toLowerCase()} product manufactured by ${medicine.manufacturer || "DocX Pharmacy"}. It is carefully formulated to provide effective relief and support for your specific health needs.`,
    benefits: [
      "Provides fast and effective results.",
      "Manufactured under strict quality control standards.",
      "Clinically tested for safety and efficacy."
    ],
    usage: "Use exactly as directed by your healthcare provider or according to the package instructions. Do not exceed the recommended dose."
  };

  if (medicine.category === "Stomach care") {
    specifications.push({ label: "Dosage Form", value: "Capsules/Tablets/Syrup" });
    specifications.push({ label: "Storage", value: "Store in a cool, dry place away from direct sunlight." });
    longDescription.benefits = [
      "Rapid relief from acidity and indigestion.",
      "Soothes the stomach lining.",
      "Improves overall digestive health."
    ];
  } else if (medicine.category === "Respiratory care") {
    specifications.push({ label: "Dosage Form", value: "Inhaler/Tablets/Syrup" });
    specifications.push({ label: "Storage", value: "Keep tightly closed. Do not expose to temperatures above 30°C." });
    longDescription.benefits = [
      "Clears airways for easier breathing.",
      "Reduces inflammation in the respiratory tract.",
      "Provides long-lasting relief from allergy symptoms."
    ];
  } else if (medicine.category === "Cardiac care") {
    specifications.push({ label: "Dosage Form", value: "Tablets" });
    specifications.push({ label: "Storage", value: "Store below 25°C in original packaging." });
    longDescription.benefits = [
      "Helps maintain healthy blood pressure levels.",
      "Supports overall cardiovascular function.",
      "Prevents plaque buildup in arteries."
    ];
  } else if (medicine.category === "Infection") {
    specifications.push({ label: "Dosage Form", value: "Tablets/Capsules/Cream" });
    specifications.push({ label: "Active Ingredient", value: "Broad-spectrum antimicrobial" });
    longDescription.benefits = [
      "Effectively targets and eliminates infection-causing microbes.",
      "Helps prevent the spread of the infection.",
      "Fast-acting formula to reduce recovery time."
    ];
    longDescription.usage = "Take the full course of treatment as prescribed, even if symptoms improve early.";
  } else if (medicine.category === "Diabetic Care") {
    specifications.push({ label: "Storage", value: "Store in a refrigerator (2°C - 8°C). Do not freeze." });
    longDescription.benefits = [
      "Helps regulate blood sugar levels efficiently.",
      "Reduces the risk of diabetes-related complications.",
      "Easy and safe to administer."
    ];
  } else {
    specifications.push({ label: "Storage", value: "Store at room temperature." });
  }

  return {
    ...medicine,
    reviews,
    reviewCount,
    averageRating: Number(averageRating),
    advancedSpecifications: specifications,
    longDescription
  };
};
