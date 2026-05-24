# Grade Computation Formula

Shared engine: `packages/shared/src/grades/compute.ts`

## Steps

1. **Category average** = mean of scored items per category (quiz, seatwork, activity, project, exam)
2. **Weighted subtotal** = Σ (category_weight × category_average / 100)
3. **Extracurricular bonus** = sum of extracurricular scores, capped (default 5)
4. **Final** = min(100, weighted_subtotal + bonus)
5. **Letter grade**: A≥90, B≥80, C≥75, D≥70, F<70

## Faculty Flexibility

Each faculty configures:
- Number of quizzes, seatworks, activities, projects, exams
- Category weights (must sum to 100%)

Same formula applies regardless of component count.

## Locking

Grade scheme locks after first grade entry. Admin override required to change.
