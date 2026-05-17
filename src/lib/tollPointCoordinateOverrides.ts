export interface TollPointCoordinateOverride {
  uf: string;
  roadNormalized: string;
  cityIncludes: string;
  nameIncludes?: string[];
  directionIncludes?: string;
  directionNormalized?: "both" | "increasing" | "decreasing" | "unknown";
  kmCandidates: Array<string | number>;
  lat: number;
  lon: number;
}

export const TOLL_POINT_COORDINATE_OVERRIDES: readonly TollPointCoordinateOverride[] = [
  {
    uf: "SP",
    roadNormalized: "SP-021",
    cityIncludes: "osasco",
    nameIncludes: ["externa"],
    kmCandidates: ["24,000", "24.000", 24000, 24],
    lat: -23.5883227,
    lon: -46.810068,
  },
  {
    uf: "SP",
    roadNormalized: "SP-021",
    cityIncludes: "osasco",
    nameIncludes: ["interna"],
    kmCandidates: ["24,000", "24.000", 24000, 24],
    lat: -23.5940081,
    lon: -46.8091097,
  },
  {
    uf: "SP",
    roadNormalized: "SP-021",
    cityIncludes: "osasco",
    kmCandidates: ["25,360", "25.360", 25360, 25.36],
    lat: -23.6000808,
    lon: -46.8130469,
  },
  {
    uf: "SP",
    roadNormalized: "SP-021",
    cityIncludes: "barueri",
    nameIncludes: ["castello branco", "interna"],
    kmCandidates: ["15,610", "15.610", 15610, 15.61],
    lat: -23.51789087,
    lon: -46.81385366,
  },
  {
    uf: "SP",
    roadNormalized: "SP-021",
    cityIncludes: "barueri",
    nameIncludes: ["castello branco", "externa"],
    kmCandidates: ["14,290", "14.290", 14290, 14.29],
    lat: -23.507804,
    lon: -46.822332,
  },
  {
    uf: "SP",
    roadNormalized: "BR-116",
    cityIncludes: "aruja",
    nameIncludes: ["rodoanel"],
    kmCandidates: ["204.8", "204,8", 204.8],
    lat: -23.413256,
    lon: -46.360903,
  },
  {
    uf: "SP",
    roadNormalized: "SP-070",
    cityIncludes: "guararema",
    directionIncludes: "leste",
    kmCandidates: ["57,400", "57.400", 57.4],
    lat: -23.384088,
    lon: -46.153959,
  },
  {
    uf: "SP",
    roadNormalized: "SP-070",
    cityIncludes: "guararema",
    directionIncludes: "oeste",
    kmCandidates: ["57,400", "57.400", 57.4],
    lat: -23.38431,
    lon: -46.153816,
  },
  {
    uf: "SP",
    roadNormalized: "BR-116",
    cityIncludes: "santa isabel",
    nameIncludes: ["guararema norte"],
    kmCandidates: ["182.4", "182,4", 182.4],
    lat: -23.346577,
    lon: -46.164833,
  },
  {
    uf: "SP",
    roadNormalized: "BR-116",
    cityIncludes: "guararema",
    nameIncludes: ["guararema sul"],
    kmCandidates: ["180.7", "180,7", 180.7],
    lat: -23.338755,
    lon: -46.150288,
  },
  {
    uf: "SP",
    roadNormalized: "BR-116",
    cityIncludes: "jacarei",
    nameIncludes: ["jacarei"],
    kmCandidates: ["165.1", "165,1", 165.1],
    lat: -23.296471,
    lon: -46.007414,
  },
  {
    uf: "RJ",
    roadNormalized: "BR-116",
    cityIncludes: "itatiaia",
    nameIncludes: ["itatiaia"],
    kmCandidates: ["324.8", "324,8", 324.8],
    lat: -22.494961,
    lon: -44.569561,
  },
];
