// ============================================
// Bid Service — Production-grade
// All Supabase queries for the bidding/priority-list flow:
// bid_requests, bid_candidates, and the sequential-dispatch logic that
// activates one candidate at a time in priority order.
// ============================================

import { supabase } from '../lib/supabase';
import { sendNotification } from '../lib/notifications';
import type { BidRequest, BidCandidate, BidCandidateStatus, ConsultantCategory, Project } from '../types';

export interface MatchedConsultant {
  id: string;        // consultant_profiles.id
  user_id: string;
  display_name: string;
  code: string;
  avatar_url: string | null;
  base_price: number | null;
  category: ConsultantCategory;
}

export interface BidCandidateWithConsultant extends BidCandidate {
  consultant_profiles?: {
    display_name: string;
    code: string;
    avatar_url: string | null;
    user_id: string;
  } | null;
}

export interface BidCandidateWithRequest extends BidCandidate {
  bid_requests?: {
    assignment_brief: string;
    event_date: string | null;
    budget: number;
    client_id: string;
    profiles?: { name: string } | null;
  } | null;
}

const PRICE_BAND = 0.2; // ±20% of quoted budget, per spec

// ─── Create + match ──────────────────────────────────────────

export async function createBidRequest(input: {
  client_id: string;
  category: ConsultantCategory;
  /** Concrete deliverable, e.g. "Logo Design". Becomes the assignment title. */
  creative_item: string;
  assignment_brief: string;
  event_date: string | null;
  budget: number;
}): Promise<BidRequest> {
  let { data, error } = await supabase
    .from('bid_requests')
    .insert(input)
    .select()
    .single();

  // Tolerate a database that has not taken 20260826120100 yet. A client should
  // not be unable to post a bid because a migration is lagging behind a build;
  // they lose the pre-set title, and getAssignmentTitle() falls back to the
  // brief, which is strictly better than a dead submit button.
  if (error && error.message.includes('creative_item')) {
    console.warn(
      '[BidService] bid_requests.creative_item is missing — apply migration ' +
      '20260826120100_add_bid_creative_item. Posting without the title for now.',
    );
    const { creative_item: _omitted, ...withoutItem } = input;
    ({ data, error } = await supabase
      .from('bid_requests')
      .insert(withoutItem)
      .select()
      .single());
  }

  if (error) {
    console.error('[BidService] createBidRequest error:', error.message);
    throw new Error(error.message);
  }
  return data as BidRequest;
}

/**
 * Consultants in `category`, priced within ±20% of `budget`, and free on
 * `eventDate` (checked via the batched availability RPC — one round trip,
 * not one per candidate).
 */
export async function findMatchingConsultants(
  category: ConsultantCategory,
  budget: number,
  eventDate: string | null,
): Promise<MatchedConsultant[]> {
  const low = Math.floor(budget * (1 - PRICE_BAND));
  const high = Math.ceil(budget * (1 + PRICE_BAND));

  const { data, error } = await supabase
    .from('consultant_profiles')
    .select('id, user_id, display_name, code, avatar_url, base_price, category')
    .eq('category', category)
    .eq('is_approved', true)
    .eq('is_active', true)
    .gte('base_price', low)
    .lte('base_price', high)
    .order('base_price', { ascending: true })
    .limit(20);

  if (error) {
    console.error('[BidService] findMatchingConsultants error:', error.message);
    throw new Error(error.message);
  }

  const candidates = (data ?? []) as MatchedConsultant[];
  if (!eventDate || candidates.length === 0) return candidates;

  const { data: taken, error: takenErr } = await supabase.rpc('get_taken_dates_for_consultants', {
    p_consultant_user_ids: candidates.map(c => c.user_id),
  });
  if (takenErr) {
    console.warn('[BidService] availability check failed, showing all matches:', takenErr.message);
    return candidates;
  }

  const busyUserIds = new Set(
    (taken ?? [])
      .filter((row: any) => row.taken_date === eventDate)
      .map((row: any) => row.consultant_user_id)
  );
  return candidates.filter(c => !busyUserIds.has(c.user_id));
}

// ─── Priority list submission ────────────────────────────────

export async function submitBidPriorityList(
  bidRequestId: string,
  ranked: { consultantId: string; consultantUserId: string; quotedPrice: number }[],
): Promise<void> {
  if (ranked.length === 0) throw new Error('Select at least one consultant.');

  const rows = ranked.map((r, i) => ({
    bid_request_id: bidRequestId,
    consultant_id: r.consultantId,
    priority_rank: i + 1,
    quoted_price: r.quotedPrice,
    status: (i === 0 ? 'pending' : 'queued') as BidCandidateStatus,
  }));

  const { error } = await supabase.from('bid_candidates').insert(rows);
  if (error) {
    console.error('[BidService] submitBidPriorityList error:', error.message);
    throw new Error(error.message);
  }

  sendNotification({
    userId: ranked[0].consultantUserId,
    title: 'New Bid Request',
    message: `A client wants a quote — quoted price ₹${ranked[0].quotedPrice.toLocaleString('en-IN')}.`,
    type: 'assignment',
  });
}

// ─── Client-facing reads ─────────────────────────────────────

/** A client's own bid requests, most recent first — so they can revisit one in progress. */
export async function fetchClientBidRequests(clientId: string): Promise<BidRequest[]> {
  const { data, error } = await supabase
    .from('bid_requests')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[BidService] fetchClientBidRequests error:', error.message);
    throw new Error(error.message);
  }
  return (data ?? []) as BidRequest[];
}

export async function fetchBidCandidates(bidRequestId: string): Promise<BidCandidateWithConsultant[]> {
  const { data, error } = await supabase
    .from('bid_candidates')
    .select('*, consultant_profiles(display_name, code, avatar_url, user_id)')
    .eq('bid_request_id', bidRequestId)
    .order('priority_rank', { ascending: true });

  if (error) {
    console.error('[BidService] fetchBidCandidates error:', error.message);
    throw new Error(error.message);
  }
  return (data ?? []) as BidCandidateWithConsultant[];
}

// ─── Consultant-facing reads ──────────────────────────────────

export async function fetchConsultantBidInbox(consultantProfileId: string): Promise<BidCandidateWithRequest[]> {
  const { data, error } = await supabase
    .from('bid_candidates')
    .select('*, bid_requests(assignment_brief, event_date, budget, client_id, profiles!client_id(name))')
    .eq('consultant_id', consultantProfileId)
    .in('status', ['pending', 'negotiating'])
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[BidService] fetchConsultantBidInbox error:', error.message);
    throw new Error(error.message);
  }
  return (data ?? []) as BidCandidateWithRequest[];
}

/** Live state of a single bid candidate — for the negotiation chat handshake. */
export async function fetchBidCandidateById(id: string): Promise<Pick<
  BidCandidate, 'id' | 'quoted_price' | 'offer_by' | 'status'
> | null> {
  const { data, error } = await supabase
    .from('bid_candidates')
    .select('id, quoted_price, offer_by, status')
    .eq('id', id)
    .maybeSingle();
  if (error) {
    console.error('[BidService] fetchBidCandidateById error:', error.message);
    return null;
  }
  return data as any;
}

// ─── Sequential dispatch / decisions ──────────────────────────

async function fetchCandidate(bidCandidateId: string): Promise<BidCandidate> {
  const { data, error } = await supabase
    .from('bid_candidates')
    .select('*')
    .eq('id', bidCandidateId)
    .single();
  if (error || !data) throw new Error(error?.message || 'Bid candidate not found');
  return data as BidCandidate;
}

/**
 * Consultant accepts — creates the real project (same insert shape as
 * BookConsultantScreen's direct-hire path), closes out the bid, skips
 * every sibling candidate.
 */
export async function acceptBidCandidate(bidCandidateId: string): Promise<Project> {
  const candidate = await fetchCandidate(bidCandidateId);
  if (!['pending', 'negotiating'].includes(candidate.status)) {
    throw new Error(`Cannot accept a candidate in status "${candidate.status}".`);
  }

  const { data: bidRequest, error: brErr } = await supabase
    .from('bid_requests')
    .select('*')
    .eq('id', candidate.bid_request_id)
    .single();
  if (brErr || !bidRequest) throw new Error(brErr?.message || 'Bid request not found');

  const { data: consultantProfile, error: cpErr } = await supabase
    .from('consultant_profiles')
    .select('user_id')
    .eq('id', candidate.consultant_id)
    .single();
  if (cpErr || !consultantProfile) throw new Error(cpErr?.message || 'Consultant not found');

  // The price was already agreed during the bid handshake (one side proposed
  // `quoted_price`, the other is accepting it here), so the project is born
  // past negotiation, at advance_pending — no redundant "Accept Project" on
  // the consultant's Project Dashboard.
  const categoryLabel = bidRequest.category.charAt(0).toUpperCase() + bidRequest.category.slice(1);
  const { data: project, error: projErr } = await supabase
    .from('projects')
    .insert({
      client_id: bidRequest.client_id,
      consultant_id: consultantProfile.user_id,
      assignment_type: `Hire ${categoryLabel}`,
      // Carry the client's creative item through as the assignment title.
      // Older bid rows predate the column and stay null; getAssignmentTitle()
      // degrades to the brief for those.
      assignment_details: bidRequest.creative_item ? [bidRequest.creative_item] : null,
      assignment_brief: bidRequest.assignment_brief,
      budget: candidate.quoted_price,
      event_date: bidRequest.event_date,
      status: 'advance_pending',
      progress_percent: 0,
      work_order_data: null,
      final_offer: candidate.quoted_price,
      offer_by: candidate.offer_by,
      price_agreed: true,
    })
    .select()
    .single();
  if (projErr) throw new Error(projErr.message);

  await supabase.from('bid_candidates').update({ status: 'accepted', project_id: project.id, updated_at: new Date().toISOString() }).eq('id', candidate.id);
  await supabase.from('bid_candidates')
    .update({ status: 'skipped', updated_at: new Date().toISOString() })
    .eq('bid_request_id', candidate.bid_request_id)
    .neq('id', candidate.id)
    .in('status', ['queued', 'pending', 'negotiating']);
  await supabase.from('bid_requests').update({ status: 'fulfilled', updated_at: new Date().toISOString() }).eq('id', candidate.bid_request_id);

  // Notify whoever did NOT just accept (the other side of the handshake).
  const priceLabel = `₹${Number(candidate.quoted_price).toLocaleString('en-IN')}`;
  if (candidate.offer_by === 'consultant') {
    // Client accepted the consultant's counter-offer.
    sendNotification({
      userId: consultantProfile.user_id,
      title: 'Offer Accepted!',
      message: `The client accepted your ${priceLabel} offer. They'll pay the advance to begin.`,
      type: 'assignment',
    });
  } else {
    // Consultant accepted the client's price.
    sendNotification({
      userId: bidRequest.client_id,
      title: 'Bid Accepted!',
      message: `Your consultant accepted at ${priceLabel}. Pay the advance to start the project.`,
      type: 'assignment',
    });
  }

  return project as Project;
}

/**
 * Consultant rejects (or negotiation ends in decline) — marks this
 * candidate declined and activates the next one in priority order.
 */
export async function declineBidCandidate(bidCandidateId: string): Promise<void> {
  const candidate = await fetchCandidate(bidCandidateId);

  await supabase.from('bid_candidates')
    .update({ status: 'declined', updated_at: new Date().toISOString() })
    .eq('id', candidate.id);

  const { data: next, error: nextErr } = await supabase
    .from('bid_candidates')
    .select('*, consultant_profiles(user_id)')
    .eq('bid_request_id', candidate.bid_request_id)
    .eq('status', 'queued')
    .order('priority_rank', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (nextErr) {
    console.error('[BidService] declineBidCandidate next-lookup error:', nextErr.message);
  }

  const { data: bidRequest } = await supabase
    .from('bid_requests')
    .select('client_id, budget')
    .eq('id', candidate.bid_request_id)
    .single();

  if (!next) {
    await supabase.from('bid_requests').update({ status: 'unfulfilled', updated_at: new Date().toISOString() }).eq('id', candidate.bid_request_id);
    if (bidRequest) {
      sendNotification({
        userId: bidRequest.client_id,
        title: 'No Consultant Available',
        message: 'Everyone on your priority list declined. Try a new bid with a different budget or category.',
        type: 'system',
      });
    }
    return;
  }

  await supabase.from('bid_candidates')
    .update({ status: 'pending', updated_at: new Date().toISOString() })
    .eq('id', next.id);

  const nextUserId = (next as any).consultant_profiles?.user_id;
  if (nextUserId) {
    sendNotification({
      userId: nextUserId,
      title: 'New Bid Request',
      message: `A client wants a quote — quoted price ₹${Number(next.quoted_price).toLocaleString('en-IN')}.`,
      type: 'assignment',
    });
  }
  if (bidRequest) {
    sendNotification({
      userId: bidRequest.client_id,
      title: 'Moving to Next Consultant',
      message: 'Your previous choice declined — we\'ve moved to the next consultant on your list.',
      type: 'system',
    });
  }
}

export async function proposeNegotiation(bidCandidateId: string): Promise<void> {
  const { error } = await supabase
    .from('bid_candidates')
    .update({ status: 'negotiating', updated_at: new Date().toISOString() })
    .eq('id', bidCandidateId);
  if (error) throw new Error(error.message);
}

/**
 * Counter the price on a bid candidate (either side). Replaces the current
 * quoted price, records who proposed it, and keeps the candidate in
 * 'negotiating' so the other party sees an Accept/Counter prompt.
 */
export async function counterBidPrice(
  bidCandidateId: string,
  price: number,
  by: 'client' | 'consultant',
): Promise<void> {
  if (!(price > 0)) throw new Error('Enter a valid amount.');
  const { error } = await supabase
    .from('bid_candidates')
    .update({ quoted_price: price, offer_by: by, status: 'negotiating', updated_at: new Date().toISOString() })
    .eq('id', bidCandidateId);
  if (error) throw new Error(error.message);

  // Notify the other party that a new number is on the table.
  const { data: cand } = await supabase
    .from('bid_candidates')
    .select('bid_request_id, consultant_id, bid_requests(client_id), consultant_profiles(user_id)')
    .eq('id', bidCandidateId)
    .single();
  const priceLabel = `₹${price.toLocaleString('en-IN')}`;
  if (by === 'consultant') {
    const clientId = (cand as any)?.bid_requests?.client_id;
    if (clientId) sendNotification({ userId: clientId, title: 'New Counter-Offer', message: `Your consultant countered at ${priceLabel}. Accept or counter back.`, type: 'assignment' });
  } else {
    const consultantUserId = (cand as any)?.consultant_profiles?.user_id;
    if (consultantUserId) sendNotification({ userId: consultantUserId, title: 'New Counter-Offer', message: `The client countered at ${priceLabel}. Accept or counter back.`, type: 'assignment' });
  }
}
