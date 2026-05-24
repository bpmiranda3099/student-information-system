import { computeGrade, identifyWeakTopics, scoreToLetter } from './compute.js';

describe('computeGrade', () => {
  const studentId = 'student-1';
  const sectionId = 'section-1';

  const categoryWeights = [
    { type: 'quiz' as const, weight: 20 },
    { type: 'seatwork' as const, weight: 10 },
    { type: 'activity' as const, weight: 10 },
    { type: 'project' as const, weight: 20 },
    { type: 'exam' as const, weight: 40 },
  ];

  it('computes weighted grade with different component counts', () => {
    const components = [
      { id: 'q1', type: 'quiz' as const, maxScore: 10 },
      { id: 'q2', type: 'quiz' as const, maxScore: 10 },
      { id: 'q3', type: 'quiz' as const, maxScore: 10 },
      { id: 'e1', type: 'exam' as const, maxScore: 50 },
      { id: 'e2', type: 'exam' as const, maxScore: 50 },
    ];

    const entries = [
      { componentId: 'q1', score: 8 },
      { componentId: 'q2', score: 9 },
      { componentId: 'q3', score: 7 },
      { componentId: 'e1', score: 40 },
      { componentId: 'e2', score: 45 },
    ];

    const result = computeGrade({
      studentId,
      sectionId,
      components,
      entries,
      categoryWeights,
    });

    // Quiz avg: (80+90+70)/3 = 80, Exam avg: (80+90)/2 = 85
    // Weighted: 20*0.8 + 40*0.85 = 16 + 34 = 50 (other categories 0)
    expect(result.categoryAverages.quiz).toBe(80);
    expect(result.categoryAverages.exam).toBe(85);
    expect(result.finalScore).toBe(50);
    expect(result.letterGrade).toBe('F');
  });

  it('adds extracurricular bonus capped at max', () => {
    const components = [
      { id: 'q1', type: 'quiz' as const, maxScore: 10 },
      { id: 'x1', type: 'extracurricular' as const, maxScore: 10 },
    ];

    const entries = [
      { componentId: 'q1', score: 10 },
      { componentId: 'x1', score: 8 },
    ];

    const result = computeGrade({
      studentId,
      sectionId,
      components,
      entries,
      categoryWeights: [{ type: 'quiz', weight: 100 }],
      extracurricularMax: 5,
    });

    expect(result.extracurricularBonus).toBe(5);
    expect(result.finalScore).toBe(100);
    expect(result.letterGrade).toBe('A');
  });

  it('excludes missing items from category average denominator', () => {
    const components = [
      { id: 'q1', type: 'quiz' as const, maxScore: 10 },
      { id: 'q2', type: 'quiz' as const, maxScore: 10 },
      { id: 'q3', type: 'quiz' as const, maxScore: 10 },
    ];

    const entries = [{ componentId: 'q1', score: 10 }];

    const result = computeGrade({
      studentId,
      sectionId,
      components,
      entries,
      categoryWeights: [{ type: 'quiz', weight: 100 }],
    });

    expect(result.categoryAverages.quiz).toBe(100);
    expect(result.finalScore).toBe(100);
  });
});

describe('scoreToLetter', () => {
  it('maps scores to letter grades', () => {
    expect(scoreToLetter(95)).toBe('A');
    expect(scoreToLetter(85)).toBe('B');
    expect(scoreToLetter(77)).toBe('C');
    expect(scoreToLetter(72)).toBe('D');
    expect(scoreToLetter(65)).toBe('F');
  });
});

describe('identifyWeakTopics', () => {
  it('returns topics from components below threshold', () => {
    const components = [
      { id: 'q1', type: 'quiz' as const, maxScore: 10, topicTags: ['algebra', 'equations'] },
      { id: 'q2', type: 'quiz' as const, maxScore: 10, topicTags: ['geometry'] },
    ];

    const entries = [
      { componentId: 'q1', score: 5 },
      { componentId: 'q2', score: 9 },
    ];

    const weak = identifyWeakTopics(components, entries, 75);
    expect(weak).toContain('algebra');
    expect(weak).toContain('equations');
    expect(weak).not.toContain('geometry');
  });
});
