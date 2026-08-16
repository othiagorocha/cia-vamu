import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

import { user } from "@/db/auth-schema";

export const eventTypeEnum = pgEnum("event_type", [
  "teatro",
  "viagem",
  "evangelismo",
  "outro",
]);

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

export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),
  type: eventTypeEnum("type").notNull().default("outro"),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  location: text("location"),
  imageUrl: text("image_url"),
  storagePath: text("storage_path"),
  published: boolean("published").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

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
