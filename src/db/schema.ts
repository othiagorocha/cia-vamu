import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

import { user } from "@/db/auth-schema";

export const socialPlatformEnum = pgEnum("social_platform", [
  "instagram",
  "youtube",
  "facebook",
  "whatsapp",
  "spotify",
  "other",
]);

export const albums = pgTable("albums", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),
  coverImageUrl: text("cover_image_url"),
  parentId: uuid("parent_id").references((): AnyPgColumn => albums.id, {
    onDelete: "set null",
  }),
  published: boolean("published").notNull().default(false),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const photos = pgTable("photos", {
  id: uuid("id").primaryKey().defaultRandom(),
  albumId: uuid("album_id")
    .notNull()
    .references(() => albums.id, { onDelete: "cascade" }),
  imageUrl: text("image_url").notNull(),
  storagePath: text("storage_path"),
  title: text("title"),
  caption: text("caption"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const eventTypes = pgTable("event_types", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  label: text("label").notNull(),
  emoji: text("emoji").notNull().default("🏷️"),
  defaultColor: text("default_color").notNull(),
  isSystem: boolean("is_system").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    description: text("description"),
    typeId: uuid("type_id")
      .notNull()
      .references(() => eventTypes.id, { onDelete: "restrict" }),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    location: text("location"),
    locationMapsQuery: text("location_maps_query"),
    imageUrl: text("image_url"),
    storagePath: text("storage_path"),
    published: boolean("published").notNull().default(false),
    color: text("color"),
    important: boolean("important").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("events_type_id_idx").on(table.typeId)],
);

export const prayerRequests = pgTable("prayer_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  body: text("body").notNull(),
  isAnonymous: boolean("is_anonymous").notNull().default(false),
  name: text("name"),
  email: text("email"),
  authorUserId: text("author_user_id").references(() => user.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const prayerReactions = pgTable(
  "prayer_reactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => prayerRequests.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("prayer_reactions_request_user").on(table.requestId, table.userId),
    index("prayer_reactions_request_id_idx").on(table.requestId),
  ],
);

export const contactMessages = pgTable("contact_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  readAt: timestamp("read_at", { withTimezone: true }),
});

export const socialLinks = pgTable("social_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  platform: socialPlatformEnum("platform").notNull(),
  label: text("label").notNull(),
  url: text("url").notNull(),
  iconName: text("icon_name"),
  sortOrder: integer("sort_order").notNull().default(0),
  published: boolean("published").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const memberProfiles = pgTable("member_profiles", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  role: text("role"),
  photoUrl: text("photo_url"),
  storagePath: text("storage_path"),
  testimony: text("testimony"),
  isMember: boolean("is_member").notNull().default(false),
  showOnAbout: boolean("show_on_about").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const photoLikes = pgTable(
  "photo_likes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    photoId: uuid("photo_id")
      .notNull()
      .references(() => photos.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [unique("photo_likes_photo_user").on(table.photoId, table.userId)],
);

export const photoComments = pgTable("photo_comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  photoId: uuid("photo_id")
    .notNull()
    .references(() => photos.id, { onDelete: "cascade" }),
  authorId: text("author_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const eventTypesRelations = relations(eventTypes, ({ many }) => ({
  events: many(events),
}));

export const eventsRelations = relations(events, ({ one }) => ({
  type: one(eventTypes, {
    fields: [events.typeId],
    references: [eventTypes.id],
  }),
}));

export const albumsRelations = relations(albums, ({ many, one }) => ({
  photos: many(photos),
  parent: one(albums, {
    fields: [albums.parentId],
    references: [albums.id],
    relationName: "album_parent",
  }),
  children: many(albums, { relationName: "album_parent" }),
}));

export const photosRelations = relations(photos, ({ one, many }) => ({
  album: one(albums, {
    fields: [photos.albumId],
    references: [albums.id],
  }),
  likes: many(photoLikes),
  comments: many(photoComments),
}));

export const photoLikesRelations = relations(photoLikes, ({ one }) => ({
  photo: one(photos, {
    fields: [photoLikes.photoId],
    references: [photos.id],
  }),
}));

export const photoCommentsRelations = relations(photoComments, ({ one }) => ({
  photo: one(photos, {
    fields: [photoComments.photoId],
    references: [photos.id],
  }),
}));

export const memberProfilesRelations = relations(memberProfiles, ({ one }) => ({
  user: one(user, {
    fields: [memberProfiles.userId],
    references: [user.id],
  }),
}));

export const prayerRequestsRelations = relations(prayerRequests, ({ one, many }) => ({
  author: one(user, {
    fields: [prayerRequests.authorUserId],
    references: [user.id],
  }),
  reactions: many(prayerReactions),
}));

export const prayerReactionsRelations = relations(prayerReactions, ({ one }) => ({
  request: one(prayerRequests, {
    fields: [prayerReactions.requestId],
    references: [prayerRequests.id],
  }),
}));

export const invites = pgTable("invites", {
  id: uuid("id").primaryKey().defaultRandom(),
  tokenHash: text("token_hash").notNull().unique(),
  tokenCipher: text("token_cipher"),
  capabilities: text("capabilities").array().notNull(),
  createdById: text("created_by_id").references(() => user.id, {
    onDelete: "set null",
  }),
  maxUses: integer("max_uses").default(1),
  usedCount: integer("used_count").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  usedAt: timestamp("used_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const inviteUses = pgTable(
  "invite_uses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    inviteId: uuid("invite_id")
      .notNull()
      .references(() => invites.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("invite_uses_invite_id_idx").on(table.inviteId)],
);

export const invitesRelations = relations(invites, ({ many }) => ({
  uses: many(inviteUses),
}));

export const inviteUsesRelations = relations(inviteUses, ({ one }) => ({
  invite: one(invites, {
    fields: [inviteUses.inviteId],
    references: [invites.id],
  }),
}));

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorUserId: text("actor_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    actorName: text("actor_name").notNull(),
    actorEmail: text("actor_email").notNull(),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    metadata: jsonb("metadata").$type<
      Record<
        string,
        | string
        | number
        | boolean
        | null
        | string[]
        | Array<{ field: string; from: string | boolean | null; to: string | boolean | null }>
      >
    >(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("audit_logs_created_at_idx").on(table.createdAt),
    index("audit_logs_actor_user_id_idx").on(table.actorUserId),
    index("audit_logs_entity_idx").on(table.entityType, table.entityId),
    index("audit_logs_action_idx").on(table.action),
  ],
);

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  actor: one(user, {
    fields: [auditLogs.actorUserId],
    references: [user.id],
  }),
}));

export const documentFolders = pgTable(
  "document_folders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    parentId: uuid("parent_id").references((): AnyPgColumn => documentFolders.id, {
      onDelete: "cascade",
    }),
    createdById: text("created_by_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("document_folders_parent_id_idx").on(table.parentId)],
);

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    folderId: uuid("folder_id").references(() => documentFolders.id, {
      onDelete: "cascade",
    }),
    name: text("name").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    storagePath: text("storage_path").notNull(),
    createdById: text("created_by_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("documents_folder_id_idx").on(table.folderId)],
);

export const documentFoldersRelations = relations(documentFolders, ({ one, many }) => ({
  parent: one(documentFolders, {
    fields: [documentFolders.parentId],
    references: [documentFolders.id],
    relationName: "document_folder_parent",
  }),
  children: many(documentFolders, { relationName: "document_folder_parent" }),
  files: many(documents),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  folder: one(documentFolders, {
    fields: [documents.folderId],
    references: [documentFolders.id],
  }),
}));
