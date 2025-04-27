-- Cấu hình charset
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- Tạo bảng users (ví dụ)
CREATE TABLE IF NOT EXISTS `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(64) NOT NULL,
  `password` varchar(255) NOT NULL,
  `email` varchar(128) DEFAULT NULL,
  `fullname` varchar(128) DEFAULT NULL,
  `balance` decimal(15,2) NOT NULL DEFAULT '0.00',
  `avatar` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tạo bảng game_records (ví dụ)
CREATE TABLE IF NOT EXISTS `game_records` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `game_id` varchar(64) NOT NULL,
  `player1_id` int(11) NOT NULL,
  `player2_id` int(11) NOT NULL,
  `winner_id` int(11) DEFAULT NULL,
  `bet_amount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `status` tinyint(4) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `game_id` (`game_id`),
  KEY `player1_id` (`player1_id`),
  KEY `player2_id` (`player2_id`),
  KEY `winner_id` (`winner_id`),
  CONSTRAINT `game_records_ibfk_1` FOREIGN KEY (`player1_id`) REFERENCES `users` (`id`),
  CONSTRAINT `game_records_ibfk_2` FOREIGN KEY (`player2_id`) REFERENCES `users` (`id`),
  CONSTRAINT `game_records_ibfk_3` FOREIGN KEY (`winner_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tạo bảng transactions (ví dụ)
CREATE TABLE IF NOT EXISTS `transactions` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `type` varchar(20) NOT NULL,
  `status` tinyint(4) NOT NULL DEFAULT '0',
  `reference_id` varchar(128) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `transactions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Thêm dữ liệu mẫu nếu cần
INSERT IGNORE INTO `users` (`username`, `password`, `email`, `fullname`, `balance`)
VALUES
('admin', '$2b$10$oDz/UjA5dXoqrSEFOVUwK.9BOZIF9v0UtX59N/hxN9f9t.7r/f9h.', 'admin@example.com', 'Administrator', 1000.00),
('player1', '$2b$10$oDz/UjA5dXoqrSEFOVUwK.9BOZIF9v0UtX59N/hxN9f9t.7r/f9h.', 'player1@example.com', 'Player One', 500.00),
('player2', '$2b$10$oDz/UjA5dXoqrSEFOVUwK.9BOZIF9v0UtX59N/hxN9f9t.7r/f9h.', 'player2@example.com', 'Player Two', 500.00);

SET FOREIGN_KEY_CHECKS = 1; 