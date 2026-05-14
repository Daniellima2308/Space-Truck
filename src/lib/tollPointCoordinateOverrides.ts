export interface TollPointCoordinateOverride {
  uf: string;
  roadNormalized: string;
  cityIncludes: string;
  nameIncludes?: string[];
  kmCandidates: Array<string | number>;
  lat: number;
  lon: number;
}

export const TOLL_POINT_COORDINATE_OVERRIDES: readonly TollPointCoordinateOverride[] = [
  {
    uf: "SP",
    roadNormalized: "SP-021",
    cityIncludes: "osasco",
    nameIncludes: ["raposo tavares", "externa"],
    kmCandidates: ["24,000", "24.000", 24000, 24],
    lat: -23.594113,
    lon: -46.809286,
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
    lat: -23.5171375,
    lon: -46.8127736,
  },
  {
    uf: "SP",
    roadNormalized: "SP-021",
    cityIncludes: "barueri",
    nameIncludes: ["castello branco", "externa"],
    kmCandidates: ["14,290", "14.290", 14290, 14.29],
    lat: -23.5079522,
    lon: -46.8233218,
  },
];
