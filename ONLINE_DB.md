# 🚀 Team Development Guide - Online Databases

## 📋 Tổng Quan

Hệ thống hiện tại sử dụng:
- **PostgreSQL**: Neon (Cloud) - Cho main data
- **MongoDB**: MongoDB Atlas (Cloud) - Cho analytics
- **Backend**: NestJS - Port 3000

## 🔧 Hướng dẫn Setup Online Database

### Bước 1: Setup Backend
```bash
cd backend
npm install
```

### Bước 2: Cấu hình Environment
Copy vào `.env` trong thư mục `backend/`:

```env
PORT=3000
DATABASE_URL=postgresql://neondb_owner:npg_Kirg6TH2xhtD@ep-shy-sun-a1gihjly-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
MONGODB_URI=mongodb+srv://quocpro12334_db_user:N16obV0JlC2uuy5L@warehouse-mongodb-clust.szotwar.mongodb.net/?retryWrites=true&w=majority&appName=warehouse-mongodb-cluster
MONGO_URL=mongodb+srv://quocpro12334_db_user:N16obV0JlC2uuy5L@warehouse-mongodb-clust.szotwar.mongodb.net/?retryWrites=true&w=majority&appName=warehouse-mongodb-cluster
JWT_ACCESS_SECRET=dev-access-secret
JWT_ACCESS_TTL=15m
JWT_REFRESH_SECRET=dev-refresh-secret
JWT_REFRESH_TTL=7d
CORS_ORIGIN=http://localhost:5173
```

### Bước 3: Chạy Migrations
```bash
npx prisma migrate deploy
```

### Bước 4: Khởi động Backend
```bash
npm run start:dev
```

### Bước 5: Kiểm tra kết nối
- **Backend**: http://localhost:3000
- **API Docs**: http://localhost:3000/api
- **Health Check**: http://localhost:3000/reporting/health

## ⚠️ Lưu ý quan trọng

**KHÔNG chạy `docker-compose up`** vì sẽ khởi động local databases và gây conflict với online databases.

**Chỉ sử dụng:**
- `npm run start:dev` - Chạy trực tiếp với online databases

## 🔍 Database Access

### PostgreSQL (Neon)
- **URL**: https://console.neon.tech
- **Database**: neondb
- **Connection**: Đã cấu hình trong .env

### MongoDB (Atlas)
- **URL**: https://cloud.mongodb.com
- **Cluster**: warehouse-mongodb-clust
- **Database**: warehouse_analytics

## 🛠️ Development Workflow

### 1. Database Schema Changes
```bash
# Khi có thay đổi trong schema, tạo migration mới
npx prisma migrate dev --name [migration-name]

# Apply migrations
npx prisma migrate deploy

# Reset database (nếu cần)
npx prisma migrate reset
```

### 2. MongoDB Collections
```typescript
// Sử dụng MongoDBService trong code
constructor(private mongoService: MongoDBService) {}

// Lấy collection
const collection = this.mongoService.getCollection('collection_name');

// CRUD operations
await collection.insertOne(data);
await collection.find({}).toArray();
await collection.updateOne(filter, update);
await collection.deleteOne(filter);
```

## 🚨 Troubleshooting

### Lỗi Connection
1. **PostgreSQL**: Kiểm tra Neon project không bị pause
2. **MongoDB**: Kiểm tra IP whitelist trong Atlas
3. **Network**: Kiểm tra firewall/proxy

### Lỗi Docker Conflicts
```bash
# Nếu đã chạy docker-compose up (local databases)
docker-compose down

# Kiểm tra port conflicts
netstat -an | findstr :3000
netstat -an | findstr :5432
netstat -an | findstr :27017

# Kill processes nếu cần
taskkill /f /im node.exe
```

### Lỗi Migrations
```bash
# Reset và chạy lại
npx prisma migrate reset
npx prisma migrate deploy
```

### Lỗi Environment
- Đảm bảo file `.env` có đúng format
- Không có spaces thừa trong connection strings
- Kiểm tra quotes và special characters

## 📊 Monitoring

### Health Checks
- **Backend**: http://localhost:3000
- **PostgreSQL**: `GET /reporting/health`
- **MongoDB**: `GET /reporting/health`

### Logs
```bash
# Xem logs
npm run start:dev

# Production logs
docker logs [container-name]
```

## 🔐 Security Notes

- **JWT Secrets**: Đổi trong production
- **Database Passwords**: Không commit vào git
- **CORS**: Cấu hình đúng origins
- **Rate Limiting**: Implement nếu cần



