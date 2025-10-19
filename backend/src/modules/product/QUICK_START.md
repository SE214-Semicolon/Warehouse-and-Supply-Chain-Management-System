# Product Module - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Prerequisites
- Node.js 18+ installed
- PostgreSQL running
- Backend server setup complete

### Step 1: Database Setup (30 seconds)

```bash
cd backend

# Run migrations
npx prisma migrate dev

# Seed sample data (optional but recommended)
npx ts-node prisma/seeds/product-seed.ts
```

### Step 2: Start Server (10 seconds)

```bash
npm run start:dev
```

Server should start at `http://localhost:3000`

### Step 3: Get Authentication Token (1 minute)

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

Save the `accessToken` from response.

### Step 4: Test API (2 minutes)

#### Get all products
```bash
curl http://localhost:3000/products \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

#### Create a category
```bash
curl -X POST http://localhost:3000/product-categories \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My First Category"
  }'
```

#### Create a product
```bash
curl -X POST http://localhost:3000/products \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "sku": "MY-SKU-001",
    "name": "My First Product",
    "unit": "pcs"
  }'
```

### Step 5: Explore (1 minute)

Open Swagger UI: http://localhost:3000/api

---

## 🎯 Common Tasks

### Create Product with Category

```bash
# 1. Create category
CATEGORY_RESPONSE=$(curl -s -X POST http://localhost:3000/product-categories \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Electronics"}')

# Extract category ID (using jq)
CATEGORY_ID=$(echo $CATEGORY_RESPONSE | jq -r '.id')

# 2. Create product with category
curl -X POST http://localhost:3000/products \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"sku\": \"LAPTOP-001\",
    \"name\": \"Laptop\",
    \"categoryId\": \"$CATEGORY_ID\",
    \"unit\": \"pcs\"
  }"
```

### Create Product Batch with Expiry

```bash
# Get product ID first, then:
curl -X POST http://localhost:3000/product-batches \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "YOUR_PRODUCT_ID",
    "batchNo": "BATCH-2024-001",
    "quantity": 100,
    "manufactureDate": "2024-01-15T00:00:00.000Z",
    "expiryDate": "2025-01-15T00:00:00.000Z"
  }'
```

### Check Expiring Batches

```bash
curl "http://localhost:3000/product-batches/expiring?daysAhead=30" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Search Products

```bash
curl "http://localhost:3000/products?search=laptop&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🔧 Troubleshooting

### Issue: Cannot connect to database
**Solution**: Check if PostgreSQL is running and DATABASE_URL in .env is correct

```bash
# Check PostgreSQL status
sudo service postgresql status

# Verify DATABASE_URL
cat backend/.env | grep DATABASE_URL
```

### Issue: 401 Unauthorized
**Solution**: Token expired or invalid. Login again to get new token

### Issue: 409 Conflict (Duplicate SKU)
**Solution**: SKU must be unique. Use different SKU or update existing product

### Issue: 404 Not Found
**Solution**: Check if the ID/SKU exists in database

```bash
# List all products to verify
curl http://localhost:3000/products \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Issue: Migration failed
**Solution**: Reset database and run migrations again

```bash
npx prisma migrate reset
npx prisma migrate dev
npx ts-node prisma/seeds/product-seed.ts
```

---

## 📱 Using VS Code REST Client

1. Install "REST Client" extension
2. Open `ENDPOINTS.http` file
3. Update `@token` variable with your JWT token
4. Click "Send Request" above any request

---

## 🧪 Running Tests

```bash
# Unit tests
npm run test -- product

# E2E tests  
npm run test:e2e -- product

# With coverage
npm run test:cov
```

---

## 📚 Next Steps

1. **Read full documentation**: See `README.md`
2. **API Reference**: See `PRODUCT_API.md`
3. **Explore Swagger**: http://localhost:3000/api
4. **Check examples**: See `ENDPOINTS.http`
5. **Integration**: Test with Inventory module

---

## 🎨 Using Postman

### Import Collection

1. Open Postman
2. Click "Import"
3. Use this as base:

```json
{
  "info": {
    "name": "Product Module",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "auth": {
    "type": "bearer",
    "bearer": [
      {
        "key": "token",
        "value": "{{jwt_token}}",
        "type": "string"
      }
    ]
  },
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3000"
    },
    {
      "key": "jwt_token",
      "value": "YOUR_TOKEN_HERE"
    }
  ]
}
```

### Environment Variables

Create a Postman environment with:
- `baseUrl`: http://localhost:3000
- `jwt_token`: Your JWT token
- `categoryId`: A category UUID
- `productId`: A product UUID
- `batchId`: A batch UUID

---

## 💡 Pro Tips

### 1. Use jq for JSON parsing
```bash
# Install jq
sudo apt install jq  # Ubuntu/Debian
brew install jq      # macOS

# Extract ID from response
PRODUCT_ID=$(curl -s -X POST ... | jq -r '.id')
```

### 2. Save token to file
```bash
# Login and save token
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  | jq -r '.accessToken' > token.txt

# Use token from file
TOKEN=$(cat token.txt)
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/products
```

### 3. Pretty print JSON
```bash
curl http://localhost:3000/products \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.'
```

### 4. Save response to file
```bash
curl http://localhost:3000/products \
  -H "Authorization: Bearer $TOKEN" \
  -o products.json
```

### 5. Watch logs in real-time
```bash
# In development
npm run start:dev

# In another terminal
tail -f logs/app.log
```

---

## 🔐 Default Credentials

**Admin User:**
- Username: `admin`
- Password: `admin123`
- Role: `admin`

**Manager User:**
- Username: `manager`
- Password: `manager123`
- Role: `manager`

**Warehouse Staff:**
- Username: `warehouse`
- Password: `warehouse123`
- Role: `warehouse_staff`

---

## 📊 Sample Data (After Seeding)

After running seed script, you'll have:

**Categories:**
- Electronics → Laptops, Smartphones
- Food & Beverage → Beverages, Snacks
- Clothing
- Home & Garden

**Products:**
- LAPTOP-DELL-XPS15
- LAPTOP-HP-ENVY
- PHONE-IPHONE-14
- PHONE-SAMSUNG-S23
- BEV-COKE-330ML
- BEV-WATER-500ML
- SNACK-LAYS-50G
- SNACK-OREO-100G
- CLOTH-TSHIRT-M
- CLOTH-JEANS-32

**Batches:**
- Multiple batches for each product
- Some with expiry dates (food items)
- Various quantities

---

## 🎓 Learning Path

1. ✅ **Start here** - Quick Start (you are here!)
2. 📖 **Understand concepts** - Read `README.md`
3. 🔌 **Learn API** - Study `PRODUCT_API.md`
4. 🧪 **Try examples** - Use `ENDPOINTS.http`
5. 🎨 **Explore UI** - Check Swagger at `/api`
6. 🔧 **Dive deep** - Read `IMPLEMENTATION_SUMMARY.md`

---

## ❓ FAQ

**Q: Can I create a product without a category?**  
A: Yes, categoryId is optional.

**Q: Can I have products with the same name?**  
A: Yes, but SKU must be unique.

**Q: Can I delete a category with products in it?**  
A: No, delete or move products first.

**Q: What happens if I don't specify batch number?**  
A: It will be null. The combination (productId, batchNo) must be unique.

**Q: Can a batch have no expiry date?**  
A: Yes, expiryDate is optional (for non-perishable items).

**Q: How do I track inventory for a product?**  
A: Create a batch, then use Inventory Module to track stock by batch.

---

## 🆘 Get Help

- Check documentation files in this folder
- Review Swagger UI at `/api`
- Run tests to see examples: `npm run test -- product`
- Check logs for detailed error messages
- Review `TROUBLESHOOTING.md` (if available)

---

**Ready to build something awesome? Let's go! 🚀**
