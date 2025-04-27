# Makefile cho dự án Cơ Thủ Game Server

# Biến môi trường
ENV_FILE := .env
DOCKER_COMPOSE := docker-compose
DOCKER_COMPOSE_PROD := docker-compose -f docker-compose.prod.yml

# Mặc định
.PHONY: help
help:
	@echo "Cơ Thủ Game Server - Docker Helper"
	@echo ""
	@echo "Usage:"
	@echo "  make <command>"
	@echo ""
	@echo "Commands:"
	@echo "  setup            Tạo các thư mục cần thiết và file .env"
	@echo "  dev              Khởi động môi trường phát triển"
	@echo "  prod             Khởi động môi trường sản xuất"
	@echo "  stop             Dừng các containers phát triển"
	@echo "  stop-prod        Dừng các containers sản xuất"
	@echo "  restart          Khởi động lại các containers phát triển"
	@echo "  restart-prod     Khởi động lại các containers sản xuất"
	@echo "  logs [service]   Xem logs (truyền tên service để xem logs cụ thể)"
	@echo "  logs-prod        Xem logs môi trường sản xuất"
	@echo "  build            Build lại các images"
	@echo "  build-prod       Build lại các images sản xuất"
	@echo "  backup           Sao lưu cơ sở dữ liệu"
	@echo "  clean            Xóa dữ liệu không sử dụng"
	@echo "  shell-server     Mở shell vào container game-server"
	@echo "  shell-db         Mở shell vào container MySQL"
	@echo "  shell-mongo      Mở shell vào container MongoDB"
	@echo "  generate-ssl     Tạo self-signed SSL certificate"

# Thiết lập ban đầu
.PHONY: setup
setup:
	@mkdir -p database logs nginx/conf.d nginx/ssl redis static backup/mongo backup/mysql
	@if [ ! -f $(ENV_FILE) ]; then cp .env.example $(ENV_FILE); fi
	@echo "Đã thiết lập xong các thư mục cần thiết và tạo file $(ENV_FILE)"

# Môi trường phát triển
.PHONY: dev
dev:
	$(DOCKER_COMPOSE) up -d

.PHONY: stop
stop:
	$(DOCKER_COMPOSE) down

.PHONY: restart
restart:
	$(DOCKER_COMPOSE) restart

.PHONY: logs
logs:
	@if [ -z "$(service)" ]; then \
		$(DOCKER_COMPOSE) logs -f; \
	else \
		$(DOCKER_COMPOSE) logs -f $(service); \
	fi

.PHONY: build
build:
	$(DOCKER_COMPOSE) build

# Môi trường sản xuất
.PHONY: prod
prod:
	$(DOCKER_COMPOSE_PROD) up -d

.PHONY: stop-prod
stop-prod:
	$(DOCKER_COMPOSE_PROD) down

.PHONY: restart-prod
restart-prod:
	$(DOCKER_COMPOSE_PROD) restart

.PHONY: logs-prod
logs-prod:
	@if [ -z "$(service)" ]; then \
		$(DOCKER_COMPOSE_PROD) logs -f; \
	else \
		$(DOCKER_COMPOSE_PROD) logs -f $(service); \
	fi

.PHONY: build-prod
build-prod:
	$(DOCKER_COMPOSE_PROD) build

# Bảo trì
.PHONY: backup
backup:
	@mkdir -p backup/mongo backup/mysql
	@echo "Đang sao lưu MongoDB..."
	@docker exec -it cothu-mongo mongodump --db cothu_production --out /data/backup
	@docker cp cothu-mongo:/data/backup ./backup/mongo
	@echo "Đang sao lưu MySQL..."
	@docker exec -it cothu-mysql mysqldump -u root -proot cothu_production > ./backup/mysql/cothu_production.sql
	@echo "Sao lưu hoàn tất"

.PHONY: clean
clean:
	@echo "Đang xóa dữ liệu không sử dụng..."
	@docker system prune -a
	@echo "Đã xong"

# Truy cập shell container
.PHONY: shell-server
shell-server:
	docker exec -it cothu-game-server bash

.PHONY: shell-db
shell-db:
	docker exec -it cothu-mysql mysql -u root -proot

.PHONY: shell-mongo
shell-mongo:
	docker exec -it cothu-mongo mongo

# Tạo SSL certificate
.PHONY: generate-ssl
generate-ssl:
	@mkdir -p nginx/ssl
	@openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout nginx/ssl/server.key -out nginx/ssl/server.crt
	@echo "Đã tạo SSL certificate" 