CREATE TABLE `users` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `display_name` text NOT NULL,
  `email` text NOT NULL,
  `marketing_consent` integer DEFAULT 0 NOT NULL,
  `created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_display_name_unique` ON `users` (`display_name`);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);
--> statement-breakpoint
CREATE TABLE `matches` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `user_id` integer NOT NULL,
  `difficulty` text NOT NULL,
  `outcome` text NOT NULL,
  `player_score` integer NOT NULL,
  `ai_score` integer NOT NULL,
  `duration_ms` integer NOT NULL,
  `played_at` integer DEFAULT (unixepoch()) NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `matches_user_id_idx` ON `matches` (`user_id`);
--> statement-breakpoint
CREATE INDEX `matches_difficulty_idx` ON `matches` (`difficulty`);
--> statement-breakpoint
CREATE INDEX `matches_outcome_idx` ON `matches` (`outcome`);
