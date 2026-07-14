export function parseAnalysis(raw) {
  let data;
  if (typeof raw === 'string') {
    const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    try {
      data = JSON.parse(cleaned);
    } catch {
      throw new Error("Couldn't parse the analysis result — the document may be too long and got cut off. Try a shorter excerpt.");
    }
  } else {
    data = raw;
  }

  const riskScore = clamp(Number(data.riskScore ?? data.risk_score ?? 50), 0, 100);
  return {
    companyName: data.companyName || data.company_name || data.company || 'Unknown',
    documentType: data.documentType || data.document_type || 'Terms of Service',
    riskScore,
    riskLevel: normalizeRiskLevel(data.riskLevel || data.risk_level || data.overallRisk) || getRiskLevel(riskScore),
    readingTime: data.readingTime || data.reading_time || 'Unknown',
    tldr: data.tldr || data.summary || '',
    grades: normalizeGrades(data.grades || data.gradeBreakdown || data.grade_breakdown || {}),
    traps: normalizeTraps(data.traps || []),
    goodClauses: normalizeGoodClauses(data.goodClauses || data.good_clauses || []),
    comparisons: {
      betterThan: data.comparisons?.betterThan || data.comparisons?.better_than || [],
      worseThan: data.comparisons?.worseThan || data.comparisons?.worse_than || []
    }
  };
}

export function parseDetail(raw) {
  let data;
  if (typeof raw === 'string') {
    const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    try {
      data = JSON.parse(cleaned);
    } catch {
      throw new Error("Couldn't parse the deep analysis result. Please try again.");
    }
  } else {
    data = raw;
  }

  return {
    deepAnalysis: data.deepAnalysis || data.deep_analysis || data.whyMatters || data.why_matters || '',
    legalContext: data.legalContext || data.legal_context || '',
    realWorldCases: data.realWorldCases || data.real_world_cases || '',
    whatYouCanDo: normalizeList(data.whatYouCanDo || data.what_you_can_do || data.actions || []),
    optOut: normalizeOptOut(data.optOut || data.opt_out || {}),
    industryComparison: data.industryComparison || data.industry_comparison || ''
  };
}

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

function normalizeRiskLevel(val) {
  if (!val) return null;
  const s = val.toLowerCase().trim();
  if (s.includes('critical')) return 'Critical Risk';
  if (s.includes('high')) return 'High Risk';
  if (s.includes('medium') || s.includes('moderate')) return 'Medium Risk';
  if (s.includes('low')) return 'Low Risk';
  return val;
}

function getRiskLevel(score) {
  if (score <= 30) return 'Low Risk';
  if (score <= 50) return 'Medium Risk';
  if (score <= 75) return 'High Risk';
  return 'Critical Risk';
}

function normalizeGrades(g) {
  if (!g || typeof g !== 'object') return { dataPrivacy: 'C', userRights: 'C', transparency: 'C', fairness: 'C', accountability: 'C' };
  return {
    dataPrivacy: findGrade(g, ['dataPrivacy', 'data_privacy', 'Data Privacy', 'dataPrivacyGrade', 'privacy', 'Privacy']),
    userRights: findGrade(g, ['userRights', 'user_rights', 'User Rights', 'userRightsGrade', 'rights', 'Rights']),
    transparency: findGrade(g, ['transparency', 'Transparency', 'transparencyGrade']),
    fairness: findGrade(g, ['fairness', 'Fairness', 'fairnessGrade']),
    accountability: findGrade(g, ['accountability', 'Accountability', 'accountabilityGrade'])
  };
}

function findGrade(obj, candidates) {
  for (const key of candidates) {
    if (obj[key] !== undefined) return extractGrade(obj[key]);
  }
  const lowerEntries = Object.entries(obj);
  for (const candidate of candidates) {
    const lc = candidate.toLowerCase().replace(/[\s_-]/g, '');
    for (const [key, val] of lowerEntries) {
      if (key.toLowerCase().replace(/[\s_-]/g, '') === lc) return extractGrade(val);
    }
  }
  return 'C';
}

function extractGrade(val) {
  if (!val) return 'C';
  const s = String(val).toUpperCase().trim();
  return ['A', 'B', 'C', 'D', 'F'].includes(s[0]) ? s[0] : 'C';
}

function normalizeTraps(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map((t, i) => ({
    id: i,
    category: normalizeCategory(t.category),
    severity: normalizeSeverity(t.severity),
    title: t.title || 'Untitled Trap',
    quote: t.quote || t.whatTheyWrote || t.what_they_wrote || '',
    translation: t.translation || t.whatItMeans || t.what_it_means || '',
    impact: t.impact || '',
    commonality: t.commonality || t.howCommon || t.how_common || ''
  }));
}

function normalizeCategory(cat) {
  if (!cat) return 'default';
  return cat.toLowerCase().replace(/[\s_]+/g, '-');
}

function normalizeSeverity(sev) {
  if (!sev) return 'medium';
  const s = sev.toLowerCase().trim();
  return ['critical', 'high', 'medium', 'low'].includes(s) ? s : 'medium';
}

function normalizeGoodClauses(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map(g => ({
    title: g.title || 'Good Clause',
    description: g.description || '',
    quote: g.quote || ''
  }));
}

function normalizeList(val) {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') return val.split('\n').filter(Boolean);
  return [];
}

function normalizeOptOut(opt) {
  if (typeof opt === 'string') return { available: false, instructions: opt };
  return {
    available: Boolean(opt.available),
    instructions: opt.instructions || opt.details || ''
  };
}
