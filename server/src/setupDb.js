import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'pg';
import dotenv from 'dotenv';
import { getInitialData } from './db.js';

const { Pool } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env
dotenv.config({ path: path.join(__dirname, '..', '.env') });
// Also load from current folder fallback if exists
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

console.log('='.repeat(65));
console.log('  Brightloop Software — Neon PostgreSQL Setup & Migration');
console.log('='.repeat(65));

if (!DATABASE_URL) {
  console.error('\n❌ ERROR: DATABASE_URL is not set in server/.env');
  console.log('\n👉 How to fix:');
  console.log('  1. Open server/.env (or create it from server/.env.example)');
  console.log('  2. Set your Neon connection string:');
  console.log('     DATABASE_URL=postgresql://neondb_owner:password@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require');
  console.log('  3. Re-run: npm run db:setup\n');
  process.exit(1);
}

// Check SSL requirements (Neon always requires SSL)
const isCloudDb = DATABASE_URL.includes('neon.tech') || 
                  DATABASE_URL.includes('sslmode=require') || 
                  DATABASE_URL.includes('amazonaws.com') ||
                  DATABASE_URL.includes('supabase.co') ||
                  !DATABASE_URL.includes('localhost');

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: isCloudDb ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 10000,
});

async function runSetup() {
  let client;
  try {
    console.log('\n🔄 1. Connecting to Neon PostgreSQL...');
    client = await pool.connect();
    
    const dbInfo = await client.query('SELECT current_database() as db, current_user as user, version() as version;');
    console.log(`✅ Connected successfully!`);
    console.log(`   Database: ${dbInfo.rows[0].db}`);
    console.log(`   User:     ${dbInfo.rows[0].user}`);
    console.log(`   Version:  ${dbInfo.rows[0].version.split(' ')[0]} ${dbInfo.rows[0].version.split(' ')[1]}`);

    console.log('\n🔄 2. Applying schema.sql (tables, indexes, constraints)...');
    const schemaPath = path.join(__dirname, '..', 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`schema.sql not found at ${schemaPath}`);
    }
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
    await client.query(schemaSql);
    console.log('✅ schema.sql executed successfully! All 14 enterprise tables created.');

    console.log('\n🔄 3. Checking seed data...');
    const custCheck = await client.query('SELECT COUNT(*) FROM customers;');
    const custCount = parseInt(custCheck.rows[0].count, 10);

    if (custCount === 0) {
      console.log('   Populating initial Indian enterprise records (TCS, Jio, Infosys, Flipkart, HDFC, Zomato)...');
      const seed = getInitialData();

      // System Settings
      await client.query(`
        INSERT INTO system_settings (id, company_name, legal_name, support_email, contact_phone, currency, currency_symbol, timezone, tax_id, address, invoice_prefix)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO UPDATE SET
          company_name = EXCLUDED.company_name,
          currency = EXCLUDED.currency,
          currency_symbol = EXCLUDED.currency_symbol,
          tax_id = EXCLUDED.tax_id;
      `, [
        'global_settings',
        seed.settings.companyName,
        seed.settings.legalName,
        seed.settings.supportEmail,
        seed.settings.contactPhone,
        seed.settings.currency,
        seed.settings.currencySymbol,
        seed.settings.timezone,
        seed.settings.taxId,
        seed.settings.address,
        seed.settings.invoicePrefix,
      ]);

      // Users
      for (const u of seed.users) {
        await client.query(`
          INSERT INTO users (id, name, email, role, avatar, status, department, last_login)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (id) DO NOTHING;
        `, [u.id, u.name, u.email, u.role, u.avatar, u.status, u.department, u.lastLogin]);
      }

      // Customers
      for (const c of seed.customers) {
        await client.query(`
          INSERT INTO customers (id, name, contact_name, email, phone, company, status, balance, total_spent, avatar, address)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (id) DO NOTHING;
        `, [c.id, c.name, c.contactName, c.email, c.phone, c.company, c.status, c.balance, c.totalSpent, c.avatar, c.address]);
      }

      // Products
      for (const p of seed.products) {
        await client.query(`
          INSERT INTO products (id, name, description, category, status, icon, features)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (id) DO NOTHING;
        `, [p.id, p.name, p.description, p.category, p.status, p.icon, JSON.stringify(p.features || [])]);
      }

      // Plans
      for (const pl of seed.plans) {
        await client.query(`
          INSERT INTO plans (id, product_id, name, billing_interval, price, currency, seat_based, price_per_seat, active_subscribers, features)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (id) DO NOTHING;
        `, [pl.id, pl.productId, pl.name, pl.billingInterval, pl.price, pl.currency, pl.seatBased, pl.pricePerSeat, pl.activeSubscribers, JSON.stringify(pl.features || [])]);
      }

      // Subscriptions
      for (const s of seed.subscriptions) {
        await client.query(`
          INSERT INTO subscriptions (id, customer_id, plan_id, quantity, billing_cycle, unit_price, seats_amount, amount, status, current_period_start, current_period_end, next_renewal, auto_renew, days_remaining)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          ON CONFLICT (id) DO NOTHING;
        `, [s.id, s.customerId, s.planId, s.quantity, s.billingCycle, s.unitPrice, s.seatsAmount || 0, s.amount, s.status, s.currentPeriodStart, s.currentPeriodEnd, s.nextRenewal, s.autoRenew, s.daysRemaining || 30]);
      }

      // Invoices & Invoice Items
      for (const inv of seed.invoices) {
        await client.query(`
          INSERT INTO invoices (id, invoice_number, customer_id, subscription_id, issue_date, due_date, status, subtotal, discount_amount, tax_amount, total, paid_at, payment_method)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT (id) DO NOTHING;
        `, [inv.id, inv.invoiceNumber, inv.customerId, inv.subscriptionId, inv.issueDate, inv.dueDate, inv.status, inv.subtotal, inv.discountAmount || 0, inv.taxAmount || 0, inv.total, inv.paidAt || null, inv.paymentMethod || null]);

        if (inv.items && inv.items.length > 0) {
          for (const it of inv.items) {
            await client.query(`
              INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, amount)
              VALUES ($1, $2, $3, $4, $5);
            `, [inv.id, it.description, it.quantity, it.unitPrice, it.amount]);
          }
        }
      }

      // Payments
      for (const pay of seed.payments) {
        await client.query(`
          INSERT INTO payments (id, payment_reference, invoice_id, customer_id, amount, currency, payment_method, status, failure_reason, transaction_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (id) DO NOTHING;
        `, [pay.id, pay.paymentReference, pay.invoiceId, pay.customerId, pay.amount, pay.currency, pay.paymentMethod, pay.status, pay.failureReason || null, pay.transactionId]);
      }

      // Taxes
      for (const tx of seed.taxes) {
        await client.query(`
          INSERT INTO taxes (id, name, rate, country, region, tax_type, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (id) DO NOTHING;
        `, [tx.id, tx.name, tx.rate, tx.country, tx.region || 'Default', tx.taxType, tx.status]);
      }

      // Discounts
      for (const d of seed.discounts) {
        await client.query(`
          INSERT INTO discounts (id, code, name, type, value, currency, valid_until, usage_limit, used_count, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (id) DO NOTHING;
        `, [d.id, d.code, d.name, d.type, d.value, d.currency, d.validUntil, d.usageLimit, d.usedCount, d.status]);
      }

      // Audit Logs
      for (const log of seed.auditLogs) {
        await client.query(`
          INSERT INTO audit_logs (id, action, entity_type, entity_id, actor, details, timestamp)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (id) DO NOTHING;
        `, [log.id, log.action, log.entityType, log.entityId, log.actor, log.details, log.timestamp]);
      }

      console.log('✅ Seed data successfully inserted into Neon PostgreSQL!');
    } else {
      console.log(`ℹ️ Neon PostgreSQL already has ${custCount} customers. Skipped duplicate seeding.`);
    }

    // Verify final table counts
    console.log('\n📊 4. Database Verification:');
    const tables = ['customers', 'products', 'plans', 'subscriptions', 'invoices', 'payments', 'taxes', 'discounts', 'audit_logs'];
    for (const tbl of tables) {
      const res = await client.query(`SELECT COUNT(*) FROM ${tbl};`);
      console.log(`   - ${tbl.padEnd(16)}: ${res.rows[0].count} records`);
    }

    console.log('\n' + '='.repeat(65));
    console.log('🎉 Neon PostgreSQL setup is COMPLETE and ready for production!');
    console.log('   Run "npm run dev" in the server directory to start your backend.');
    console.log('='.repeat(65) + '\n');

  } catch (error) {
    console.error('\n❌ Neon setup failed:', error.message);
    if (error.code) console.error(`   Error code: ${error.code}`);
    if (error.detail) console.error(`   Detail: ${error.detail}`);
    process.exit(1);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

runSetup();
