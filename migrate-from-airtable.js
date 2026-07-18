/**
 * MoneyBio — Airtable → Supabase Migration Script
 * 
 * USAGE:
 *   1. Sign up at your MoneyBio URL
 *   2. Go to Settings — your User ID is shown there (or check Supabase Auth > Users)
 *   3. Run: node migrate-from-airtable.js YOUR_USER_ID
 * 
 * What this migrates:
 *   - All 313 "Done!" receipt line items from Receipt Itemizer
 *   - Grouped into transactions by store + date
 *   - Category mapping from Airtable → MoneyBio categories
 *   - Payment method mapping
 *   - HSA/FSA items flagged as medical + HSA eligible
 *   - Business expenses flagged correctly
 *   - Notes preserved
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://xooprlfjyhakcrxilwvs.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY // set this as env var — get from Supabase Settings > API > service_role key
const USER_ID = process.argv[2]

if (!USER_ID) {
  console.error('❌ Usage: node migrate-from-airtable.js YOUR_USER_ID')
  process.exit(1)
}
if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ Set SUPABASE_SERVICE_KEY env var (service_role key from Supabase dashboard)')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// ── Category mapping: Airtable → MoneyBio ──────────────────
const CATEGORY_MAP = {
  'Food - Groceries':             'Groceries',
  'Food - Dining out':            'Dining',
  'Food - Other':                 'Dining',
  'Transportation - Fuel':        'Gas',
  'Transportation - Maintenance': 'Transportation',
  'Transportation - Licensing':   'Transportation',
  'Transportation - Other':       'Transportation',
  'Travel (Business) - Bus/taxi fare': 'Transportation',
  'Travel (Business) - Flight':   'Travel',
  'Travel (Business) - Hotel':    'Travel',
  'Travel (Business) - Meals':    'Dining',
  'Travel (Business) - Other':    'Travel',
  'Travel (Business) - Fuel':     'Gas',
  'Travel (Business) - Parking':  'Transportation',
  'Travel (Personal) - Bus/taxi fare': 'Transportation',
  'Travel (Personal) - Flight':   'Travel',
  'Travel (Personal) - Hotel':    'Travel',
  'Travel (Personal) - Meals':    'Dining',
  'Travel (Personal) - Other':    'Travel',
  'Travel (Personal) - Parking':  'Transportation',
  'Travel (Personal) - Fuel':     'Gas',
  'Personal Care - Medical':      'Medical',
  'Personal Care - Clothing':     'Shopping',
  'Personal Care - Dry cleaning': 'Shopping',
  'Personal Care - Hair/nails':   'Personal Care',
  'Personal Care - Other':        'Shopping',
  'Housing - Electricity':        'Utilities',
  'Housing - Gas':                'Utilities',
  'Housing - Phone':              'Utilities',
  'Housing - Mortgage or rent':   'Housing',
  'Housing - Maintenance or repairs': 'Housing',
  'Housing - Supplies':           'Household',
  'Housing - Other':              'Housing',
  'Business - Expense':           'Business',
  'Business - Supplies':          'Business',
  'Business - Gas':               'Gas',
  'Business - Phone':             'Utilities',
  'Business - Electricity':       'Utilities',
  'Business - Maintenance or repairs': 'Business',
  'Business - Mortgage or rent':  'Business',
  'Insurance - Condo':            'Insurance',
  'Insurance - House':            'Insurance',
  'Insurance - Rental':           'Insurance',
  'Insurance - Other':            'Insurance',
  'Entertainment - Movies':       'Entertainment',
  'Entertainment - Concerts':     'Entertainment',
  'Entertainment - Live theater': 'Entertainment',
  'Entertainment - Sporting events': 'Entertainment',
  'Entertainment - Other':        'Entertainment',
  'Gifts and Donations - Charity 1': 'Gifts',
  'Taxes - Federal':              'Taxes',
  'Taxes - State':                'Taxes',
  'Taxes - Local':                'Taxes',
  'Taxes - Other':                'Taxes',
  'Unknown':                      'Other',
}

const PAYMENT_METHOD_MAP = {
  'Credit Card': 'credit_card',
  'Debit Card':  'debit_card',
  'HSA/FSA':     'hsa',
  'Cash':        'cash',
  'Other':       'other',
}

async function main() {
  console.log(`\n🚀 MoneyBio Airtable Migration`)
  console.log(`   User ID: ${USER_ID}`)
  console.log(`   Supabase: ${SUPABASE_URL}\n`)

  // ── Step 1: Fetch all Done! records from Airtable ──────────
  console.log('📥 Fetching all completed records from Airtable Receipt Itemizer...')
  
  const airtableToken = process.env.AIRTABLE_TOKEN
  if (!airtableToken) {
    console.error('❌ Set AIRTABLE_TOKEN env var (your Airtable personal access token)')
    process.exit(1)
  }

  let allRecords = []
  let offset = null
  do {
    const url = new URL(`https://api.airtable.com/v0/appsmZYaqhOCF8wW5/tbl85aOjtsHgmPdNi`)
    url.searchParams.set('filterByFormula', `{Steps} = 'Done!'`)
    url.searchParams.set('pageSize', '100')
    url.searchParams.set('fields[]', 'Store Name')
    url.searchParams.set('fields[]', 'Item')
    url.searchParams.set('fields[]', 'Expense Category')
    url.searchParams.set('fields[]', 'Expense Type')
    url.searchParams.set('fields[]', 'Tax Category')
    url.searchParams.set('fields[]', 'Quantity')
    url.searchParams.set('fields[]', 'Total Cost')
    url.searchParams.set('fields[]', 'Date of Purchase')
    url.searchParams.set('fields[]', 'Payment Method')
    url.searchParams.set('fields[]', 'Notes')
    if (offset) url.searchParams.set('offset', offset)

    const res = await fetch(url, { headers: { 'Authorization': `Bearer ${airtableToken}` } })
    const data = await res.json()
    allRecords.push(...(data.records || []))
    offset = data.offset
    console.log(`   Fetched ${allRecords.length} records...`)
  } while (offset)

  console.log(`✅ Got ${allRecords.length} line items\n`)

  // ── Step 2: Get or create categories in Supabase ──────────
  console.log('📂 Loading categories...')
  const { data: existingCats } = await supabase.from('categories').select('id, name').eq('user_id', USER_ID)
  const catMap = {}
  for (const c of existingCats || []) catMap[c.name] = c.id

  // Create any missing categories
  const neededCats = new Set(Object.values(CATEGORY_MAP))
  const missing = [...neededCats].filter(n => !catMap[n])
  if (missing.length > 0) {
    const { data: newCats } = await supabase.from('categories').insert(
      missing.map(name => ({ user_id: USER_ID, name, color: '#9C9A94', icon: 'ti-tag' }))
    ).select()
    for (const c of newCats || []) catMap[c.name] = c.id
  }
  console.log(`✅ ${Object.keys(catMap).length} categories ready\n`)

  // ── Step 3: Group line items by store + date → transactions ─
  console.log('🗂  Grouping line items into transactions...')
  const groups = {}
  for (const rec of allRecords) {
    const f = rec.fields
    const store = f['Store Name'] || 'Unknown'
    const date  = f['Date of Purchase'] || new Date().toISOString().split('T')[0]
    const key   = `${store}__${date}`
    if (!groups[key]) groups[key] = { store, date, items: [], paymentMethod: null, isHSA: false }
    groups[key].items.push(f)
    // Payment method — take the first one found
    const pm = f['Payment Method']?.[0]
    if (pm && !groups[key].paymentMethod) groups[key].paymentMethod = pm
    if (pm === 'HSA/FSA') groups[key].isHSA = true
  }

  const groupList = Object.values(groups)
  console.log(`✅ ${allRecords.length} line items → ${groupList.length} transactions\n`)

  // ── Step 4: Insert transactions + receipt_items ────────────
  console.log('💾 Writing to MoneyBio...')
  let txnCount = 0
  let itemCount = 0
  let errorCount = 0

  for (const group of groupList) {
    try {
      const totalAmount = group.items.reduce((sum, item) => sum + (parseFloat(item['Total Cost']) || 0), 0)
      const categoryName = CATEGORY_MAP[group.items[0]['Expense Category']] || 'Other'
      const categoryId   = catMap[categoryName] || null
      const paymentMethod = PAYMENT_METHOD_MAP[group.paymentMethod] || 'credit_card'
      const expenseType  = group.items[0]['Expense Type'] || 'Personal'
      const isMedical    = group.items.some(i => i['Expense Category']?.includes('Medical') || i['Payment Method']?.includes('HSA'))
      const isBusiness   = expenseType === 'Business' || expenseType === 'Work'

      // Create receipt
      const { data: receipt } = await supabase.from('receipts').insert({
        user_id:        USER_ID,
        merchant_name:  group.store,
        receipt_date:   new Date(group.date + 'T12:00:00Z').toISOString(),
        total_amount:   totalAmount,
        payment_method: paymentMethod,
        source:         'airtable_import',
        notes:          group.items.map(i => i['Notes']).filter(Boolean).join('; ') || null,
      }).select('id').single()

      if (!receipt?.id) { errorCount++; continue }

      // Create receipt line items
      const lineItems = group.items.map(item => ({
        receipt_id:  receipt.id,
        user_id:     USER_ID,
        item_name:   item['Item'] || 'Unknown item',
        quantity:    parseFloat(item['Quantity']) || 1,
        total_price: parseFloat(item['Total Cost']) || 0,
      }))
      await supabase.from('receipt_items').insert(lineItems)

      // Create transaction
      await supabase.from('transactions').insert({
        user_id:          USER_ID,
        receipt_id:       receipt.id,
        description:      group.store,
        merchant_name:    group.store,
        amount:           -Math.abs(totalAmount),
        type:             'expense',
        payment_method:   paymentMethod,
        transaction_date: new Date(group.date + 'T12:00:00Z').toISOString(),
        category_id:      categoryId,
        source:           'airtable_import',
        is_hsa_eligible:  isMedical,
        tags:             isBusiness ? ['business'] : [],
      })

      // If HSA, create medical expense record too
      if (isMedical) {
        await supabase.from('medical_expenses').insert({
          user_id:          USER_ID,
          provider_name:    group.store,
          expense_date:     new Date(group.date + 'T12:00:00Z').toISOString(),
          amount:           totalAmount,
          is_hsa_eligible:  true,
          hsa_submitted:    group.isHSA,
          expense_type:     'other',
        })
      }

      txnCount++
      itemCount += lineItems.length
      if (txnCount % 25 === 0) console.log(`   ${txnCount}/${groupList.length} transactions...`)

    } catch (err) {
      errorCount++
      console.warn(`   ⚠️  Skipped: ${group.store} ${group.date} — ${err.message}`)
    }
  }

  // ── Step 5: Import bank cards ──────────────────────────────
  console.log('\n💳 Importing bank cards...')
  const cardsRes = await fetch(
    `https://api.airtable.com/v0/appsmZYaqhOCF8wW5/tblpwKhig4uJ8oVcW?filterByFormula={Status}='Active'`,
    { headers: { 'Authorization': `Bearer ${airtableToken}` } }
  )
  const cardsData = await cardsRes.json()
  const cards = cardsData.records || []
  
  for (const card of cards) {
    const f = card.fields
    await supabase.from('connected_accounts').insert({
      user_id:          USER_ID,
      institution_name: f['Description'] || 'Unknown Bank',
      account_name:     f['Card Shortname'] || 'Card',
      last_four:        f['Last Four Digits']?.toString() || null,
      institution_type: 'bank',
      wallet_type:      null,
      is_active:        true,
      connection_type:  'manual',
    }).single()
  }
  console.log(`✅ ${cards.length} cards imported\n`)

  // ── Done ──────────────────────────────────────────────────
  console.log('═══════════════════════════════════')
  console.log(`✅ Migration complete!`)
  console.log(`   ${txnCount} transactions created`)
  console.log(`   ${itemCount} line items imported`)
  console.log(`   ${cards.length} bank cards imported`)
  if (errorCount) console.log(`   ⚠️  ${errorCount} records skipped (check logs above)`)
  console.log(`\nOpen MoneyBio and refresh — your data is there!`)
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })
