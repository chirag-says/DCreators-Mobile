// ============================================
// Consultant profile field vocabularies
//
// Shared so the two screens that write consultant_profiles.experience agree.
// They used to disagree: EditConsultantProfileScreen wrote a fixed
// "5-10 years" from a dropdown, CreateCreatorAccountScreen wrote whatever was
// typed into a free-text box ("5", "five", "5 yrs"). Display code therefore
// had no way to know whether a value already carried its unit, and the
// profile screen appended one anyway — "5-10 years Years Experience".
// ============================================

/**
 * Stored verbatim in consultant_profiles.experience. The unit is part of the
 * value, so display sites render it bare and never append "Years".
 */
export const EXPERIENCE_OPTIONS: string[] = ['1-3 years', '3-5 years', '5-10 years', '10+ years'];
