# Cơ Thủ Game Server (V2)

Cơ Thủ Game Server là một dự án máy chủ game dựa trên framework Pomelo, được thiết kế để phục vụ cho game cờ tướng (Chinese chess). Dự án sử dụng kiến trúc phân tán, cho phép mở rộng quy mô dễ dàng và xử lý nhiều người chơi đồng thời.

## Kiến trúc hệ thống

Dự án được xây dựng dựa trên các thành phần chính sau:

- **Pomelo Framework**: Framework Node.js cho game server phân tán
- **MongoDB**: Lưu trữ dữ liệu game
- **MySQL**: Lưu trữ dữ liệu người dùng và giao dịch
- **Redis**: Cache và quản lý phiên, kênh truyền thông, trạng thái
- **RabbitMQ**: Xử lý hàng đợi thanh toán

### Các server component chính:

1. **Connector Server**: Xử lý kết nối từ client
2. **Gate Server**: Điều hướng người chơi đến connector server phù hợp
3. **Auth Server**: Xác thực người dùng
4. **Game Server**: Xử lý logic game cờ tướng
5. **Chat Server**: Xử lý tin nhắn chat
6. **Tournament Server**: Quản lý giải đấu
7. **District Server**: Quản lý khu vực chơi game
8. **Manager Server**: Quản lý và giám sát hệ thống
9. **Service Server**: Cung cấp các dịch vụ trung tâm
10. **Event Server**: Xử lý các sự kiện game
11. **Worker Server**: Xử lý các tác vụ nền
12. **Home Server**: Quản lý màn hình chính

## Yêu cầu hệ thống

- Node.js (phiên bản tương thích với Pomelo)
- MongoDB
- MySQL
- Redis
- RabbitMQ (cho hàng đợi thanh toán)

## Cài đặt

1. Clone repository:
   ```bash
   git clone git@git.vgame.us:root/cothu-v2.git
   cd cothu-v2
   ```

2. Cài đặt dependencies:
   ```bash
   cd game-server
   npm install
   ```

3. Cấu hình:
   - Cập nhật các file cấu hình trong thư mục `game-server/config`
   - Đảm bảo các dịch vụ ngoài (MongoDB, MySQL, Redis, RabbitMQ) đã được cài đặt và cấu hình đúng

## Khởi chạy

### Môi trường phát triển
```bash
cd game-server
node app.js
```

### Môi trường sản xuất
Sử dụng PM2 để quản lý các tiến trình:
```bash
cd game-server
pm2 start ecosystem.json --env production
```

## Cấu trúc thư mục

```
game-server/
├── app/                    # Mã nguồn chính
│   ├── consts/             # Các hằng số
│   ├── dao/                # Data Access Objects
│   │   ├── mongo/          # MongoDB DAO
│   │   ├── mongoSchema/    # MongoDB schemas
│   │   └── mysqlModels/    # MySQL models
│   ├── domain/             # Logic domain
│   ├── events/             # Event handlers
│   ├── http/               # HTTP endpoints
│   ├── modules/            # Các module chức năng
│   ├── servers/            # Định nghĩa server
│   │   ├── auth/           # Auth server
│   │   ├── chat/           # Chat server
│   │   ├── connector/      # Connector server
│   │   ├── district/       # District server
│   │   ├── event/          # Event server
│   │   ├── game/           # Game server
│   │   ├── gate/           # Gate server
│   │   ├── home/           # Home server
│   │   ├── manager/        # Manager server
│   │   ├── service/        # Service server
│   │   ├── tournament/     # Tournament server
│   │   └── worker/         # Worker server
│   ├── services/           # Các dịch vụ
│   └── util/               # Tiện ích
├── config/                 # Cấu hình
│   ├── csv/                # Dữ liệu CSV
│   ├── adminServer.json    # Cấu hình admin server
│   ├── emitterConfig.json  # Cấu hình emitter
│   ├── eventConfig.json    # Cấu hình sự kiện
│   ├── externalService.json# Cấu hình dịch vụ ngoài
│   ├── game.json           # Cấu hình game
│   ├── mongo.json          # Cấu hình MongoDB
│   ├── mysqlClient.json    # Cấu hình MySQL
│   └── redis.json          # Cấu hình Redis
└── scripts/                # Scripts tiện ích
```

## Dependencies chính

- **pomelo**: Framework chính cho game server
- **mongoose**: Kết nối MongoDB
- **sequelize**: ORM cho MySQL
- **redis**: Kết nối Redis
- **pomelo-globalchannel-plugin**: Plugin quản lý kênh thông tin toàn cục
- **pomelo-status-plugin**: Plugin quản lý trạng thái
- **pomelo-scheduler**: Plugin quản lý lịch trình
- **pomelo-event-plugin**: Plugin quản lý sự kiện
- **luat-co-thu**: Module quy tắc cờ tướng

## Contributing

Vui lòng liên hệ team phát triển để được hướng dẫn thêm về quy trình đóng góp code.

## Triển khai

Dự án có thể được triển khai trên các môi trường:
- **Core**: 172.16.20.40
- **Production**: 172.16.10.28
- **Development**: 10.10.11.154

Sử dụng PM2 để quản lý tiến trình và triển khai theo cấu hình trong file `ecosystem.json`. 