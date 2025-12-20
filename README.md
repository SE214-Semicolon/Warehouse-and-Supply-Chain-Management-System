IN DEVELOPING...
🚀 Backend Setup – Warehouse and Supply Chain Management System

### 1. Yêu cầu môi trường
- Docker Desktop (>= 4.x)
- Node.js (>= 20 LTS) + npm
- Git
- Editor khuyến nghị: VS Code + plugin Prisma và NestJS


### 2. Clone repo
```bash
git clone <repo_url>
cd Warehouse-and-Supply-Chain-Management-System
```


### 3. Chuẩn bị biến môi trường
Tạo file `.env` trong thư mục `backend` dựa trên mẫu:
```bash
cp backend/.env.example backend/.env
```

**Lưu ý quan trọng:**
- File `.env.example` đã chứa đầy đủ các biến cần thiết (JWT, Database)
- Không cần chỉnh sửa gì thêm cho development
- Chỉ cần copy và chạy `docker compose up --build`


### 4. Khởi động dịch vụ
```bash
docker pull postgres:16
docker pull dpage/pgadmin4
docker pull mongo:7
docker pull mongo-express:1.0.2
docker compose build
docker compose up -d
```

Các service chính:
- Postgres: localhost:5432
- MongoDB: localhost:27017
- Backend (NestJS): http://localhost:3000
- Swagger API Docs: http://localhost:3000/api
- Mongo Express: http://localhost:8081 
    -> Login: (Name: admin / Password: pass)
- pgAdmin: http://localhost:5050  
    -> Login: (Email: admin@admin.com / Password: admin)
    -> Register Server: Rigth click on Server > Register > Server... 
        > Tag General: Name: warehouse_db 
        > Tag Connection: Hostname/address: db, Username: warehouse_user, Password: warehouse_password
        > Click Save


### 5. Làm việc với Prisma
(In vsc terminal)
```bash
# Bước 1: Generate Prisma Client (khi có model mới)
docker compose exec -T backend sh -lc "npx prisma generate"

# Bước 2: Apply migration (tạo bảng mới trong DB)
docker compose exec -T backend sh -lc "npx prisma migrate deploy"

# Bước 3: Restart backend để load code mới
docker compose restart backend
```

**Lưu ý về Seed Data:**
- Seed data tạo sẵn 7 users test, 50 products, 20 purchase orders, 50 sales orders, v.v.
- Xem chi tiết tại: `backend/SEED_DATA_QA_GUIDE.md`
- Tài khoản test: `admin` / `admin123`, `manager` / `manager123`, `staff` / `staff123`, ...


### 6. Cấu trúc dự án
```
backend/
 ┣ src/
 ┃ ┣ modules/         # Các module nghiệp vụ
 ┃ ┣ database/        # Prisma service, schemas
 ┃ ┣ common/          # DTO base, guard, interceptor
 ┃ ┗ main.ts          # Entrypoint app
 ┣ prisma/
 ┃ ┣ schema.prisma    # Định nghĩa schema
 ┃ ┗ migrations/      # Lưu migration history
 ┣ .env               # Config env (không commit)
 ┗ package.json
```


### 7. Dev workflow
- Phát triển module → code trong `src/modules/...`
- Nếu thay đổi schema:
```bash
npx prisma migrate dev
```
- Swagger API Docs: http://localhost:3000/api


### 8. Test
```bash
npm run test
npm run test:e2e
```


### 9. Troubleshooting
-> Check logs in backend container (in docker desktop)
-> Contact backend team


