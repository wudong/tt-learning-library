export const NODE_TYPES = [
  'video','skill','topic','note','drill','mistake','learning_path','collection','tag','creator','source','practice_session'
] as const
export type NodeType = typeof NODE_TYPES[number]
