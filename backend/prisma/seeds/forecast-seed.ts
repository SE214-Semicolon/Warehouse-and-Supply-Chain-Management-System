import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedDemandForecasts(options: { products: any[] }) {
  console.log('📊 Seeding demand forecasts...');

  const { products } = options;

  const algorithms = ['MOVING_AVERAGE', 'EXPONENTIAL_SMOOTHING', 'SIMPLE_MOVING_AVERAGE'];

  const getRandomAlgorithm = () => algorithms[Math.floor(Math.random() * algorithms.length)];

  const getMonthDate = (monthsAhead: number): Date => {
    const date = new Date();
    date.setMonth(date.getMonth() + monthsAhead);
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
    return date;
  };

  const forecasts = [];

  // Create forecasts for next 6 months for each product
  for (const product of products) {
    // Base demand (varies by product type)
    let baseDemand = 100;
    if (product.sku.includes('LAPTOP') || product.sku.includes('PHONE')) {
      baseDemand = 50; // Electronics - lower volume, higher value
    } else if (product.sku.includes('BEV') || product.sku.includes('WATER')) {
      baseDemand = 500; // Beverages - high volume
    } else if (product.sku.includes('SNACK')) {
      baseDemand = 300; // Snacks - medium-high volume
    } else if (product.sku.includes('CLOTH')) {
      baseDemand = 150; // Clothing - medium volume
    }

    // Generate forecasts for 6 months
    for (let month = 0; month < 6; month++) {
      const forecastDate = getMonthDate(month);
      const algorithm = getRandomAlgorithm();

      // Add seasonality and trend
      const seasonalFactor = 1 + Math.sin((month * Math.PI) / 6) * 0.2; // +/- 20% seasonal variation
      const trendFactor = 1 + month * 0.05; // 5% growth per month
      const randomFactor = 0.9 + Math.random() * 0.2; // +/- 10% random variation

      const forecastedQty = Math.round(baseDemand * seasonalFactor * trendFactor * randomFactor);

      // Calculate confidence based on algorithm and time horizon
      let confidence = 0.9;
      if (algorithm === 'SIMPLE_MOVING_AVERAGE') {
        confidence = 0.75;
      } else if (algorithm === 'EXPONENTIAL_SMOOTHING') {
        confidence = 0.85;
      }
      confidence = confidence - month * 0.05; // Confidence decreases for future months
      confidence = Math.max(0.5, confidence); // Minimum 50% confidence

      const forecast = await prisma.demandForecast.create({
        data: {
          productId: product.id,
          forecastDate: forecastDate,
          forecastedQuantity: forecastedQty,
          algorithmUsed: algorithm,
        },
      });

      forecasts.push(forecast);
    }
  }

  console.log(`✅ Created ${forecasts.length} demand forecasts`);

  // Create summary statistics
  const forecastsByAlgorithm = {
    MOVING_AVERAGE: forecasts.filter((f) => f.algorithm === 'MOVING_AVERAGE').length,
    EXPONENTIAL_SMOOTHING: forecasts.filter((f) => f.algorithm === 'EXPONENTIAL_SMOOTHING').length,
    SIMPLE_MOVING_AVERAGE: forecasts.filter((f) => f.algorithm === 'SIMPLE_MOVING_AVERAGE').length,
  };

  console.log('  📈 Forecasts by algorithm:');
  console.log(`    - Moving Average: ${forecastsByAlgorithm.MOVING_AVERAGE}`);
  console.log(`    - Exponential Smoothing: ${forecastsByAlgorithm.EXPONENTIAL_SMOOTHING}`);
  console.log(`    - Simple Moving Average: ${forecastsByAlgorithm.SIMPLE_MOVING_AVERAGE}`);

  console.log('✅ Demand forecast seeding completed!');

  return forecasts;
}

// Run if this file is executed directly
if (require.main === module) {
  (async function main() {
    console.log('⚠️  This seed module requires existing products');
    console.log('⚠️  Please run the main seed.ts file instead');
  })()
    .catch((e) => {
      console.error('❌ Error:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
