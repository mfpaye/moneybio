import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables. Check your .env file.')
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

// ─── AUTH HELPERS ────────────────────────────────────────────
export const auth = {
  signUp: (email, password, fullName) =>
    supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    }),

  signIn: (email, password) =>
    supabase.auth.signInWithPassword({ email, password }),

  signInWithGoogle: () =>
    supabase.auth.signInWithOAuth({ provider: 'google' }),

  signOut: () => supabase.auth.signOut(),

  getUser: () => supabase.auth.getUser(),

  getSession: () => supabase.auth.getSession(),

  onAuthStateChange: (cb) => supabase.auth.onAuthStateChange(cb),
}

// ─── PROFILE ─────────────────────────────────────────────────
export const profiles = {
  get: (userId) =>
    supabase.from('profiles').select('*').eq('id', userId).single(),

  update: (userId, data) =>
    supabase.from('profiles').update(data).eq('id', userId),
}

// ─── TRANSACTIONS ─────────────────────────────────────────────
export const transactions = {
  list: (userId, { limit = 50, offset = 0, category, type, from, to } = {}) => {
    let q = supabase
      .from('transactions')
      .select(`*, categories(name, color, icon), connected_accounts(institution_name, last_four, wallet_type)`)
      .eq('user_id', userId)
      .order('transaction_date', { ascending: false })
      .range(offset, offset + limit - 1)

    if (category) q = q.eq('category_id', category)
    if (type) q = q.eq('type', type)
    if (from) q = q.gte('transaction_date', from)
    if (to) q = q.lte('transaction_date', to)
    return q
  },

  get360: (transactionId) =>
    supabase.from('transaction_360').select('*').eq('transaction_id', transactionId).single(),

  insert: (data) => supabase.from('transactions').insert(data).select().single(),

  update: (id, data) =>
    supabase.from('transactions').update(data).eq('id', id).select().single(),

  delete: (id) => supabase.from('transactions').delete().eq('id', id),

  monthlySummary: (userId, month) =>
    supabase
      .from('monthly_budget_summary')
      .select('*')
      .eq('user_id', userId)
      .eq('month', month),
}

// ─── RECEIPTS ────────────────────────────────────────────────
export const receipts = {
  list: (userId, limit = 20) =>
    supabase
      .from('receipts')
      .select('*, receipt_items(*)')
      .eq('user_id', userId)
      .order('receipt_date', { ascending: false })
      .limit(limit),

  insert: (data) => supabase.from('receipts').insert(data).select().single(),

  uploadImage: async (userId, file) => {
    const ext = file.name.split('.').pop()
    const path = `${userId}/receipts/${Date.now()}.${ext}`
    const { data, error } = await supabase.storage
      .from('receipts')
      .upload(path, file, { upsert: false })
    if (error) return { error }
    const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(path)
    return { url: publicUrl, path }
  },
}

// ─── CATEGORIES ───────────────────────────────────────────────
export const categories = {
  list: (userId) =>
    supabase
      .from('categories')
      .select('*')
      .or(`user_id.is.null,user_id.eq.${userId}`)
      .order('name'),

  insert: (data) => supabase.from('categories').insert(data).select().single(),
}

// ─── INCOME ──────────────────────────────────────────────────
export const income = {
  list: (userId, limit = 50) =>
    supabase
      .from('income')
      .select('*')
      .eq('user_id', userId)
      .order('received_date', { ascending: false })
      .limit(limit),

  insert: (data) => supabase.from('income').insert(data).select().single(),
}

// ─── LOANS ───────────────────────────────────────────────────
export const loans = {
  myLoans: () =>
    supabase.from('my_loans').select('*').order('issued_date', { ascending: false }),

  getAgreement: (id) =>
    supabase
      .from('loan_agreements')
      .select(`*, loan_parties(*), loan_payments(*), loan_events(*)`)
      .eq('id', id)
      .single(),

  createAgreement: (data) =>
    supabase.from('loan_agreements').insert(data).select().single(),

  addParty: (data) =>
    supabase.from('loan_parties').insert(data).select().single(),

  addPayment: (data) =>
    supabase.from('loan_payments').insert(data).select().single(),

  confirmPayment: (paymentId, confirmedByUserId) =>
    supabase
      .from('loan_payments')
      .update({ status: 'confirmed', confirmed_by_user_id: confirmedByUserId, confirmed_at: new Date().toISOString() })
      .eq('id', paymentId)
      .select()
      .single(),

  uploadProof: async (agreementId, file) => {
    const ext = file.name.split('.').pop()
    const path = `loans/${agreementId}/${Date.now()}.${ext}`
    const { data, error } = await supabase.storage
      .from('loan-proofs')
      .upload(path, file)
    if (error) return { error }
    const { data: { publicUrl } } = supabase.storage.from('loan-proofs').getPublicUrl(path)
    return { url: publicUrl }
  },

  getSummary: (agreementId) =>
    supabase.rpc('generate_loan_summary', { p_agreement_id: agreementId }),

  close: (agreementId) =>
    supabase
      .from('loan_agreements')
      .update({ status: 'closed', closed_at: new Date().toISOString() })
      .eq('id', agreementId),
}

// ─── SHOPPING LISTS ──────────────────────────────────────────
export const shoppingLists = {
  list: (userId) =>
    supabase
      .from('shopping_lists')
      .select(`*, shopping_list_items(*, profiles(full_name))`)
      .or(`owner_id.eq.${userId}`)
      .order('created_at', { ascending: false }),

  create: (data) =>
    supabase.from('shopping_lists').insert(data).select().single(),

  getByToken: (token) =>
    supabase
      .from('shopping_lists')
      .select(`*, shopping_list_items(*)`)
      .eq('share_token', token)
      .single(),

  addItem: (data) =>
    supabase.from('shopping_list_items').insert(data).select().single(),

  updateItem: (id, data) =>
    supabase.from('shopping_list_items').update(data).eq('id', id).select().single(),

  checkItem: (id, checkedBy) =>
    supabase
      .from('shopping_list_items')
      .update({ is_checked: true, checked_by: checkedBy, checked_at: new Date().toISOString() })
      .eq('id', id),

  invite: (data) =>
    supabase.from('shopping_list_invites').insert(data).select().single(),

  // Realtime subscription for collaborative lists
  subscribeToList: (listId, callback) =>
    supabase
      .channel(`list:${listId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'shopping_list_items',
        filter: `list_id=eq.${listId}`,
      }, callback)
      .subscribe(),
}

// ─── MEDICAL & HSA ───────────────────────────────────────────
export const medical = {
  list: (userId) =>
    supabase
      .from('medical_expenses')
      .select('*')
      .eq('user_id', userId)
      .order('expense_date', { ascending: false }),

  pendingHSA: (userId) =>
    supabase
      .from('medical_expenses')
      .select('*')
      .eq('user_id', userId)
      .eq('is_hsa_eligible', true)
      .eq('hsa_submitted', false),

  submitHSA: async (userId, expenseIds) => {
    const total = 0 // calculated from expenses
    const { data: submission } = await supabase
      .from('hsa_submissions')
      .insert({ user_id: userId, total_amount: total })
      .select()
      .single()

    await supabase.from('hsa_submission_items').insert(
      expenseIds.map(id => ({ submission_id: submission.id, medical_expense_id: id }))
    )
    await supabase
      .from('medical_expenses')
      .update({ hsa_submitted: true, hsa_submitted_at: new Date().toISOString() })
      .in('id', expenseIds)

    return submission
  },
}

// ─── CONNECTED ACCOUNTS ──────────────────────────────────────
export const connectedAccounts = {
  list: (userId) =>
    supabase
      .from('connected_accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('is_primary', { ascending: false }),

  add: (data) =>
    supabase.from('connected_accounts').insert(data).select().single(),

  bankTransactions: (userId, accountId, limit = 100) =>
    supabase
      .from('bank_transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('connected_account_id', accountId)
      .order('bank_date', { ascending: false })
      .limit(limit),

  reconcile: (userId) =>
    supabase.rpc('auto_reconcile', { p_user_id: userId }),
}

// ─── PRICE HISTORY ───────────────────────────────────────────
export const prices = {
  findNearby: (itemName, lat, lng, radiusMiles = 10) =>
    supabase.rpc('find_nearby_prices', {
      p_item_name: itemName,
      p_lat: lat,
      p_lng: lng,
      p_radius_miles: radiusMiles,
    }),

  contribute: (data) =>
    supabase.from('price_history').insert(data).select().single(),
}

// ─── NOTIFICATIONS ───────────────────────────────────────────
export const notifications = {
  list: (userId, unreadOnly = false) => {
    let q = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30)
    if (unreadOnly) q = q.eq('is_read', false)
    return q
  },

  markRead: (id) =>
    supabase.from('notifications').update({ is_read: true }).eq('id', id),

  markAllRead: (userId) =>
    supabase.from('notifications').update({ is_read: true }).eq('user_id', userId),

  getPreferences: (userId) =>
    supabase.from('notification_preferences').select('*').eq('user_id', userId).single(),

  updatePreferences: (userId, data) =>
    supabase.from('notification_preferences').update(data).eq('user_id', userId),
}

// ─── VOICE CAPTURES ──────────────────────────────────────────
export const voiceCaptures = {
  save: (data) =>
    supabase.from('voice_captures').insert(data).select().single(),

  list: (userId, limit = 20) =>
    supabase
      .from('voice_captures')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit),

  approve: (id, transactionIds) =>
    supabase
      .from('voice_captures')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        transaction_ids: transactionIds,
      })
      .eq('id', id),
}

// ─── RECONSTRUCTED RECEIPTS (lost receipt via chat/voice) ────
export const reconstructedReceipts = {
  // Save the initial AI parse from chat/voice
  create: (data) =>
    supabase.from('reconstructed_receipts').insert(data).select().single(),

  // Add parsed line items
  addItems: (items) =>
    supabase.from('reconstructed_receipt_items').insert(items).select(),

  // Get pending reconstructions for review
  listPending: (userId) =>
    supabase
      .from('reconstructed_receipts')
      .select('*, reconstructed_receipt_items(*)')
      .eq('user_id', userId)
      .eq('review_status', 'pending')
      .order('created_at', { ascending: false }),

  // Update a line item (user editing before approval)
  updateItem: (id, data) =>
    supabase
      .from('reconstructed_receipt_items')
      .update(data)
      .eq('id', id)
      .select()
      .single(),

  // Search for matching bank/wallet transaction
  findMatch: (userId, amount, purchaseDate, merchantName, paymentMethod) =>
    supabase.rpc('find_matching_transaction', {
      p_user_id: userId,
      p_amount: amount,
      p_purchase_date: purchaseDate,
      p_merchant_name: merchantName,
      p_payment_method: paymentMethod,
    }),

  // Link to found bank/wallet transaction
  linkMatch: (id, { bankTransactionId, walletTransactionId, matchConfidence, matchStatus }) =>
    supabase
      .from('reconstructed_receipts')
      .update({
        matched_bank_transaction_id: bankTransactionId,
        matched_wallet_transaction_id: walletTransactionId,
        match_confidence: matchConfidence,
        match_status: matchStatus,
      })
      .eq('id', id),

  // Approve and convert to real transaction
  approve: (reconstructedReceiptId, userId) =>
    supabase.rpc('approve_reconstructed_receipt', {
      p_reconstructed_receipt_id: reconstructedReceiptId,
      p_user_id: userId,
    }),

  // Reject
  reject: (id) =>
    supabase
      .from('reconstructed_receipts')
      .update({ review_status: 'rejected' })
      .eq('id', id),
}

// ─── SMART TARGETED SEARCH ───────────────────────────────────
export const smartSearch = {
  // Find only unmatched transactions in a date window
  findUnmatched: (userId, fromDate, toDate, merchantHint = null, amountHint = null) =>
    supabase.rpc('find_unmatched_transactions', {
      p_user_id: userId,
      p_from_date: fromDate,
      p_to_date: toDate,
      p_merchant_hint: merchantHint,
      p_amount_hint: amountHint,
    }),

  // Estimate item prices from user history + crowd
  estimatePrices: (userId, items, merchantName = null) =>
    supabase.rpc('estimate_item_prices', {
      p_user_id: userId,
      p_items: JSON.stringify(items),
      p_merchant_name: merchantName,
    }),
}

// ─── TAX ─────────────────────────────────────────────────────
export const tax = {
  // Get state tax rates (public reference table)
  getStateRates: (stateCode) =>
    supabase.from('state_tax_rates').select('*').eq('state_code', stateCode).single(),

  allStates: () =>
    supabase.from('state_tax_rates').select('state_code,state_name,has_income_tax,state_sales_tax').order('state_name'),

  // Residency periods
  getResidency: (userId, taxYear) =>
    supabase.from('tax_residency').select('*').eq('user_id', userId).eq('tax_year', taxYear).order('start_date'),

  addResidency: (data) =>
    supabase.from('tax_residency').insert(data).select().single(),

  updateResidency: (id, data) =>
    supabase.from('tax_residency').update(data).eq('id', id).select().single(),

  deleteResidency: (id) =>
    supabase.from('tax_residency').delete().eq('id', id),

  // Get stored estimate
  getEstimate: (userId, taxYear) =>
    supabase.from('tax_estimates').select('*').eq('user_id', userId).eq('tax_year', taxYear).single(),

  // Calculate (runs the full function and stores result)
  calculate: (userId, taxYear, filingStatus = 'single') =>
    supabase.rpc('calculate_tax_estimate', {
      p_user_id: userId,
      p_tax_year: taxYear,
      p_filing_status: filingStatus,
    }),
}

// ─── TRANSACTION SHARING ─────────────────────────────────────
export const sharing = {
  // ── Recipients (people you share with) ──
  listRecipients: (ownerId) =>
    supabase.from('share_recipients').select('*')
      .eq('owner_id', ownerId).order('created_at', { ascending: false }),

  addRecipient: (data) =>
    supabase.from('share_recipients').insert(data).select().single(),

  updateRecipient: (id, data) =>
    supabase.from('share_recipients').update(data).eq('id', id).select().single(),

  removeRecipient: (id) =>
    supabase.from('share_recipients').delete().eq('id', id),

  getByToken: (token) =>
    supabase.from('share_recipients').select('*, profiles!owner_id(full_name,email)')
      .eq('invite_token', token).single(),

  acceptInvite: (token, userId) =>
    supabase.from('share_recipients')
      .update({ recipient_user_id: userId, invite_status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('invite_token', token),

  // ── Shares (what each recipient can see) ──
  listShares: (ownerId, recipientId = null) => {
    let q = supabase.from('transaction_shares')
      .select('*, share_recipients(recipient_name,recipient_email), categories(name,color), transactions(description,amount,merchant_name,transaction_date)')
      .eq('owner_id', ownerId).eq('is_active', true)
    if (recipientId) q = q.eq('recipient_id', recipientId)
    return q.order('created_at', { ascending: false })
  },

  addShare: (data) =>
    supabase.from('transaction_shares').insert(data).select().single(),

  // Share a specific transaction
  shareTransaction: (ownerId, recipientId, transactionId, options = {}) =>
    supabase.from('transaction_shares').insert({
      owner_id: ownerId,
      recipient_id: recipientId,
      share_type: 'transaction',
      transaction_id: transactionId,
      include_amounts: options.includeAmounts ?? true,
      include_merchant: options.includeMerchant ?? true,
      include_receipt: options.includeReceipt ?? false,
      include_notes: options.includeNotes ?? false,
    }).select().single(),

  // Share all transactions in a category
  shareCategory: (ownerId, recipientId, categoryId, options = {}) =>
    supabase.from('transaction_shares').insert({
      owner_id: ownerId, recipient_id: recipientId,
      share_type: 'category', category_id: categoryId,
      include_amounts: options.includeAmounts ?? true,
      include_merchant: options.includeMerchant ?? true,
      include_receipt: options.includeReceipt ?? false,
    }).select().single(),

  // Share a date range
  shareDateRange: (ownerId, recipientId, dateFrom, dateTo, options = {}) =>
    supabase.from('transaction_shares').insert({
      owner_id: ownerId, recipient_id: recipientId,
      share_type: 'date_range', date_from: dateFrom, date_to: dateTo,
      include_amounts: options.includeAmounts ?? true,
      include_merchant: options.includeMerchant ?? true,
    }).select().single(),

  // Share everything
  shareAll: (ownerId, recipientId, options = {}) =>
    supabase.from('transaction_shares').insert({
      owner_id: ownerId, recipient_id: recipientId,
      share_type: 'all',
      include_amounts: options.includeAmounts ?? true,
      include_merchant: options.includeMerchant ?? true,
      include_receipt: options.includeReceipt ?? false,
    }).select().single(),

  revokeShare: (shareId) =>
    supabase.from('transaction_shares').update({ is_active: false }).eq('id', shareId),

  revokeAllForRecipient: (recipientId) =>
    supabase.from('transaction_shares').update({ is_active: false }).eq('recipient_id', recipientId),

  // ── Shared view queries ──
  // What can recipient X see? (owner perspective)
  getSharedWith: (ownerId, recipientId) =>
    supabase.rpc('get_shared_transactions', {
      p_owner_id: ownerId,
      p_recipient_id: recipientId,
    }),

  // Full sharing summary (all recipients + counts)
  getSummary: (ownerId) =>
    supabase.rpc('get_sharing_summary', { p_owner_id: ownerId }),

  // What others have shared with me
  sharedWithMe: (userId) =>
    supabase.from('share_recipients')
      .select(`*, transaction_shares(*, transactions(description,amount,merchant_name,transaction_date,categories(name,color)))`)
      .eq('recipient_user_id', userId)
      .eq('invite_status', 'accepted'),

  // ── Comments ──
  getComments: (transactionId) =>
    supabase.from('share_comments').select('*').eq('transaction_id', transactionId).order('created_at'),

  addComment: (data) =>
    supabase.from('share_comments').insert(data).select().single(),

  markCommentRead: (id) =>
    supabase.from('share_comments').update({ is_read: true }).eq('id', id),
}

// ─── COLLABORATIVE SPACES ────────────────────────────────────
export const spaces = {
  // ── Spaces ──
  list: (userId) =>
    supabase.from('collaborative_spaces')
      .select(`*, space_members(id,display_name,role,user_id,invite_status,shares_transactions,avatar_color)`)
      .or(`created_by.eq.${userId}`)
      .eq('is_active', true)
      .order('created_at', { ascending: false }),

  mySpaces: (userId) =>
    supabase.from('space_members')
      .select(`*, collaborative_spaces(id,name,space_type,created_by,created_at)`)
      .eq('user_id', userId)
      .eq('invite_status', 'accepted'),

  create: (data) =>
    supabase.from('collaborative_spaces').insert(data).select().single(),

  get: (id) =>
    supabase.from('collaborative_spaces')
      .select(`*, space_members(*)`)
      .eq('id', id).single(),

  update: (id, data) =>
    supabase.from('collaborative_spaces').update(data).eq('id', id),

  getByToken: (token) =>
    supabase.from('collaborative_spaces')
      .select(`*, space_members(*)`)
      .eq('invite_token', token).single(),

  // ── Members ──
  addMember: (data) =>
    supabase.from('space_members').insert(data).select().single(),

  updateMember: (id, data) =>
    supabase.from('space_members').update(data).eq('id', id).select().single(),

  // Update own privacy settings
  updateMyPrivacy: (spaceId, userId, privacyData) =>
    supabase.from('space_members')
      .update(privacyData)
      .eq('space_id', spaceId)
      .eq('user_id', userId),

  // Update permissions for another member (admin/owner only)
  updatePermissions: (memberId, perms) =>
    supabase.from('space_members').update(perms).eq('id', memberId),

  acceptInvite: (token, userId, displayName) =>
    supabase.from('space_members')
      .update({ user_id: userId, display_name: displayName, invite_status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('invite_token', token),

  removeMember: (id) =>
    supabase.from('space_members').delete().eq('id', id),

  // ── Space transactions ──
  getView: (spaceId, userId) =>
    supabase.rpc('get_space_view', { p_space_id: spaceId, p_viewer_user_id: userId }),

  listTransactions: (spaceId) =>
    supabase.from('space_transactions')
      .select(`*, categories(name,color,icon)`)
      .eq('space_id', spaceId)
      .eq('is_active', true)
      .order('transaction_date', { ascending: false }),

  addTransaction: (data) =>
    supabase.from('space_transactions').insert(data).select().single(),

  editTransaction: (id, data) =>
    supabase.from('space_transactions')
      .update({ ...data, last_edited_at: new Date().toISOString() })
      .eq('id', id),

  deleteTransaction: (id) =>
    supabase.from('space_transactions').update({ is_active: false }).eq('id', id),

  // Link an existing personal transaction to a space
  linkTransaction: (spaceId, transactionId, addedByUserId, addedByName) =>
    supabase.from('space_transactions').insert({
      space_id: spaceId,
      transaction_id: transactionId,
      added_by_user_id: addedByUserId,
      added_by_name: addedByName,
      visible_to: 'all',
    }).select().single(),

  // ── Connected bank accounts in space ──
  getConnectedAccounts: (spaceId) =>
    supabase.from('space_connected_accounts')
      .select(`*, connected_accounts(institution_name,account_name,last_four,wallet_type,institution_type), space_members(display_name)`)
      .eq('space_id', spaceId),

  connectAccount: (data) =>
    supabase.from('space_connected_accounts').insert(data).select().single(),

  updateAccountSharing: (id, data) =>
    supabase.from('space_connected_accounts').update(data).eq('id', id),

  // ── Activity ──
  getActivity: (spaceId, limit = 30) =>
    supabase.from('space_activity')
      .select('*').eq('space_id', spaceId)
      .order('created_at', { ascending: false }).limit(limit),

  // ── Realtime ──
  subscribeToSpace: (spaceId, onTransaction, onActivity) => {
    const channel = supabase.channel(`space:${spaceId}`)
    if (onTransaction) channel.on('postgres_changes', { event: '*', schema: 'public', table: 'space_transactions', filter: `space_id=eq.${spaceId}` }, onTransaction)
    if (onActivity) channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'space_activity', filter: `space_id=eq.${spaceId}` }, onActivity)
    return channel.subscribe()
  },
}

// ─── EMAIL RECEIPTS ──────────────────────────────────────────
export const emailReceipts = {
  list: (userId, status = null) => {
    let q = supabase.from('email_receipts').select('*')
      .eq('user_id', userId).order('received_at', { ascending: false }).limit(50)
    if (status) q = q.eq('parse_status', status)
    return q
  },
  get: (id) => supabase.from('email_receipts').select('*').eq('id', id).single(),
  markReviewed: (id, receiptId, transactionId) =>
    supabase.from('email_receipts').update({ parse_status: 'parsed', receipt_id: receiptId, transaction_id: transactionId }).eq('id', id),
  delete: (id) => supabase.from('email_receipts').delete().eq('id', id),
  // Upload attachment to storage
  uploadAttachment: async (userId, emailId, file) => {
    const ext = file.name.split('.').pop()
    const path = `${userId}/email-attachments/${emailId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('receipts').upload(path, file)
    if (error) return { error }
    const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(path)
    return { url: publicUrl, path }
  },
}

// ─── LIST SCANS (photo → shopping list) ─────────────────────
export const listScans = {
  create: (data) => supabase.from('list_scans').insert(data).select().single(),
  get: (id) => supabase.from('list_scans').select('*').eq('id', id).single(),
  list: (userId) => supabase.from('list_scans').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
  update: (id, data) => supabase.from('list_scans').update(data).eq('id', id).select().single(),
  uploadImage: async (userId, file) => {
    const ext = file.name.split('.').pop()
    const path = `${userId}/list-scans/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('receipts').upload(path, file)
    if (error) return { error }
    const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(path)
    return { url: publicUrl, path }
  },
  // Convert confirmed scan to a real shopping list
  createShoppingList: async (userId, scanId, confirmedItems, listName) => {
    const { data: list } = await supabase.from('shopping_lists').insert({
      owner_id: userId, name: listName || 'Scanned List',
    }).select().single()
    if (!list) return { error: 'Failed to create list' }
    const items = confirmedItems.map((item, i) => ({
      list_id: list.id, added_by: userId,
      item_name: item.item_name, quantity: item.quantity || 1,
      unit: item.unit || null, notes: item.notes || null, position: i,
      assigned_to_user_id: userId,  // default: assigned to self
      assignment_status: 'self',
    }))
    await supabase.from('shopping_list_items').insert(items)
    await supabase.from('list_scans').update({ shopping_list_id: list.id, parse_status: 'confirmed' }).eq('id', scanId)
    return { list }
  },
}

// ─── MULTI-RECEIPT SCAN ──────────────────────────────────────
export const multiReceiptScan = {
  createSession: (data) =>
    supabase.from('multi_receipt_sessions').insert(data).select().single(),

  getSession: (id) =>
    supabase.from('multi_receipt_sessions')
      .select('*, multi_receipt_items(*)')
      .eq('id', id).single(),

  listSessions: (userId) =>
    supabase.from('multi_receipt_sessions')
      .select('*, multi_receipt_items(id,merchant_name,total_amount,review_status,receipt_date,photo_taken_at)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }).limit(20),

  addItem: (data) =>
    supabase.from('multi_receipt_items').insert(data).select().single(),

  updateItem: (id, data) =>
    supabase.from('multi_receipt_items').update(data).eq('id', id).select().single(),

  // Set who made the purchase
  setPurchaser: (id, purchaserType, purchaserUserId, purchaserName) =>
    supabase.from('multi_receipt_items').update({
      purchaser_type: purchaserType,
      purchaser_user_id: purchaserUserId || null,
      purchaser_name: purchaserName,
    }).eq('id', id),

  // Confirm item → creates receipt + transaction + links
  confirmItem: (itemId, userId) =>
    supabase.rpc('confirm_multi_receipt_item', {
      p_item_id: itemId,
      p_user_id: userId,
    }),

  confirmAll: async (sessionId, userId) => {
    const { data: session } = await supabase
      .from('multi_receipt_sessions')
      .select('multi_receipt_items(id,review_status)')
      .eq('id', sessionId).single()
    const pending = (session?.multi_receipt_items || []).filter(i => i.review_status === 'pending' || i.review_status === 'edited')
    for (const item of pending) {
      await supabase.rpc('confirm_multi_receipt_item', { p_item_id: item.id, p_user_id: userId })
    }
    await supabase.from('multi_receipt_sessions').update({ session_status: 'completed', completed_at: new Date().toISOString() }).eq('id', sessionId)
  },

  uploadImage: async (userId, sessionId, file) => {
    const ext = file.name.split('.').pop()
    const path = `${userId}/multi-receipts/${sessionId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('receipts').upload(path, file)
    if (error) return { error }
    const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(path)
    return { url: publicUrl, path }
  },
}

// ─── DASHBOARD (single RPC — replaces 3 separate queries) ────
export const dashboard = {
  getData: (userId) =>
    supabase.rpc('get_dashboard_data', {
      p_user_id: userId,
      p_year: new Date().getFullYear(),
      p_month: new Date().getMonth() + 1,
    }),
}
