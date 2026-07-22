export const TABLE_TENNIS_TOPICS = [
    'Serve', 'Receive', 'Spin', 'Forehand', 'Backhand', 'Footwork', 'Tactics',
    'Match Analysis', 'Physical Training', 'Mental Game', 'Equipment'
];
export const NOTE_PARENT_NODE_TYPES = ['video', 'skill', 'topic', 'drill', 'mistake'];
const pairs = (...values) => values;
const sameTypePairs = (...types) => types.map((type) => [type, type]);
export const ONTOLOGY_RELATIONSHIPS = {
    belongs_to: pairs(['skill', 'topic'], ['topic', 'topic']),
    contains: pairs(['learning_path', 'video'], ['learning_path', 'skill'], ['learning_path', 'drill'], ['learning_path', 'note'], ['collection', 'video'], ['collection', 'skill'], ['collection', 'drill'], ['collection', 'note']),
    explains: pairs(['video', 'skill'], ['note', 'skill']),
    demonstrates: pairs(['video', 'skill']),
    practices: pairs(['drill', 'skill']),
    drill_for: pairs(['drill', 'skill'], ['drill', 'video']),
    related_to: pairs(...sameTypePairs('video', 'skill', 'topic', 'drill')),
    requires: pairs(['skill', 'skill']),
    prerequisite_of: pairs(['skill', 'skill']),
    common_mistake_for: pairs(['mistake', 'skill']),
    enables: pairs(['skill', 'skill']),
    mentions: pairs(['note', 'video'], ['note', 'skill'], ['note', 'topic'], ['note', 'drill'], ['note', 'mistake']),
    contrasts_with: pairs(['skill', 'skill'], ['video', 'video']),
    saved_from: pairs(['video', 'source']),
    created_by: pairs(['video', 'creator']),
    tagged_with: pairs(['video', 'tag'], ['skill', 'tag'], ['note', 'tag'], ['drill', 'tag'], ['mistake', 'tag'], ['learning_path', 'tag']),
    copied_from: pairs(['video', 'video'], ['skill', 'skill'], ['drill', 'drill']),
    forked_from: pairs(['video', 'video'], ['skill', 'skill'], ['drill', 'drill'])
};
export function isAllowedRelationship(source, target, edgeType) {
    return ONTOLOGY_RELATIONSHIPS[edgeType].some(([allowedSource, allowedTarget]) => allowedSource === source && allowedTarget === target);
}
