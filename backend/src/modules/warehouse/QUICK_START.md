# Warehouse Module - Quick Start Guide

## 🚀 Setup trong 3 phút

### 1. Seed Database (30 giây)
```bash
cd backend
npx ts-node prisma/seeds/warehouse-seed.ts
```

Bạn sẽ có:
- ✅ 4 warehouses
- ✅ 159 locations
- ✅ Sample data với different types

### 2. Test API (2 phút)

#### Get JWT Token
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

Lưu `accessToken` vào biến `TOKEN`.

#### List all warehouses
```bash
curl http://localhost:3000/warehouses \
  -H "Authorization: Bearer $TOKEN"
```

#### Get warehouse by code
```bash
curl http://localhost:3000/warehouses/code/WH-MAIN-HCM \
  -H "Authorization: Bearer $TOKEN"
```

#### List locations of a warehouse
```bash
# First get warehouse ID from previous request
curl http://localhost:3000/locations/warehouse/WAREHOUSE_ID \
  -H "Authorization: Bearer $TOKEN"
```

#### Get location statistics
```bash
curl http://localhost:3000/locations/LOCATION_ID/stats \
  -H "Authorization: Bearer $TOKEN"
```

## 📝 Common Tasks

### Create new warehouse
```bash
curl -X POST http://localhost:3000/warehouses \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "WH-NEW-01",
    "name": "New Warehouse",
    "address": "123 Street",
    "metadata": {"type": "General"}
  }'
```

### Create location in warehouse
```bash
curl -X POST http://localhost:3000/locations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "warehouseId": "YOUR_WAREHOUSE_ID",
    "code": "Z-99-99",
    "name": "Test Location",
    "capacity": 50,
    "type": "shelf"
  }'
```

### Find available locations
```bash
curl "http://localhost:3000/locations/warehouse/WAREHOUSE_ID/available?minCapacity=30" \
  -H "Authorization: Bearer $TOKEN"
```

### Get warehouse statistics
```bash
curl http://localhost:3000/warehouses/WAREHOUSE_ID/stats \
  -H "Authorization: Bearer $TOKEN"
```

## 🎯 Sample Workflow

### Setup new warehouse with locations
```bash
# 1. Create warehouse
WAREHOUSE_RESPONSE=$(curl -s -X POST http://localhost:3000/warehouses \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"code":"WH-TEST","name":"Test Warehouse"}')

# Extract warehouse ID (using jq)
WAREHOUSE_ID=$(echo $WAREHOUSE_RESPONSE | jq -r '.warehouse.id')

# 2. Create locations
for aisle in A B C; do
  for rack in 1 2 3; do
    curl -X POST http://localhost:3000/locations \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "{
        \"warehouseId\": \"$WAREHOUSE_ID\",
        \"code\": \"${aisle}-0${rack}-01\",
        \"name\": \"Aisle ${aisle}, Rack ${rack}\",
        \"capacity\": 50,
        \"type\": \"shelf\"
      }"
  done
done
```

## 🔍 Useful Queries

### Search warehouses
```bash
curl "http://localhost:3000/warehouses?search=Cold" \
  -H "Authorization: Bearer $TOKEN"
```

### Filter locations by type
```bash
curl "http://localhost:3000/locations?type=shelf&page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

### Get all locations in warehouse
```bash
curl "http://localhost:3000/locations?warehouseId=WAREHOUSE_ID" \
  -H "Authorization: Bearer $TOKEN"
```

## 📊 Swagger UI

Open: http://localhost:3000/api

Navigate to:
- `warehouses` section
- `locations` section

Try out endpoints directly!

## ✅ Verify Setup

Check if everything works:
```bash
# 1. Count warehouses
curl -s http://localhost:3000/warehouses \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.total'

# Should return 4 (or more if you created additional)

# 2. Count locations
curl -s "http://localhost:3000/locations?limit=1" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.total'

# Should return 159+ locations
```

## 🆘 Troubleshooting

### Issue: Warehouse code already exists
**Solution**: Use different code or check existing warehouses

### Issue: Cannot create location
**Solution**: Verify warehouse ID exists

### Issue: Cannot delete warehouse
**Solution**: Delete all locations first

### Issue: Location code conflict
**Solution**: Location code must be unique within warehouse

## 💡 Pro Tips

### 1. Use meaningful codes
```
WH-MAIN-HCM  ✅ Good
WH-001       ❌ Not descriptive
```

### 2. Organize location codes
```
A-01-01      ✅ Aisle-Rack-Level
LOC-1        ❌ No structure
```

### 3. Set realistic capacity
- Consider physical constraints
- Plan for future growth
- Monitor utilization regularly

### 4. Use metadata wisely
```json
{
  "manager": "John Doe",
  "phone": "+84-123-456",
  "certifications": ["ISO 9001"],
  "operatingHours": "24/7"
}
```

### 5. Location properties
```json
{
  "temperature": "-18°C",
  "hazardous": false,
  "maxWeight": "1000kg",
  "equipmentNeeded": "forklift"
}
```

## 📖 Next Steps

1. ✅ Complete this Quick Start
2. 📖 Read full `README.md`
3. 🔌 Integrate with Inventory Module
4. 📊 Test with real data
5. 🚀 Deploy to staging

---

**Ready to manage warehouses? Let's go! 🏭**
