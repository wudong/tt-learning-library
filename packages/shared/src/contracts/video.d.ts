import { z } from 'zod';
export declare const VideoDtoSchema: z.ZodObject<{
    id: z.ZodString;
    nodeId: z.ZodString;
    sourceUrl: z.ZodString;
    canonicalUrl: z.ZodNullable<z.ZodString>;
    sourcePlatform: z.ZodEnum<{
        other: "other";
        youtube: "youtube";
        facebook: "facebook";
    }>;
    externalId: z.ZodNullable<z.ZodString>;
    title: z.ZodNullable<z.ZodString>;
    description: z.ZodNullable<z.ZodString>;
    thumbnailUrl: z.ZodNullable<z.ZodString>;
    creatorName: z.ZodNullable<z.ZodString>;
    durationSeconds: z.ZodNullable<z.ZodNumber>;
    progress: z.ZodEnum<{
        saved: "saved";
        watching: "watching";
        watched: "watched";
    }>;
    learningState: z.ZodEnum<{
        none: "none";
        practicing: "practicing";
        revisit: "revisit";
        understood: "understood";
    }>;
    importance: z.ZodNullable<z.ZodNumber>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, z.core.$strip>;
export type VideoDto = z.infer<typeof VideoDtoSchema>;
export declare const CreateVideoRequestSchema: z.ZodObject<{
    sourceUrl: z.ZodString;
    title: z.ZodOptional<z.ZodString>;
    topicIds: z.ZodDefault<z.ZodArray<z.ZodString>>;
    skillIds: z.ZodDefault<z.ZodArray<z.ZodString>>;
    tagIds: z.ZodDefault<z.ZodArray<z.ZodString>>;
    progress: z.ZodDefault<z.ZodEnum<{
        saved: "saved";
        watching: "watching";
        watched: "watched";
    }>>;
    learningState: z.ZodDefault<z.ZodEnum<{
        none: "none";
        practicing: "practicing";
        revisit: "revisit";
        understood: "understood";
    }>>;
}, z.core.$strip>;
export type CreateVideoRequest = z.infer<typeof CreateVideoRequestSchema>;
export declare const UpdateVideoRequestSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    progress: z.ZodOptional<z.ZodEnum<{
        saved: "saved";
        watching: "watching";
        watched: "watched";
    }>>;
    learningState: z.ZodOptional<z.ZodEnum<{
        none: "none";
        practicing: "practicing";
        revisit: "revisit";
        understood: "understood";
    }>>;
    importance: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
}, z.core.$strip>;
export type UpdateVideoRequest = z.infer<typeof UpdateVideoRequestSchema>;
export declare const VideoListQuerySchema: z.ZodObject<{
    limit: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    offset: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    q: z.ZodOptional<z.ZodString>;
    topicId: z.ZodOptional<z.ZodString>;
    skillId: z.ZodOptional<z.ZodString>;
    tagId: z.ZodOptional<z.ZodString>;
    progress: z.ZodOptional<z.ZodEnum<{
        saved: "saved";
        watching: "watching";
        watched: "watched";
    }>>;
    learningState: z.ZodOptional<z.ZodEnum<{
        none: "none";
        practicing: "practicing";
        revisit: "revisit";
        understood: "understood";
    }>>;
    sourcePlatform: z.ZodOptional<z.ZodEnum<{
        other: "other";
        youtube: "youtube";
        facebook: "facebook";
    }>>;
}, z.core.$strip>;
export declare const VideoDetailDtoSchema: z.ZodObject<{
    video: z.ZodObject<{
        id: z.ZodString;
        nodeId: z.ZodString;
        sourceUrl: z.ZodString;
        canonicalUrl: z.ZodNullable<z.ZodString>;
        sourcePlatform: z.ZodEnum<{
            other: "other";
            youtube: "youtube";
            facebook: "facebook";
        }>;
        externalId: z.ZodNullable<z.ZodString>;
        title: z.ZodNullable<z.ZodString>;
        description: z.ZodNullable<z.ZodString>;
        thumbnailUrl: z.ZodNullable<z.ZodString>;
        creatorName: z.ZodNullable<z.ZodString>;
        durationSeconds: z.ZodNullable<z.ZodNumber>;
        progress: z.ZodEnum<{
            saved: "saved";
            watching: "watching";
            watched: "watched";
        }>;
        learningState: z.ZodEnum<{
            none: "none";
            practicing: "practicing";
            revisit: "revisit";
            understood: "understood";
        }>;
        importance: z.ZodNullable<z.ZodNumber>;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
    }, z.core.$strip>;
    node: z.ZodObject<{
        id: z.ZodString;
        nodeType: z.ZodEnum<{
            video: "video";
            skill: "skill";
            topic: "topic";
            note: "note";
            drill: "drill";
            mistake: "mistake";
            learning_path: "learning_path";
            collection: "collection";
            tag: "tag";
            creator: "creator";
            source: "source";
        }>;
        title: z.ZodString;
        summary: z.ZodNullable<z.ZodString>;
        visibility: z.ZodEnum<{
            private: "private";
            unlisted: "unlisted";
            public: "public";
        }>;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
    }, z.core.$strip>;
    topics: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        nodeType: z.ZodEnum<{
            video: "video";
            skill: "skill";
            topic: "topic";
            note: "note";
            drill: "drill";
            mistake: "mistake";
            learning_path: "learning_path";
            collection: "collection";
            tag: "tag";
            creator: "creator";
            source: "source";
        }>;
        title: z.ZodString;
        summary: z.ZodNullable<z.ZodString>;
        visibility: z.ZodEnum<{
            private: "private";
            unlisted: "unlisted";
            public: "public";
        }>;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
    }, z.core.$strip>>;
    skills: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        nodeType: z.ZodEnum<{
            video: "video";
            skill: "skill";
            topic: "topic";
            note: "note";
            drill: "drill";
            mistake: "mistake";
            learning_path: "learning_path";
            collection: "collection";
            tag: "tag";
            creator: "creator";
            source: "source";
        }>;
        title: z.ZodString;
        summary: z.ZodNullable<z.ZodString>;
        visibility: z.ZodEnum<{
            private: "private";
            unlisted: "unlisted";
            public: "public";
        }>;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
    }, z.core.$strip>>;
    tags: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        nodeType: z.ZodEnum<{
            video: "video";
            skill: "skill";
            topic: "topic";
            note: "note";
            drill: "drill";
            mistake: "mistake";
            learning_path: "learning_path";
            collection: "collection";
            tag: "tag";
            creator: "creator";
            source: "source";
        }>;
        title: z.ZodString;
        summary: z.ZodNullable<z.ZodString>;
        visibility: z.ZodEnum<{
            private: "private";
            unlisted: "unlisted";
            public: "public";
        }>;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
    }, z.core.$strip>>;
    notes: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        nodeType: z.ZodEnum<{
            video: "video";
            skill: "skill";
            topic: "topic";
            note: "note";
            drill: "drill";
            mistake: "mistake";
            learning_path: "learning_path";
            collection: "collection";
            tag: "tag";
            creator: "creator";
            source: "source";
        }>;
        title: z.ZodString;
        summary: z.ZodNullable<z.ZodString>;
        visibility: z.ZodEnum<{
            private: "private";
            unlisted: "unlisted";
            public: "public";
        }>;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
    }, z.core.$strip>>;
    drills: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        nodeType: z.ZodEnum<{
            video: "video";
            skill: "skill";
            topic: "topic";
            note: "note";
            drill: "drill";
            mistake: "mistake";
            learning_path: "learning_path";
            collection: "collection";
            tag: "tag";
            creator: "creator";
            source: "source";
        }>;
        title: z.ZodString;
        summary: z.ZodNullable<z.ZodString>;
        visibility: z.ZodEnum<{
            private: "private";
            unlisted: "unlisted";
            public: "public";
        }>;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
    }, z.core.$strip>>;
    related: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        nodeType: z.ZodEnum<{
            video: "video";
            skill: "skill";
            topic: "topic";
            note: "note";
            drill: "drill";
            mistake: "mistake";
            learning_path: "learning_path";
            collection: "collection";
            tag: "tag";
            creator: "creator";
            source: "source";
        }>;
        title: z.ZodString;
        summary: z.ZodNullable<z.ZodString>;
        visibility: z.ZodEnum<{
            private: "private";
            unlisted: "unlisted";
            public: "public";
        }>;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
    }, z.core.$strip>>;
    learningPaths: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        nodeType: z.ZodEnum<{
            video: "video";
            skill: "skill";
            topic: "topic";
            note: "note";
            drill: "drill";
            mistake: "mistake";
            learning_path: "learning_path";
            collection: "collection";
            tag: "tag";
            creator: "creator";
            source: "source";
        }>;
        title: z.ZodString;
        summary: z.ZodNullable<z.ZodString>;
        visibility: z.ZodEnum<{
            private: "private";
            unlisted: "unlisted";
            public: "public";
        }>;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const ConvertInboxResponseSchema: z.ZodObject<{
    data: z.ZodObject<{
        video: z.ZodObject<{
            id: z.ZodString;
            nodeId: z.ZodString;
            sourceUrl: z.ZodString;
            canonicalUrl: z.ZodNullable<z.ZodString>;
            sourcePlatform: z.ZodEnum<{
                other: "other";
                youtube: "youtube";
                facebook: "facebook";
            }>;
            externalId: z.ZodNullable<z.ZodString>;
            title: z.ZodNullable<z.ZodString>;
            description: z.ZodNullable<z.ZodString>;
            thumbnailUrl: z.ZodNullable<z.ZodString>;
            creatorName: z.ZodNullable<z.ZodString>;
            durationSeconds: z.ZodNullable<z.ZodNumber>;
            progress: z.ZodEnum<{
                saved: "saved";
                watching: "watching";
                watched: "watched";
            }>;
            learningState: z.ZodEnum<{
                none: "none";
                practicing: "practicing";
                revisit: "revisit";
                understood: "understood";
            }>;
            importance: z.ZodNullable<z.ZodNumber>;
            createdAt: z.ZodString;
            updatedAt: z.ZodString;
        }, z.core.$strip>;
        node: z.ZodObject<{
            id: z.ZodString;
            nodeType: z.ZodEnum<{
                video: "video";
                skill: "skill";
                topic: "topic";
                note: "note";
                drill: "drill";
                mistake: "mistake";
                learning_path: "learning_path";
                collection: "collection";
                tag: "tag";
                creator: "creator";
                source: "source";
            }>;
            title: z.ZodString;
            summary: z.ZodNullable<z.ZodString>;
            visibility: z.ZodEnum<{
                private: "private";
                unlisted: "unlisted";
                public: "public";
            }>;
            createdAt: z.ZodString;
            updatedAt: z.ZodString;
        }, z.core.$strip>;
        createdEdges: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            sourceNodeId: z.ZodString;
            targetNodeId: z.ZodString;
            edgeType: z.ZodEnum<{
                belongs_to: "belongs_to";
                contains: "contains";
                explains: "explains";
                demonstrates: "demonstrates";
                practices: "practices";
                drill_for: "drill_for";
                related_to: "related_to";
                requires: "requires";
                prerequisite_of: "prerequisite_of";
                common_mistake_for: "common_mistake_for";
                enables: "enables";
                mentions: "mentions";
                contrasts_with: "contrasts_with";
                saved_from: "saved_from";
                created_by: "created_by";
                tagged_with: "tagged_with";
                copied_from: "copied_from";
                forked_from: "forked_from";
            }>;
            label: z.ZodNullable<z.ZodString>;
            weight: z.ZodNullable<z.ZodNumber>;
            position: z.ZodNullable<z.ZodNumber>;
            createdAt: z.ZodString;
            updatedAt: z.ZodString;
        }, z.core.$strip>>;
        createdNote: z.ZodNullable<z.ZodObject<{
            id: z.ZodString;
            nodeType: z.ZodEnum<{
                video: "video";
                skill: "skill";
                topic: "topic";
                note: "note";
                drill: "drill";
                mistake: "mistake";
                learning_path: "learning_path";
                collection: "collection";
                tag: "tag";
                creator: "creator";
                source: "source";
            }>;
            title: z.ZodString;
            summary: z.ZodNullable<z.ZodString>;
            visibility: z.ZodEnum<{
                private: "private";
                unlisted: "unlisted";
                public: "public";
            }>;
            createdAt: z.ZodString;
            updatedAt: z.ZodString;
        }, z.core.$strip>>;
        alreadyConverted: z.ZodBoolean;
        alreadyExisting: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const VideoResponseSchema: z.ZodObject<{
    data: z.ZodObject<{
        video: z.ZodObject<{
            id: z.ZodString;
            nodeId: z.ZodString;
            sourceUrl: z.ZodString;
            canonicalUrl: z.ZodNullable<z.ZodString>;
            sourcePlatform: z.ZodEnum<{
                other: "other";
                youtube: "youtube";
                facebook: "facebook";
            }>;
            externalId: z.ZodNullable<z.ZodString>;
            title: z.ZodNullable<z.ZodString>;
            description: z.ZodNullable<z.ZodString>;
            thumbnailUrl: z.ZodNullable<z.ZodString>;
            creatorName: z.ZodNullable<z.ZodString>;
            durationSeconds: z.ZodNullable<z.ZodNumber>;
            progress: z.ZodEnum<{
                saved: "saved";
                watching: "watching";
                watched: "watched";
            }>;
            learningState: z.ZodEnum<{
                none: "none";
                practicing: "practicing";
                revisit: "revisit";
                understood: "understood";
            }>;
            importance: z.ZodNullable<z.ZodNumber>;
            createdAt: z.ZodString;
            updatedAt: z.ZodString;
        }, z.core.$strip>;
        node: z.ZodObject<{
            id: z.ZodString;
            nodeType: z.ZodEnum<{
                video: "video";
                skill: "skill";
                topic: "topic";
                note: "note";
                drill: "drill";
                mistake: "mistake";
                learning_path: "learning_path";
                collection: "collection";
                tag: "tag";
                creator: "creator";
                source: "source";
            }>;
            title: z.ZodString;
            summary: z.ZodNullable<z.ZodString>;
            visibility: z.ZodEnum<{
                private: "private";
                unlisted: "unlisted";
                public: "public";
            }>;
            createdAt: z.ZodString;
            updatedAt: z.ZodString;
        }, z.core.$strip>;
        topics: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            nodeType: z.ZodEnum<{
                video: "video";
                skill: "skill";
                topic: "topic";
                note: "note";
                drill: "drill";
                mistake: "mistake";
                learning_path: "learning_path";
                collection: "collection";
                tag: "tag";
                creator: "creator";
                source: "source";
            }>;
            title: z.ZodString;
            summary: z.ZodNullable<z.ZodString>;
            visibility: z.ZodEnum<{
                private: "private";
                unlisted: "unlisted";
                public: "public";
            }>;
            createdAt: z.ZodString;
            updatedAt: z.ZodString;
        }, z.core.$strip>>;
        skills: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            nodeType: z.ZodEnum<{
                video: "video";
                skill: "skill";
                topic: "topic";
                note: "note";
                drill: "drill";
                mistake: "mistake";
                learning_path: "learning_path";
                collection: "collection";
                tag: "tag";
                creator: "creator";
                source: "source";
            }>;
            title: z.ZodString;
            summary: z.ZodNullable<z.ZodString>;
            visibility: z.ZodEnum<{
                private: "private";
                unlisted: "unlisted";
                public: "public";
            }>;
            createdAt: z.ZodString;
            updatedAt: z.ZodString;
        }, z.core.$strip>>;
        tags: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            nodeType: z.ZodEnum<{
                video: "video";
                skill: "skill";
                topic: "topic";
                note: "note";
                drill: "drill";
                mistake: "mistake";
                learning_path: "learning_path";
                collection: "collection";
                tag: "tag";
                creator: "creator";
                source: "source";
            }>;
            title: z.ZodString;
            summary: z.ZodNullable<z.ZodString>;
            visibility: z.ZodEnum<{
                private: "private";
                unlisted: "unlisted";
                public: "public";
            }>;
            createdAt: z.ZodString;
            updatedAt: z.ZodString;
        }, z.core.$strip>>;
        notes: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            nodeType: z.ZodEnum<{
                video: "video";
                skill: "skill";
                topic: "topic";
                note: "note";
                drill: "drill";
                mistake: "mistake";
                learning_path: "learning_path";
                collection: "collection";
                tag: "tag";
                creator: "creator";
                source: "source";
            }>;
            title: z.ZodString;
            summary: z.ZodNullable<z.ZodString>;
            visibility: z.ZodEnum<{
                private: "private";
                unlisted: "unlisted";
                public: "public";
            }>;
            createdAt: z.ZodString;
            updatedAt: z.ZodString;
        }, z.core.$strip>>;
        drills: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            nodeType: z.ZodEnum<{
                video: "video";
                skill: "skill";
                topic: "topic";
                note: "note";
                drill: "drill";
                mistake: "mistake";
                learning_path: "learning_path";
                collection: "collection";
                tag: "tag";
                creator: "creator";
                source: "source";
            }>;
            title: z.ZodString;
            summary: z.ZodNullable<z.ZodString>;
            visibility: z.ZodEnum<{
                private: "private";
                unlisted: "unlisted";
                public: "public";
            }>;
            createdAt: z.ZodString;
            updatedAt: z.ZodString;
        }, z.core.$strip>>;
        related: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            nodeType: z.ZodEnum<{
                video: "video";
                skill: "skill";
                topic: "topic";
                note: "note";
                drill: "drill";
                mistake: "mistake";
                learning_path: "learning_path";
                collection: "collection";
                tag: "tag";
                creator: "creator";
                source: "source";
            }>;
            title: z.ZodString;
            summary: z.ZodNullable<z.ZodString>;
            visibility: z.ZodEnum<{
                private: "private";
                unlisted: "unlisted";
                public: "public";
            }>;
            createdAt: z.ZodString;
            updatedAt: z.ZodString;
        }, z.core.$strip>>;
        learningPaths: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            nodeType: z.ZodEnum<{
                video: "video";
                skill: "skill";
                topic: "topic";
                note: "note";
                drill: "drill";
                mistake: "mistake";
                learning_path: "learning_path";
                collection: "collection";
                tag: "tag";
                creator: "creator";
                source: "source";
            }>;
            title: z.ZodString;
            summary: z.ZodNullable<z.ZodString>;
            visibility: z.ZodEnum<{
                private: "private";
                unlisted: "unlisted";
                public: "public";
            }>;
            createdAt: z.ZodString;
            updatedAt: z.ZodString;
        }, z.core.$strip>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const VideoListResponseSchema: z.ZodObject<{
    data: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        nodeId: z.ZodString;
        sourceUrl: z.ZodString;
        canonicalUrl: z.ZodNullable<z.ZodString>;
        sourcePlatform: z.ZodEnum<{
            other: "other";
            youtube: "youtube";
            facebook: "facebook";
        }>;
        externalId: z.ZodNullable<z.ZodString>;
        title: z.ZodNullable<z.ZodString>;
        description: z.ZodNullable<z.ZodString>;
        thumbnailUrl: z.ZodNullable<z.ZodString>;
        creatorName: z.ZodNullable<z.ZodString>;
        durationSeconds: z.ZodNullable<z.ZodNumber>;
        progress: z.ZodEnum<{
            saved: "saved";
            watching: "watching";
            watched: "watched";
        }>;
        learningState: z.ZodEnum<{
            none: "none";
            practicing: "practicing";
            revisit: "revisit";
            understood: "understood";
        }>;
        importance: z.ZodNullable<z.ZodNumber>;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
    }, z.core.$strip>>;
    page: z.ZodObject<{
        limit: z.ZodNumber;
        offset: z.ZodNumber;
        total: z.ZodNumber;
    }, z.core.$strip>;
}, z.core.$strip>;
