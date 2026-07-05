export const EDGE_TYPES = [
  'belongs_to','contains','explains','demonstrates','practices','drill_for','related_to','requires',
  'prerequisite_of','common_mistake_for','enables','mentions','contrasts_with','saved_from',
  'created_by','tagged_with','copied_from','forked_from'
] as const
export type EdgeType = typeof EDGE_TYPES[number]
export const SYMMETRIC_EDGE_TYPES = ['related_to','contrasts_with'] as const satisfies readonly EdgeType[]
