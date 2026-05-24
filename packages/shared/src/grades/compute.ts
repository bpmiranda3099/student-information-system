import {
  DEFAULT_EXTRACURRICULAR_MAX,
  DEFAULT_LETTER_GRADES,
  GRADED_COMPONENT_TYPES,
  type GradeComponentType,
} from '../constants.js';

export interface GradeComponentInput {
  id: string;
  type: GradeComponentType;
  maxScore: number;
  topicTags?: string[];
}

export interface GradeEntryInput {
  componentId: string;
  score: number;
}

export interface CategoryWeightInput {
  type: GradeComponentType;
  weight: number;
}

export interface ComputeGradeInput {
  studentId: string;
  sectionId: string;
  components: GradeComponentInput[];
  entries: GradeEntryInput[];
  categoryWeights: CategoryWeightInput[];
  extracurricularMax?: number;
}

export interface ComputeGradeResult {
  studentId: string;
  sectionId: string;
  categoryAverages: Record<string, number>;
  weightedSubtotal: number;
  extracurricularBonus: number;
  finalScore: number;
  letterGrade: string;
}

export function scoreToLetter(
  score: number,
  mapping = DEFAULT_LETTER_GRADES,
): string {
  for (const { letter, minScore } of mapping) {
    if (score >= minScore) return letter;
  }
  return 'F';
}

export function computeGrade(input: ComputeGradeInput): ComputeGradeResult {
  const {
    studentId,
    sectionId,
    components,
    entries,
    categoryWeights,
    extracurricularMax = DEFAULT_EXTRACURRICULAR_MAX,
  } = input;

  const entryMap = new Map(entries.map((e) => [e.componentId, e.score]));
  const categoryAverages: Record<string, number> = {};
  let weightedSubtotal = 0;

  for (const categoryType of GRADED_COMPONENT_TYPES) {
    const categoryComponents = components.filter((c) => c.type === categoryType);
    if (categoryComponents.length === 0) continue;

    const weightConfig = categoryWeights.find((w) => w.type === categoryType);
    const weight = weightConfig?.weight ?? 0;

    const percentages: number[] = [];
    for (const comp of categoryComponents) {
      const rawScore = entryMap.get(comp.id);
      if (rawScore !== undefined) {
        percentages.push((rawScore / comp.maxScore) * 100);
      }
    }

    const categoryAverage =
      percentages.length > 0
        ? percentages.reduce((a, b) => a + b, 0) / percentages.length
        : 0;

    categoryAverages[categoryType] = Math.round(categoryAverage * 100) / 100;
    weightedSubtotal += (weight * categoryAverage) / 100;
  }

  const extracurricularComponents = components.filter((c) => c.type === 'extracurricular');
  let extracurricularBonus = 0;
  for (const comp of extracurricularComponents) {
    const rawScore = entryMap.get(comp.id);
    if (rawScore !== undefined) {
      extracurricularBonus += rawScore;
    }
  }
  extracurricularBonus = Math.min(extracurricularBonus, extracurricularMax);

  const finalScore = Math.min(100, Math.round((weightedSubtotal + extracurricularBonus) * 100) / 100);
  const letterGrade = scoreToLetter(finalScore);

  return {
    studentId,
    sectionId,
    categoryAverages,
    weightedSubtotal: Math.round(weightedSubtotal * 100) / 100,
    extracurricularBonus,
    finalScore,
    letterGrade,
  };
}

export function identifyWeakTopics(
  components: GradeComponentInput[],
  entries: GradeEntryInput[],
  threshold = 75,
): string[] {
  const entryMap = new Map(entries.map((e) => [e.componentId, e.score]));
  const weakTopics = new Set<string>();

  for (const comp of components) {
    if (comp.type === 'extracurricular') continue;
    const rawScore = entryMap.get(comp.id);
    if (rawScore === undefined) continue;

    const percentage = (rawScore / comp.maxScore) * 100;
    if (percentage < threshold) {
      for (const tag of comp.topicTags ?? []) {
        weakTopics.add(tag);
      }
    }
  }

  return Array.from(weakTopics);
}
