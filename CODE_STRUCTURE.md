# Cấu trúc mã nguồn Cơ Thủ Game Server

Tài liệu này mô tả chi tiết cấu trúc mã nguồn của dự án Cơ Thủ Game Server, giúp các nhà phát triển hiểu rõ về tổ chức và kiến trúc của hệ thống.

## Tổng quan kiến trúc

Cơ Thủ Game Server là một ứng dụng game server phân tán dựa trên framework Pomelo, mô hình phát triển theo kiến trúc hướng dịch vụ với nhiều server thành phần khác nhau xử lý các chức năng riêng biệt.

### Quy trình làm việc cơ bản

1. Client kết nối đến Gate Server
2. Gate Server điều hướng client đến Connector Server phù hợp
3. Connector Server xác thực người dùng qua Auth Server
4. Sau khi xác thực, client có thể tương tác với các server khác (Game, Chat, Tournament...)
5. Dữ liệu được lưu trữ trong MySQL và MongoDB, với Redis làm cache

## Cấu trúc thư mục dự án

```
game-server/
├── app/                    # Mã nguồn chính
│   ├── consts/             # Các hằng số và enum
│   ├── dao/                # Data Access Objects
│   ├── domain/             # Logic domain
│   ├── events/             # Event handlers
│   ├── http/               # HTTP endpoints
│   ├── modules/            # Các module chức năng
│   ├── servers/            # Định nghĩa server
│   ├── services/           # Các dịch vụ
│   └── util/               # Tiện ích
├── config/                 # Cấu hình
├── logs/                   # Log files
└── scripts/                # Scripts tiện ích
```

## Chi tiết thành phần

### App Directory

#### 1. consts/
Chứa các hằng số và enum sử dụng trong toàn bộ ứng dụng:
- `consts.js`: Định nghĩa các hằng số chung
- `errorCodes.js`: Mã lỗi
- `gameParams.js`: Tham số cấu hình game
- Các file enum khác

#### 2. dao/ (Data Access Objects)
Chứa logic truy cập dữ liệu:
- `mongo/`: Các đối tượng truy cập MongoDB
- `mongoSchema/`: Schema MongoDB
- `mysqlModels/`: Mô hình Sequelize cho MySQL

#### 3. domain/
Chứa các đối tượng domain và logic nghiệp vụ:
- `district/`: Logic khu vực chơi
- `game/`: Logic game cờ tướng
  - `gameLogic.js`: Xử lý luật chơi
  - `moveValidator.js`: Kiểm tra nước đi
  - `gameManager.js`: Quản lý phiên game
- `tournament/`: Logic giải đấu
  - `tournamentManager.js`: Quản lý giải đấu
  - `matchmaking.js`: Ghép cặp người chơi

#### 4. events/
Xử lý các sự kiện trong hệ thống:
- `playerEvents.js`: Sự kiện người chơi
- `gameEvents.js`: Sự kiện game
- `systemEvents.js`: Sự kiện hệ thống

#### 5. http/
API HTTP endpoints:
- `routes/`: Định nghĩa routes
- `controllers/`: Xử lý request
- `middlewares/`: Middleware HTTP

#### 6. modules/
Các module quản trị và chức năng:
- `onlineUser.js`: Quản lý người dùng online
- `maintenance.js`: Bảo trì hệ thống
- `kickUser.js`: Đẩy người dùng ra khỏi hệ thống
- `tournament.js`: Module quản lý giải đấu
- `setBoard.js`: Cấu hình bàn chơi

#### 7. servers/
Mã nguồn cho từng loại server:
- `auth/`: Authentication server
- `chat/`: Chat server
- `connector/`: Connector server
- `district/`: District server
- `event/`: Event server
- `game/`: Game server
- `gate/`: Gate server
- `home/`: Home server
- `manager/`: Manager server
- `service/`: Service server
- `tournament/`: Tournament server
- `worker/`: Worker server

Mỗi server có cấu trúc:
- `handler/`: Xử lý request
- `remote/`: RPC services
- `filter/`: Filter xử lý request/response

#### 8. services/
Dịch vụ dùng chung:
- `accountService.js`: Dịch vụ tài khoản
- `paymentService.js`: Dịch vụ thanh toán
- `notificationService.js`: Dịch vụ thông báo
- `statisticService.js`: Dịch vụ thống kê

#### 9. util/
Các tiện ích:
- `utils.js`: Hàm tiện ích chung
- `routeUtil.js`: Tiện ích định tuyến
- `validator.js`: Kiểm tra dữ liệu

### Config Directory

- `adminServer.json`: Cấu hình admin server
- `emitterConfig.json`: Cấu hình emitter sự kiện
- `eventConfig.json`: Cấu hình sự kiện
- `externalService.json`: Cấu hình dịch vụ ngoài
- `game.json`: Cấu hình game
- `mongo.json`: Cấu hình MongoDB
- `mysqlClient.json`: Cấu hình MySQL
- `redis.json`: Cấu hình Redis
- `csv/`: Dữ liệu cấu hình dạng CSV

## Luồng xử lý chính

### 1. Đăng nhập và xác thực

```
Client -> Gate Server -> Connector Server -> Auth Server -> Account Service
```

1. Client gửi request đăng nhập đến Gate Server
2. Gate Server chuyển hướng đến Connector Server phù hợp
3. Connector Server gửi thông tin đăng nhập đến Auth Server
4. Auth Server kiểm tra thông tin thông qua Account Service
5. Kết quả xác thực được gửi lại cho Client

### 2. Tham gia game

```
Client -> Connector Server -> District Server -> Game Server
```

1. Client gửi request tham gia phòng chơi
2. Connector nhận và chuyển request đến District Server
3. District Server tìm/tạo phòng chơi phù hợp
4. Game Server khởi tạo game session
5. Thông tin phòng và game được gửi lại cho Client

### 3. Di chuyển trong game

```
Client -> Connector Server -> Game Server -> Event Server
```

1. Client gửi thông tin nước đi
2. Connector Server chuyển thông tin đến Game Server
3. Game Server xác thực nước đi và cập nhật trạng thái
4. Kết quả được gửi về cho tất cả người chơi trong phòng
5. Event Server ghi nhận các sự kiện (nếu có)

## Plugins hệ thống

1. **pomelo-globalchannel-plugin**: Quản lý kênh thông tin toàn cục
2. **pomelo-status-plugin**: Quản lý trạng thái người dùng
3. **pomelo-event-plugin**: Xử lý sự kiện
4. **pomelo-scheduler**: Lập lịch tác vụ
5. **pomelo-ccu-plugin**: Đếm người dùng đồng thời
6. **pomelo-board-plugin**: Quản lý bảng xếp hạng
7. **pomelo-waiting-plugin**: Quản lý hàng đợi chờ
8. **pomelo-autoRestart-plugin**: Tự động khởi động lại
9. **pomelo-geoip-plugin**: Xác định vị trí địa lý
10. **pomelo-http-plugin**: REST API
11. **pomelo-account-plugin**: Quản lý tài khoản
12. **pomelo-notifysms-plugin**: Thông báo SMS

## Lưu ý phát triển

1. **Các bước khi thêm một chức năng mới**:
   - Thêm hằng số trong thư mục `consts/`
   - Cập nhật model trong `dao/`
   - Thêm logic xử lý trong `domain/`
   - Thêm handler trong server tương ứng (`servers/xxx/handler/`)
   - Cập nhật API nếu cần thiết

2. **Quy ước đặt tên**:
   - Tên file: camelCase
   - Tên class: PascalCase
   - Tên hàm: camelCase
   - Hằng số: UPPER_SNAKE_CASE

3. **Xử lý lỗi**:
   - Sử dụng Promise cho xử lý bất đồng bộ
   - Xác định rõ mã lỗi trong `consts/errorCodes.js`
   - Log lỗi với thông tin đầy đủ

4. **Performance**:
   - Sử dụng Redis cache cho dữ liệu truy cập thường xuyên
   - Sử dụng MongoDB cho dữ liệu game, MySQL cho dữ liệu người dùng
   - Tránh blocking I/O trong main thread

## Quy trình deploy và scale

1. **Triển khai phân tán**:
   - Mỗi server component có thể chạy trên nhiều instance
   - Cấu hình trong file `servers.json`

2. **Mở rộng**:
   - Thêm server instance mới trong cấu hình
   - Cập nhật PM2 ecosystem file
   - Triển khai với PM2

3. **Monitoring**:
   - PM2 cho giám sát tiến trình
   - Pomelo admin console cho giám sát game 