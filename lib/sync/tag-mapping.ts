/**
 * Natural Language Query to Tag Mapping
 * Maps common search terms and phrases to MangaDex tag IDs
 * This enables story-based discovery queries like:
 * - "dark revenge smart mc"
 * - "cultivation without harem"
 * - "completed manhwa 100+ chapters"
 */

// MangaDex tag IDs mapped to common search terms
// These are the actual MangaDex tag UUIDs
export const TAG_MAPPINGS: Record<string, string[]> = {
  // Genres
  action: ["391b0423-d847-456f-aff0-8b0cfc03066b"],
  adventure: ["87cc87cd-a395-47af-b27a-93258283bbc6"],
  comedy: ["4d32cc48-9f00-4cca-9b5a-a839f0764984"],
  drama: ["b9af3a63-f058-46de-a9a0-e0c13906197a"],
  fantasy: ["cdc58593-87dd-415e-bbc0-2ec27bf404cc"],
  horror: ["cdad7e68-1419-41dd-bdce-27753074a640"],
  mystery: ["ee968100-4191-4968-93d3-f82d72be7e46"],
  psychological: ["3b60b75c-a2d7-4860-ab56-05f391bb889c"],
  romance: ["423e2eae-a7a2-4a8b-ac03-a8351462d71d"],
  "slice of life": ["e5301a23-ebd9-49dd-a0cb-2add944c7fe9"],
  "sci-fi": ["256c8bd9-4904-4360-bf4f-508a76571a84"],
  thriller: ["07251805-a27e-4d59-b488-f0bfbec15168"],
  tragedy: ["f8f62932-27da-4fe4-8ee1-6779a8c5edba"],
  
  // Themes - Common search terms
  isekai: ["ace04997-f6bd-436e-b261-779182193d3d"],
  reincarnation: ["0bc90acb-ccc1-44ca-a34a-b9f3a73259d0"],
  "time travel": ["292e862b-2d17-4062-90a2-0356caa4ae27"],
  revenge: ["0a39b5a1-b235-4886-a747-1d05d216532d"],
  harem: ["aafb99c1-7f60-43fa-b75f-fc9502ce29c7"],
  "reverse harem": ["65761a2a-415e-47f3-bef2-a9dababba7a6"],
  cultivation: ["292e862b-2d17-4062-90a2-0356caa4ae27"], // Often tagged as Martial Arts
  "martial arts": ["799c202e-7daa-44eb-9cf7-8a3c0441531e"],
  magic: ["a1f53773-c69a-4ce5-8cab-fffcd90b1565"],
  supernatural: ["eabc5b4c-6aff-42f3-b657-3e90cbd00b75"],
  "school life": ["caaa44eb-cd40-4177-b930-79d3ef2afe87"],
  "video games": ["9438db5a-7e2a-4ac0-b39e-e0d95a34b8a8"],
  "virtual reality": ["8c86611e-fab7-4986-9dec-d1a2f44acdd5"],
  "monster girls": ["dd1f77c5-dea9-4e2b-97ae-224af09caf99"],
  demons: ["39730448-9a5f-48a2-85b0-a70db87b1233"],
  vampires: ["d7d1730f-6eb0-4ba6-9437-602cac38664c"],
  zombies: ["631ef465-9aba-4afb-b0fc-ea10efe274a8"],
  ghosts: ["3bb26d85-09d5-4d2e-880c-c34b974339e9"],
  survival: ["5fff9cde-849c-4b78-aab0-0d52b2ee1d25"],
  "post-apocalyptic": ["9467335a-1b83-4497-9231-765337a00b96"],
  military: ["ac72833b-c4e9-4c7e-a01e-35e65f0d8d3c"],
  police: ["df33b754-73a3-4c54-80e6-1a74a8058539"],
  crime: ["5ca48985-9a9d-4bd8-be29-80dc0303db72"],
  
  // Character types
  "smart mc": ["3b60b75c-a2d7-4860-ab56-05f391bb889c"], // Psychological often has smart MCs
  "op mc": ["f5ba408b-0e7a-484d-8d49-4e9125ac96de"], // Overpowered
  "weak to strong": ["acc803a4-c95a-4c22-86fc-eb6571140571"],
  antihero: ["5bd0e105-4481-44ca-b6e7-7544f56b27fc"],
  villainess: ["d14322ac-4d6f-4e9b-afd9-629d5f4d8a41"],
  
  // Tone/Style
  dark: ["3b60b75c-a2d7-4860-ab56-05f391bb889c"], // Psychological
  "gore": ["b29d6a3d-1569-4e7a-8caf-7557bc92cd5d"],
  mature: ["97893a4c-12af-4dac-b6be-0dffb353568e"],
  adult: ["97893a4c-12af-4dac-b6be-0dffb353568e"],
  wholesome: ["e197df38-d0e7-43b5-9b09-2842d0c326dd"], // Slice of Life
  fluffy: ["e197df38-d0e7-43b5-9b09-2842d0c326dd"],
  
  // Format
  "full color": ["f5ba408b-0e7a-484d-8d49-4e9125ac96de"],
  "long strip": ["3e2b8dae-350e-4ab8-a8ce-016e844b9f0d"],
  adaptation: ["f4122d1c-3b44-44d0-9936-ff7502c39ad3"],
  
  // Demographics
  shounen: ["shounen"],
  shoujo: ["shoujo"],
  seinen: ["seinen"],
  josei: ["josei"],
};

// Keywords that indicate exclusion (used with "without", "no", etc.)
export const EXCLUSION_KEYWORDS = [
  "without",
  "no",
  "not",
  "except",
  "excluding",
  "-",
];

// Keywords that indicate status
export const STATUS_KEYWORDS: Record<string, string> = {
  completed: "COMPLETED",
  complete: "COMPLETED",
  finished: "COMPLETED",
  ended: "COMPLETED",
  ongoing: "ONGOING",
  updating: "ONGOING",
  hiatus: "HIATUS",
  cancelled: "CANCELLED",
  canceled: "CANCELLED",
  dropped: "CANCELLED",
};

// Keywords that indicate original language
export const LANGUAGE_KEYWORDS: Record<string, string> = {
  manga: "ja",
  japanese: "ja",
  manhwa: "ko",
  korean: "ko",
  manhua: "zh",
  chinese: "zh",
  webtoon: "ko", // Most webtoons are Korean
};

// Aliases for common terms
export const TERM_ALIASES: Record<string, string> = {
  mc: "main character",
  ml: "male lead",
  fl: "female lead",
  op: "overpowered",
  regression: "time travel",
  regressor: "time travel",
  transmigration: "reincarnation",
  transmigrator: "reincarnation",
  system: "video games", // System novels often tagged this way
  cheat: "video games",
  dungeon: "video games",
  tower: "video games",
  gate: "video games",
  murim: "martial arts",
  wuxia: "martial arts",
  xianxia: "cultivation",
  xuanhuan: "cultivation",
};

export interface ParsedQuery {
  textQuery: string;
  includedTags: string[];
  excludedTags: string[];
  preferredTags: string[];
  status?: string;
  originalLanguage?: string;
  minChapters?: number;
  maxChapters?: number;
}

/**
 * Parse a natural language query into structured search parameters
 */
export function parseNaturalQuery(query: string): ParsedQuery {
  const result: ParsedQuery = {
    textQuery: "",
    includedTags: [],
    excludedTags: [],
    preferredTags: [],
  };

  if (!query || !query.trim()) {
    return result;
  }

  // Normalize query
  let normalizedQuery = query.toLowerCase().trim();
  
  // Replace aliases
  Object.entries(TERM_ALIASES).forEach(([alias, replacement]) => {
    const regex = new RegExp(`\\b${alias}\\b`, "gi");
    normalizedQuery = normalizedQuery.replace(regex, replacement);
  });

  const words = normalizedQuery.split(/\s+/);
  const textParts: string[] = [];
  let skipNext = false;
  let isExcluding = false;

  for (let i = 0; i < words.length; i++) {
    if (skipNext) {
      skipNext = false;
      continue;
    }

    const word = words[i];
    const nextWord = words[i + 1];

    // Check for exclusion keywords
    if (EXCLUSION_KEYWORDS.includes(word)) {
      isExcluding = true;
      continue;
    }

    // Check for chapter count patterns
    const chapterMatch = word.match(/^(\d+)\+?$/);
    if (chapterMatch && nextWord?.includes("chapter")) {
      result.minChapters = parseInt(chapterMatch[1], 10);
      skipNext = true;
      isExcluding = false;
      continue;
    }

    // Check for "X+ chapters" or "X chapters"
    if (word.includes("chapter") && i > 0) {
      const prevMatch = words[i - 1].match(/^(\d+)\+?$/);
      if (prevMatch) {
        result.minChapters = parseInt(prevMatch[1], 10);
      }
      continue;
    }

    // Check for status keywords
    if (STATUS_KEYWORDS[word]) {
      result.status = STATUS_KEYWORDS[word];
      isExcluding = false;
      continue;
    }

    // Check for language keywords
    if (LANGUAGE_KEYWORDS[word]) {
      result.originalLanguage = LANGUAGE_KEYWORDS[word];
      isExcluding = false;
      continue;
    }

    // Check for tag mappings (try multi-word first, then single word)
    let matchedTag = false;
    
    // Try two-word combinations
    if (nextWord) {
      const twoWord = `${word} ${nextWord}`;
      if (TAG_MAPPINGS[twoWord]) {
        const tagIds = TAG_MAPPINGS[twoWord];
        if (isExcluding) {
          result.excludedTags.push(...tagIds);
        } else {
          result.preferredTags.push(...tagIds);
        }
        skipNext = true;
        matchedTag = true;
        isExcluding = false;
      }
    }

    // Try single word
    if (!matchedTag && TAG_MAPPINGS[word]) {
      const tagIds = TAG_MAPPINGS[word];
      if (isExcluding) {
        result.excludedTags.push(...tagIds);
      } else {
        result.preferredTags.push(...tagIds);
      }
      matchedTag = true;
      isExcluding = false;
    }

    // If no tag match, add to text query
    if (!matchedTag && !EXCLUSION_KEYWORDS.includes(word)) {
      textParts.push(word);
      isExcluding = false;
    }
  }

  // Build text query from remaining parts
  result.textQuery = textParts.join(" ").trim();

  // Deduplicate tags
  result.includedTags = [...new Set(result.includedTags)];
  result.excludedTags = [...new Set(result.excludedTags)];
  result.preferredTags = [...new Set(result.preferredTags)];

  return result;
}

/**
 * Convert parsed query to search API parameters
 */
export function parsedQueryToSearchParams(parsed: ParsedQuery): {
  query?: string;
  includedTags?: string[];
  excludedTags?: string[];
  preferredTags?: string[];
  status?: string[];
  originalLanguage?: string[];
  minChapters?: number;
  maxChapters?: number;
} {
  return {
    query: parsed.textQuery || undefined,
    includedTags: parsed.includedTags.length > 0 ? parsed.includedTags : undefined,
    excludedTags: parsed.excludedTags.length > 0 ? parsed.excludedTags : undefined,
    preferredTags: parsed.preferredTags.length > 0 ? parsed.preferredTags : undefined,
    status: parsed.status ? [parsed.status] : undefined,
    originalLanguage: parsed.originalLanguage ? [parsed.originalLanguage] : undefined,
    minChapters: parsed.minChapters,
    maxChapters: parsed.maxChapters,
  };
}

