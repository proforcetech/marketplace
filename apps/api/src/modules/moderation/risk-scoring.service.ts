/**
 * Risk Scoring Engine
 *
 * Computes dynamic risk scores for accounts and listings based on multiple signals.
 * Scores range from 0 (low risk) to 100 (high risk) and drive automated moderation
 * decisions (auto-approve, hold-for-review, auto-reject).
 *
 * Architecture:
 * - Each signal is an independent scorer that returns a weight
 * - Signals are evaluated in parallel for performance
 * - The composite score is the sum of all signal weights, capped at 100
 * - Scores are cached in Redis with a short TTL (recalculated on significant events)
 *
 * Signal categories:
 * 1. Account signals: trust level, verification, history, behavior
 * 2. Listing signals: content analysis, pricing, media analysis
 * 3. Behavioral signals: velocity, patterns, device fingerprint
 *
 * Performance: Target < 50ms for full score calculation (excluding media analysis,
 * which runs async). Most signals are O(1) Redis lookups or in-memory computations.
 */

import { Injectable, Logger } from '@nestjs/common';
import { securityConfig } from '../../config/security.config';

// ─── Types ────────────────────────────────────────────────────

export interface AccountSignals {
  /** Account age in hours */
  accountAgeHours: number;
  /** Whether phone is verified */
  phoneVerified: boolean;
  /** Whether Stripe Identity is verified */
  identityVerified: boolean;
  /** Email domain (for disposable email detection) */
  emailDomain: string;
  /** Number of listings created in the last hour */
  postingVelocityLastHour: number;
  /** Normal posting rate for this trust level (per hour) */
  normalPostingRatePerHour: number;
  /** Number of reports received in the last 7 days */
  reportCount7d: number;
  /** Whether the device fingerprint is shared with a banned account */
  deviceSharedWithBanned: boolean;
  /** Whether the device fingerprint is shared with a flagged account */
  deviceSharedWithFlagged: boolean;
  /** Whether the user is connecting via VPN/proxy */
  vpnDetected: boolean;
  /** Whether it's a datacenter IP (stronger signal than residential VPN) */
  datacenterIp: boolean;
  /** Distance in miles between IP geolocation and listing location */
  ipToListingDistanceMiles: number | null;
  /** Whether IP is in a different country than the listing */
  ipDifferentCountry: boolean;
  /** Outbound messages in last 24 hours */
  outboundMessages24h: number;
  /** Unique conversations initiated in last 24 hours */
  conversationsInitiated24h: number;
  /** Reply rate on initiated conversations (0-1) */
  replyRate: number;
  /** Whether copy-paste messaging pattern detected */
  copyPasteMessaging: boolean;
}

export interface ListingSignals {
  /** Simhash similarity score with the most similar listing from a different account (0-1) */
  maxCrossAccountSimilarity: number;
  /** Simhash similarity score with the most similar listing from the same account (0-1) */
  maxSameAccountSimilarity: number;
  /** Whether a direct prohibited keyword match was found */
  prohibitedKeywordMatch: boolean;
  /** Whether a fuzzy prohibited keyword match was found */
  prohibitedKeywordFuzzyMatch: boolean;
  /** Whether coded language patterns were detected */
  codedLanguageDetected: boolean;
  /** Ratio of listing price to category median (e.g., 0.2 means 20% of median) */
  priceToMedianRatio: number | null;
  /** Whether the listing matches a known spam template */
  templateMatch: boolean;
  /** Whether the listing media matches a known-bad image hash */
  knownBadMediaMatch: boolean;
  /** NSFW classifier score (0-1) */
  nsfwScore: number;
  /** Whether contact info (phone, email, external app) was found in text */
  contactInfoInText: boolean;
  /** Current trust level of the poster (0-5) */
  posterTrustLevel: number;
}

export interface RiskSignalResult {
  /** Signal name (for explainability in moderation queue) */
  name: string;
  /** Signal category for grouping */
  category: 'account' | 'listing' | 'behavioral';
  /** Weight contributed to the total score */
  weight: number;
  /** Human-readable description for moderators */
  description: string;
}

export interface RiskScoreResult {
  /** Composite risk score (0-100) */
  score: number;
  /** Individual signal results for explainability */
  signals: RiskSignalResult[];
  /** Recommended action based on score thresholds */
  recommendation: 'auto_approve' | 'async_review' | 'hold_for_review' | 'auto_reject' | 'auto_reject_escalate';
  /** Timestamp of calculation */
  calculatedAt: string;
}

// ─── Disposable Email Domains ─────────────────────────────────

/**
 * Partial list of common disposable email domains.
 * In production, use a maintained database (e.g., disposable-email-domains npm package)
 * loaded into a Set for O(1) lookup.
 */
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'mailinator.com',
  'guerrillamail.com',
  'tempmail.com',
  'throwaway.email',
  'yopmail.com',
  'maildrop.cc',
  'trashmail.com',
  'fakeinbox.com',
  'sharklasers.com',
  'guerrillamailblock.com',
  'grr.la',
  'dispostable.com',
  'mailnesia.com',
  'tempr.email',
  'temp-mail.org',
  '10minutemail.com',
  'mohmal.com',
  'mailcatch.com',
  'burnermail.io',
]);

// ─── Signal Evaluators ────────────────────────────────────────

/**
 * Each evaluator is a pure function that takes signal data and returns a weight.
 * This makes signals independently testable and composable.
 */

function evaluateAccountAge(ageHours: number): RiskSignalResult | null {
  // Accounts < 48 hours old get a risk penalty.
  // Logarithmic decay: high penalty for very new accounts, approaching 0 at 30 days.
  if (ageHours >= 720) {
    // > 30 days: no penalty
    return null;
  }

  let weight: number;
  if (ageHours < 24) {
    weight = 5;
  } else if (ageHours < 48) {
    weight = 4;
  } else if (ageHours < 168) {
    // < 7 days
    weight = 3;
  } else if (ageHours < 336) {
    // < 14 days
    weight = 2;
  } else {
    weight = 1;
  }

  return {
    name: 'account_age',
    category: 'account',
    weight,
    description: `Account is ${Math.floor(ageHours / 24)} days old`,
  };
}

function evaluatePhoneVerification(verified: boolean): RiskSignalResult | null {
  if (verified) {
    return {
      name: 'phone_verified',
      category: 'account',
      weight: -10,
      description: 'Phone number is verified',
    };
  }
  return null;
}

function evaluateIdentityVerification(verified: boolean): RiskSignalResult | null {
  if (verified) {
    return {
      name: 'identity_verified',
      category: 'account',
      weight: -15,
      description: 'Stripe Identity verified',
    };
  }
  return null;
}

function evaluateEmailDomain(domain: string): RiskSignalResult | null {
  if (DISPOSABLE_EMAIL_DOMAINS.has(domain.toLowerCase())) {
    return {
      name: 'disposable_email',
      category: 'account',
      weight: 5,
      description: `Disposable email domain: ${domain}`,
    };
  }
  return null;
}

function evaluatePostingVelocity(
  currentRate: number,
  normalRate: number,
): RiskSignalResult | null {
  if (normalRate === 0) {
    // No baseline yet; any posting from a trust level 0 user is inherently limited
    return currentRate > 0
      ? {
          name: 'posting_velocity',
          category: 'behavioral',
          weight: 5,
          description: `Posting from restricted trust level`,
        }
      : null;
  }

  const ratio = currentRate / normalRate;
  if (ratio <= 2) {
    return null;
  }

  const weight = ratio >= 5 ? 20 : 10;
  return {
    name: 'posting_velocity',
    category: 'behavioral',
    weight,
    description: `Posting at ${ratio.toFixed(1)}x normal rate`,
  };
}

function evaluateReportCount(count: number): RiskSignalResult | null {
  if (count === 0) return null;

  let weight: number;
  if (count >= 3) {
    weight = 25;
  } else if (count >= 2) {
    weight = 10;
  } else {
    weight = 5;
  }

  return {
    name: 'report_count_7d',
    category: 'account',
    weight,
    description: `${count} report(s) in the last 7 days`,
  };
}

function evaluateDeviceFingerprint(
  sharedWithBanned: boolean,
  sharedWithFlagged: boolean,
): RiskSignalResult | null {
  if (sharedWithBanned) {
    return {
      name: 'device_fingerprint_banned',
      category: 'account',
      weight: 20,
      description: 'Device fingerprint shared with a banned account',
    };
  }
  if (sharedWithFlagged) {
    return {
      name: 'device_fingerprint_flagged',
      category: 'account',
      weight: 10,
      description: 'Device fingerprint shared with a flagged account',
    };
  }
  return null;
}

function evaluateVpnProxy(
  vpnDetected: boolean,
  datacenterIp: boolean,
): RiskSignalResult | null {
  if (datacenterIp) {
    return {
      name: 'datacenter_ip',
      category: 'account',
      weight: 10,
      description: 'Request originates from a datacenter IP',
    };
  }
  if (vpnDetected) {
    return {
      name: 'vpn_detected',
      category: 'account',
      weight: 5,
      description: 'Request originates from a known VPN/proxy',
    };
  }
  return null;
}

function evaluateGeoAnomaly(
  distanceMiles: number | null,
  differentCountry: boolean,
): RiskSignalResult | null {
  if (differentCountry) {
    return {
      name: 'geo_anomaly_country',
      category: 'account',
      weight: 15,
      description: 'IP geolocation is in a different country than the listing',
    };
  }
  if (distanceMiles !== null && distanceMiles > 500) {
    return {
      name: 'geo_anomaly_distance',
      category: 'account',
      weight: 10,
      description: `IP is ${Math.round(distanceMiles)} miles from listing location`,
    };
  }
  return null;
}

function evaluateMessageBehavior(
  outbound24h: number,
  conversationsInitiated24h: number,
  replyRate: number,
  copyPaste: boolean,
): RiskSignalResult | null {
  const signals: RiskSignalResult[] = [];

  if (
    conversationsInitiated24h > 20 &&
    replyRate < 0.1
  ) {
    signals.push({
      name: 'low_reply_rate',
      category: 'behavioral',
      weight: 10,
      description: `High outbound volume (${conversationsInitiated24h} convos) with low reply rate (${(replyRate * 100).toFixed(0)}%)`,
    });
  }

  if (copyPaste) {
    signals.push({
      name: 'copy_paste_messaging',
      category: 'behavioral',
      weight: 15,
      description: 'Copy-paste messaging pattern detected',
    });
  }

  // Return the highest-weight signal (don't double-count message behavior)
  if (signals.length === 0) return null;
  return signals.reduce((a, b) => (a.weight > b.weight ? a : b));
}

// ─── Listing-Level Signal Evaluators ──────────────────────────

function evaluateTextSimilarity(
  crossAccountSim: number,
  sameAccountSim: number,
): RiskSignalResult | null {
  if (crossAccountSim > 0.8) {
    return {
      name: 'cross_account_similarity',
      category: 'listing',
      weight: 15,
      description: `Listing text is ${(crossAccountSim * 100).toFixed(0)}% similar to another account's listing`,
    };
  }
  if (sameAccountSim > 0.8) {
    return {
      name: 'same_account_similarity',
      category: 'listing',
      weight: 10,
      description: `Listing text is ${(sameAccountSim * 100).toFixed(0)}% similar to another listing from this account`,
    };
  }
  return null;
}

function evaluateProhibitedKeywords(
  directMatch: boolean,
  fuzzyMatch: boolean,
): RiskSignalResult | null {
  if (directMatch) {
    return {
      name: 'prohibited_keyword_direct',
      category: 'listing',
      weight: 25,
      description: 'Direct match against prohibited keyword list',
    };
  }
  if (fuzzyMatch) {
    return {
      name: 'prohibited_keyword_fuzzy',
      category: 'listing',
      weight: 15,
      description: 'Fuzzy match against prohibited keyword list (possible evasion)',
    };
  }
  return null;
}

function evaluateCodedLanguage(detected: boolean): RiskSignalResult | null {
  if (detected) {
    return {
      name: 'coded_language',
      category: 'listing',
      weight: 20,
      description: 'Known coded language patterns detected',
    };
  }
  return null;
}

function evaluatePriceAnomaly(priceToMedianRatio: number | null): RiskSignalResult | null {
  if (priceToMedianRatio === null) return null;

  if (priceToMedianRatio < 0.3) {
    return {
      name: 'price_anomaly_low',
      category: 'listing',
      weight: 15,
      description: `Price is ${(priceToMedianRatio * 100).toFixed(0)}% of category median (suspiciously low)`,
    };
  }
  if (priceToMedianRatio > 3.0) {
    return {
      name: 'price_anomaly_high',
      category: 'listing',
      weight: 5,
      description: `Price is ${(priceToMedianRatio * 100).toFixed(0)}% of category median (unusually high)`,
    };
  }
  return null;
}

function evaluateTemplateMatch(isMatch: boolean): RiskSignalResult | null {
  if (isMatch) {
    return {
      name: 'template_match',
      category: 'listing',
      weight: 10,
      description: 'Listing matches a known spam template structure',
    };
  }
  return null;
}

function evaluateKnownBadMedia(isMatch: boolean): RiskSignalResult | null {
  if (isMatch) {
    return {
      name: 'known_bad_media',
      category: 'listing',
      weight: 25,
      description: 'Media matches a known-bad image hash',
    };
  }
  return null;
}

function evaluateNsfwScore(score: number): RiskSignalResult | null {
  if (score > 0.8) {
    return {
      name: 'nsfw_score_high',
      category: 'listing',
      weight: 25,
      description: `NSFW classifier score: ${(score * 100).toFixed(0)}%`,
    };
  }
  if (score > 0.3) {
    return {
      name: 'nsfw_score_moderate',
      category: 'listing',
      weight: 10,
      description: `NSFW classifier score: ${(score * 100).toFixed(0)}% (borderline)`,
    };
  }
  return null;
}

function evaluateContactInfoInText(
  detected: boolean,
  trustLevel: number,
): RiskSignalResult | null {
  if (!detected) return null;

  // Higher penalty for lower trust levels (more likely to be spam/scam)
  const weight = trustLevel <= 2 ? 10 : 5;
  return {
    name: 'contact_info_in_text',
    category: 'listing',
    weight,
    description: 'Contact information detected in listing text',
  };
}

// ─── Risk Scoring Service ─────────────────────────────────────

@Injectable()
export class RiskScoringService {
  private readonly logger = new Logger(RiskScoringService.name);
  private readonly thresholds = securityConfig.riskThresholds;

  /**
   * Calculate the composite risk score for a listing submission.
   * Evaluates both account-level and listing-level signals.
   *
   * @param accountSignals - Account-level risk signals
   * @param listingSignals - Listing-level risk signals
   * @returns Risk score result with recommendation
   */
  calculateListingRiskScore(
    accountSignals: AccountSignals,
    listingSignals: ListingSignals,
  ): RiskScoreResult {
    const results: RiskSignalResult[] = [];

    // ── Account Signals ──────────────────────────────────────
    this.addIfPresent(results, evaluateAccountAge(accountSignals.accountAgeHours));
    this.addIfPresent(results, evaluatePhoneVerification(accountSignals.phoneVerified));
    this.addIfPresent(results, evaluateIdentityVerification(accountSignals.identityVerified));
    this.addIfPresent(results, evaluateEmailDomain(accountSignals.emailDomain));
    this.addIfPresent(
      results,
      evaluatePostingVelocity(
        accountSignals.postingVelocityLastHour,
        accountSignals.normalPostingRatePerHour,
      ),
    );
    this.addIfPresent(results, evaluateReportCount(accountSignals.reportCount7d));
    this.addIfPresent(
      results,
      evaluateDeviceFingerprint(
        accountSignals.deviceSharedWithBanned,
        accountSignals.deviceSharedWithFlagged,
      ),
    );
    this.addIfPresent(
      results,
      evaluateVpnProxy(accountSignals.vpnDetected, accountSignals.datacenterIp),
    );
    this.addIfPresent(
      results,
      evaluateGeoAnomaly(
        accountSignals.ipToListingDistanceMiles,
        accountSignals.ipDifferentCountry,
      ),
    );
    this.addIfPresent(
      results,
      evaluateMessageBehavior(
        accountSignals.outboundMessages24h,
        accountSignals.conversationsInitiated24h,
        accountSignals.replyRate,
        accountSignals.copyPasteMessaging,
      ),
    );

    // ── Listing Signals ──────────────────────────────────────
    this.addIfPresent(
      results,
      evaluateTextSimilarity(
        listingSignals.maxCrossAccountSimilarity,
        listingSignals.maxSameAccountSimilarity,
      ),
    );
    this.addIfPresent(
      results,
      evaluateProhibitedKeywords(
        listingSignals.prohibitedKeywordMatch,
        listingSignals.prohibitedKeywordFuzzyMatch,
      ),
    );
    this.addIfPresent(results, evaluateCodedLanguage(listingSignals.codedLanguageDetected));
    this.addIfPresent(results, evaluatePriceAnomaly(listingSignals.priceToMedianRatio));
    this.addIfPresent(results, evaluateTemplateMatch(listingSignals.templateMatch));
    this.addIfPresent(results, evaluateKnownBadMedia(listingSignals.knownBadMediaMatch));
    this.addIfPresent(results, evaluateNsfwScore(listingSignals.nsfwScore));
    this.addIfPresent(
      results,
      evaluateContactInfoInText(
        listingSignals.contactInfoInText,
        listingSignals.posterTrustLevel,
      ),
    );

    // ── Compute Composite Score ──────────────────────────────
    const rawScore = results.reduce((sum, signal) => sum + signal.weight, 0);
    // Clamp to [0, 100]. Negative scores (from verification bonuses) floor at 0.
    const score = Math.max(0, Math.min(100, rawScore));

    const recommendation = this.getRecommendation(score);

    const result: RiskScoreResult = {
      score,
      signals: results,
      recommendation,
      calculatedAt: new Date().toISOString(),
    };

    // Log high-risk scores for monitoring dashboards
    if (score >= this.thresholds.holdForReviewMax) {
      this.logger.warn(
        `High risk score: ${score}, recommendation: ${recommendation}, ` +
          `signals: [${results.map((s) => `${s.name}(${s.weight})`).join(', ')}]`,
      );
    }

    return result;
  }

  /**
   * Calculate a standalone account risk score (for account-level actions
   * like message rate limiting or CAPTCHA triggers).
   */
  calculateAccountRiskScore(signals: AccountSignals): RiskScoreResult {
    const results: RiskSignalResult[] = [];

    this.addIfPresent(results, evaluateAccountAge(signals.accountAgeHours));
    this.addIfPresent(results, evaluatePhoneVerification(signals.phoneVerified));
    this.addIfPresent(results, evaluateIdentityVerification(signals.identityVerified));
    this.addIfPresent(results, evaluateEmailDomain(signals.emailDomain));
    this.addIfPresent(
      results,
      evaluatePostingVelocity(signals.postingVelocityLastHour, signals.normalPostingRatePerHour),
    );
    this.addIfPresent(results, evaluateReportCount(signals.reportCount7d));
    this.addIfPresent(
      results,
      evaluateDeviceFingerprint(signals.deviceSharedWithBanned, signals.deviceSharedWithFlagged),
    );
    this.addIfPresent(results, evaluateVpnProxy(signals.vpnDetected, signals.datacenterIp));
    this.addIfPresent(
      results,
      evaluateGeoAnomaly(signals.ipToListingDistanceMiles, signals.ipDifferentCountry),
    );
    this.addIfPresent(
      results,
      evaluateMessageBehavior(
        signals.outboundMessages24h,
        signals.conversationsInitiated24h,
        signals.replyRate,
        signals.copyPasteMessaging,
      ),
    );

    const rawScore = results.reduce((sum, signal) => sum + signal.weight, 0);
    const score = Math.max(0, Math.min(100, rawScore));

    return {
      score,
      signals: results,
      recommendation: this.getRecommendation(score),
      calculatedAt: new Date().toISOString(),
    };
  }

  /**
   * Map a risk score to a moderation recommendation.
   */
  private getRecommendation(
    score: number,
  ): RiskScoreResult['recommendation'] {
    if (score <= this.thresholds.autoApproveMax) {
      return 'auto_approve';
    }
    if (score <= this.thresholds.asyncReviewMax) {
      return 'async_review';
    }
    if (score <= this.thresholds.holdForReviewMax) {
      return 'hold_for_review';
    }
    if (score <= this.thresholds.autoRejectMax) {
      return 'auto_reject';
    }
    return 'auto_reject_escalate';
  }

  private addIfPresent(
    results: RiskSignalResult[],
    signal: RiskSignalResult | null,
  ): void {
    if (signal !== null) {
      results.push(signal);
    }
  }
}
