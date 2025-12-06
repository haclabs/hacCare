# hacCare Educational Games

This directory contains interactive educational games designed for nursing students and healthcare professionals.

## Games

### 🎯 Med Math Mini-Game
**Location:** `src/components/training/MedMathMiniGame.tsx`

A quick medication math practice game featuring:
- 20+ dosage calculation questions
- 3 difficulty levels (easy, medium, hard)
- 30-second countdown timer
- Immediate feedback with explanations
- Score tracking and performance analytics
- Categories: dosage calculation, unit conversion, infusion rates, concentration

**Access:** Click "🎯 Med Math" button at the bottom of the sidebar

---

### 🎲 Nursopoly
**Location:** `src/components/games/nursopoly/`

An educational board game modeled after Monopoly, featuring nursing content:
- **Players:** 2-6 players with customizable names and colors
- **Board:** 30 spaces across 6 clinical disciplines
- **Questions:** 60+ Canadian nursing questions aligned with NCLEX standards
- **Gameplay:** Turn-based with dice rolling, special spaces, and scoring
- **Duration:** Quick (1 lap), Medium (2 laps), or Long (3 laps)

**Access:** Navigate to `/app/nursopoly` or click "🎲 Nursopoly" in the sidebar

#### File Structure
```
nursopoly/
├── types.ts           # TypeScript type definitions
├── boardConfig.ts     # 30-space board layout
├── questionBank.ts    # 60+ nursing questions
└── Nursopoly.tsx      # Main game component
```

#### Clinical Disciplines
1. **Medical-Surgical** (Blue) - General adult care, wound care, vitals
2. **Pediatrics** (Pink) - Child development, pediatric medications
3. **Mental Health** (Purple) - Therapeutic communication, psychiatric care
4. **Maternal-Newborn** (Green) - Pregnancy, postpartum, newborn care
5. **Community Health** (Orange) - Population health, prevention
6. **Critical Care** (Red) - ICU care, emergency interventions

#### Special Spaces
- **START** 🏥 - Collect 200 points when passing
- **STAT!** ⚡ - Double points, urgent care questions
- **Break Room** ☕ - Lose a turn
- **Clinical Rotation** 🔄 - Choose any discipline
- **Preceptor Review** 👨‍⚕️ - Answer 3 quick questions
- **Free Study** 📚 - Safe space, no question

#### Question Difficulties
- **Easy** (100 points) - Basic concepts, normal ranges
- **Medium** (200 points) - Applied knowledge, patient scenarios
- **Hard** (300 points) - Complex decision-making, critical thinking

## Adding New Questions

To add questions to Nursopoly:

1. Open `src/components/games/nursopoly/questionBank.ts`
2. Add your question to the appropriate discipline section:

```typescript
{
  id: 'discipline-category-001',
  discipline: 'medical-surgical',
  difficulty: 'medium',
  question: 'Your question text here',
  options: [
    'Option A',
    'Option B',
    'Option C',
    'Option D'
  ],
  correctAnswer: 1, // Index of correct option (0-3)
  explanation: 'Detailed explanation of why the answer is correct',
  points: 200
}
```

## Game Design Philosophy

1. **Educational Value** - All content aligned with nursing curriculum
2. **Canadian Standards** - Questions reference Canadian healthcare context
3. **Engagement** - Gamification encourages repeated practice
4. **Collaboration** - Multiplayer games promote group learning
5. **Immediate Feedback** - Learn from mistakes with detailed explanations
6. **Low Stakes** - Practice environment without real-world consequences

## Future Enhancements

- [ ] Add more questions (target: 200+ per discipline)
- [ ] Power-up cards and special abilities
- [ ] Multiplayer over network (WebSockets)
- [ ] Cross-session leaderboards
- [ ] Custom avatars and themes
- [ ] Tournament mode with brackets
- [ ] Sound effects and background music
- [ ] Mobile app version
- [ ] Practice mode vs. competitive mode
- [ ] Progress tracking and achievements

## Educational Use Disclaimer

⚠️ **These games are for educational practice and simulation purposes only.**

Always follow facility protocols, evidence-based practice guidelines, and local standards of care for real-world nursing practice. Game content should not replace formal nursing education or clinical judgment.

## Contributing

To contribute new games or features:

1. Follow existing code patterns and TypeScript best practices
2. Include comprehensive JSDoc comments
3. Ensure all educational content is evidence-based
4. Test thoroughly across different screen sizes
5. Include accessibility features (ARIA labels, keyboard navigation)

## Technical Details

- **Framework:** React 19.2.0 + TypeScript
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **State Management:** React Hooks (useState, useEffect, useReducer)
- **Routing:** React Router v7
- **Build:** Vite 7.2.4
- **Storage:** localStorage for game persistence

---

**Version:** 1.0.0  
**Last Updated:** December 2024  
**Maintainer:** hacCare Development Team
