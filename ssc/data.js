// SSC Edge content: exam patterns, advanced lessons (with practice
// questions) and study tips. Questions are [question, options, answerIndex,
// explanation]. Text supports **bold** and *italic*.

const EXAMS = {
    cgl1: {
        name: 'SSC CGL Tier 1', minutes: 60, plus: 2, minus: 0.5,
        sections: { reason: 25, ga: 25, quant: 25, eng: 25 },
        budget: { ga: 9, eng: 13, reason: 16, quant: 22 },
        note: '100 questions, 200 marks, 60 minutes. 2 marks per right answer, 0.5 deducted per wrong answer.'
    },
    cgl2: {
        name: 'SSC CGL Tier 2 (Paper 1)', minutes: 120, plus: 3, minus: 1,
        sections: { quant: 30, reason: 30, eng: 45, ga: 25 },
        budget: { quant: 35, reason: 25, eng: 35, ga: 15 },
        note: 'Section I: Maths 30 + Reasoning 30 (1 hour). Section II: English 45 + GA 25 (1 hour). 3 marks per right answer, 1 deducted per wrong answer. Computer test and data-entry test are qualifying.'
    },
    chsl1: {
        name: 'SSC CHSL Tier 1', minutes: 60, plus: 2, minus: 0.5,
        sections: { eng: 25, reason: 25, quant: 25, ga: 25 },
        budget: { ga: 9, eng: 13, reason: 16, quant: 22 },
        note: '100 questions, 200 marks, 60 minutes. 2 marks per right answer, 0.5 deducted per wrong answer.'
    },
    mts: {
        name: 'SSC MTS', minutes: 90, plus: 3, minus: 1,
        sections: { quant: 20, reason: 20, ga: 25, eng: 25 },
        budget: { quant: 25, reason: 20, ga: 20, eng: 25 },
        note: 'Session I: Numerical + Reasoning (no negative marking). Session II: GA + English (1 mark deducted per wrong answer). 45 minutes each. This app applies the negative mark to every section, so Session I scores are slightly understated.'
    },
    gd: {
        name: 'SSC GD Constable', minutes: 60, plus: 2, minus: 0.25,
        sections: { reason: 20, ga: 20, quant: 20, eng: 20 },
        budget: { ga: 10, eng: 12, reason: 16, quant: 22 },
        note: '80 questions, 160 marks, 60 minutes. 0.25 deducted per wrong answer. English or Hindi section.'
    }
};

const SECTIONS = [
{
    id: 'quant', name: 'Quantitative Aptitude', short: 'Quant', icon: '📐',
    lessons: [
    {
        id: 'pct', title: 'Percent–Fraction Engine', time: 12,
        concept: [
            'Stop calculating percentages; **convert them to fractions**. 12.5% = 1/8, 16.66% = 1/6, 37.5% = 3/8, 62.5% = 5/8, 87.5% = 7/8.',
            'Memorise 1/n as a percent up to n = 20: 1/7 = **14.28%**, 1/9 = **11.11%**, 1/11 = **9.09%**, 1/12 = **8.33%**, 1/13 = **7.69%**, 1/15 = **6.66%**, 1/16 = **6.25%**, 1/17 = **5.88%**, 1/18 = **5.55%**, 1/19 = **5.26%**.',
            'Two successive changes a% and b% give a net change of **a + b + ab/100** (use minus signs for decreases).',
            'If price rises r%, consumption must fall by **r / (100 + r) × 100%** to keep spending the same.'
        ],
        trick: 'A 20% rise is ×6/5, a 25% fall is ×3/4. Chain fractions instead of percents and most answers come out in one line.',
        example: { q: 'A number is increased by 25% and then decreased by 20%. Net change?', steps: ['×5/4 then ×4/5', '5/4 × 4/5 = 1', 'Net change = **0%**'] },
        traps: ['"Reduce by 20% then increase by 20%" is NOT zero: it is −4%.', 'Read whether the base is the original or the new value.'],
        qs: [
            ['The price of sugar rises by 25%. By what percent must a family reduce consumption to keep expenditure unchanged?', ['20%', '25%', '18%', '22%'], 0, 'r/(100+r) = 25/125 = 1/5 = 20%.'],
            ['Two successive increases of 10% and 20% equal a single increase of:', ['30%', '32%', '31%', '34%'], 1, '10 + 20 + (10×20)/100 = 32%.'],
            ['A value is increased by 20% and then decreased by 20%. The net effect is:', ['No change', '4% increase', '4% decrease', '2% decrease'], 2, '20 − 20 − 400/100 = −4%.'],
            ['37.5% of 640 is:', ['220', '240', '250', '260'], 1, '37.5% = 3/8; 3/8 × 640 = 240.']
        ]
    },
    {
        id: 'pld', title: 'Profit, Loss & Discount Ratios', time: 14,
        concept: [
            'Master equation: **CP / MP = (100 − D) / (100 + P)**, where D is discount% and P is profit%.',
            'Successive discounts d1 and d2 equal a single discount of **d1 + d2 − d1·d2/100**.',
            'Dishonest weights: gain% = **error / (true value − error) × 100**.',
            'Buy x for ₹y and sell y for ₹x: profit/loss% = **(x² − y²) / y² × 100**, sign tells profit or loss.'
        ],
        trick: 'Turn every profit and discount into a multiplier: 40% markup = 1.4, 10% discount = 0.9. Profit = product − 1.',
        example: { q: 'Selling at a 10% discount still gives 8% profit. MP : CP?', steps: ['CP/MP = (100 − 10)/(100 + 8) = 90/108', '= 5/6', 'So MP : CP = **6 : 5**'] },
        traps: ['Profit % is always on CP; discount % is always on MP.', 'Successive discounts are never simply added.'],
        qs: [
            ['An article is marked 40% above cost and sold at a 10% discount. Profit %?', ['30%', '26%', '24%', '28%'], 1, '1.4 × 0.9 = 1.26 → 26% profit.'],
            ['Successive discounts of 20% and 10% equal a single discount of:', ['30%', '28%', '27%', '29%'], 1, '20 + 10 − 200/100 = 28%.'],
            ['A shopkeeper uses a 900 g weight for 1 kg and sells at cost price. His gain % is:', ['10%', '11.11%', '9.09%', '12.5%'], 1, 'Error 100 / (1000 − 100) = 1/9 = 11.11%.'],
            ['At a 10% discount a trader still makes an 8% profit. The ratio MP : CP is:', ['5 : 6', '6 : 5', '9 : 8', '27 : 25'], 1, 'CP/MP = 90/108 = 5/6, so MP : CP = 6 : 5.']
        ]
    },
    {
        id: 'work', title: 'Time & Work by Efficiency (LCM)', time: 12,
        concept: [
            'Take total work = **LCM of the given days**. Each person\'s efficiency = total ÷ their days.',
            'Combined time = total work ÷ sum of efficiencies. Pipes that empty (leaks) get **negative** efficiency.',
            '"A is twice as efficient as B" means efficiency ratio 2 : 1 and time ratio 1 : 2.',
            'Wages are shared in the ratio of **work done**, not days worked.'
        ],
        trick: 'Never use 1/A + 1/B fractions under time pressure. LCM turns every question into whole-number arithmetic.',
        example: { q: 'A does a job in 12 days, B in 18. Together?', steps: ['Total = LCM(12, 18) = 36 units', 'A = 3/day, B = 2/day, together 5/day', 'Time = 36/5 = **7.2 days**'] },
        traps: ['When someone leaves midway, compute work already done before dividing the remainder.'],
        qs: [
            ['A can do a work in 10 days and B in 15 days. Working together they finish it in:', ['5 days', '6 days', '7.5 days', '8 days'], 1, 'Total 30; efficiencies 3 + 2 = 5; 30/5 = 6 days.'],
            ['A, B and C can do a job in 20, 30 and 60 days respectively. Together they need:', ['10 days', '12 days', '15 days', '9 days'], 0, 'Total 60; 3 + 2 + 1 = 6/day; 60/6 = 10 days.'],
            ['A pipe fills a tank in 6 hours; a leak empties it in 12 hours. With both open the tank fills in:', ['8 h', '10 h', '12 h', '18 h'], 2, 'Total 12; +2 − 1 = 1 unit/h; 12 hours.'],
            ['A is twice as efficient as B. Together they finish a job in 14 days. A alone would take:', ['18 days', '21 days', '28 days', '42 days'], 1, 'Efficiencies 2 and 1; total = 3 × 14 = 42; A alone = 42/2 = 21 days.']
        ]
    },
    {
        id: 'speed', title: 'Speed, Trains & Relative Motion', time: 14,
        concept: [
            'km/h → m/s: multiply by **5/18**. m/s → km/h: multiply by **18/5**.',
            'Average speed for equal distances at x and y: **2xy / (x + y)** (never the simple average).',
            'Opposite directions: relative speed = **sum**. Same direction: **difference**.',
            'Train crossing a pole/man: distance = its length. Crossing a platform or another train: distance = **sum of lengths**.',
            'Boats: still-water speed = (downstream + upstream)/2; stream speed = (downstream − upstream)/2.'
        ],
        trick: '54 km/h = 15 m/s, 72 = 20, 90 = 25, 108 = 30. Learn the multiples of 18 and conversions become instant.',
        example: { q: 'Trains of 120 m and 180 m run towards each other at 50 and 40 km/h. Time to cross?', steps: ['Relative speed = 90 km/h = 25 m/s', 'Distance = 120 + 180 = 300 m', 'Time = 300/25 = **12 s**'] },
        traps: ['Convert units before dividing.', 'For a train crossing a man running alongside, use relative speed.'],
        qs: [
            ['A car goes at 60 km/h and returns over the same distance at 40 km/h. Average speed?', ['50 km/h', '48 km/h', '45 km/h', '52 km/h'], 1, '2 × 60 × 40 / 100 = 48 km/h.'],
            ['A 150 m train running at 54 km/h crosses a pole in:', ['9 s', '10 s', '12 s', '15 s'], 1, '54 km/h = 15 m/s; 150/15 = 10 s.'],
            ['Two trains of 120 m and 180 m move in opposite directions at 50 and 40 km/h. Time to cross each other:', ['10 s', '12 s', '15 s', '18 s'], 1, 'Relative 90 km/h = 25 m/s; 300/25 = 12 s.'],
            ['A boat goes 15 km/h downstream and 9 km/h upstream. Its speed in still water is:', ['12 km/h', '3 km/h', '24 km/h', '6 km/h'], 0, '(15 + 9)/2 = 12 km/h.']
        ]
    },
    {
        id: 'alg', title: 'Algebra Identity Power-Pack', time: 15,
        concept: [
            'If **x + 1/x = k**: x² + 1/x² = k² − 2, and x³ + 1/x³ = k³ − 3k.',
            'If **x − 1/x = k**: x² + 1/x² = k² + 2, and x³ − 1/x³ = k³ + 3k.',
            'If **a + b + c = 0**, then a³ + b³ + c³ = 3abc.',
            'a² + b² + c² − ab − bc − ca = ½[(a − b)² + (b − c)² + (c − a)²].'
        ],
        trick: '**Value putting**: when a condition is symmetric, plug simple numbers (e.g. a = 1, b = 1, c = −2 for a + b + c = 0) and test the options.',
        example: { q: 'If x + 1/x = 3, find x³ + 1/x³.', steps: ['k³ − 3k', '= 27 − 9', '= **18**'] },
        traps: ['x − 1/x uses +2, not −2.', 'Check whether the question asks for x² + 1/x² or (x + 1/x)².'],
        qs: [
            ['If x + 1/x = 4, then x² + 1/x² = ?', ['16', '14', '18', '12'], 1, '4² − 2 = 14.'],
            ['If x + 1/x = 3, then x³ + 1/x³ = ?', ['27', '24', '18', '21'], 2, '27 − 3 × 3 = 18.'],
            ['If a + b + c = 0, then (a³ + b³ + c³)/(abc) = ?', ['0', '1', '3', '−3'], 2, 'a³ + b³ + c³ = 3abc, so the ratio is 3.'],
            ['If x − 1/x = 5, then x² + 1/x² = ?', ['23', '25', '27', '29'], 2, '5² + 2 = 27.']
        ]
    },
    {
        id: 'geo', title: 'Geometry & Trigonometry Hooks', time: 16,
        concept: [
            'Triangle centres: incentre **∠BIC = 90° + A/2**; circumcentre **∠BOC = 2A**; orthocentre **∠BHC = 180° − A**; centroid divides each median **2 : 1**.',
            'If A + B = 90°: sin A = cos B, **tan A · tan B = 1**, sec A = cosec B.',
            '**sec θ + tan θ = k ⇒ sec θ − tan θ = 1/k** (because sec²θ − tan²θ = 1). Same for cosec θ ± cot θ.',
            'Standard values: sin 30° = 1/2, sin 45° = 1/√2, sin 60° = √3/2, tan 60° = √3.'
        ],
        trick: 'For trig identities with "for all θ", put θ = 45° or 0° and test the options — usually faster than proving.',
        example: { q: 'In △ABC, ∠A = 70°, I is the incentre. ∠BIC?', steps: ['90° + 70°/2', '= 90° + 35°', '= **125°**'] },
        traps: ['∠BOC = 2A only when A is acute; if A is obtuse, the reflex angle formula changes.'],
        qs: [
            ['In △ABC, ∠A = 70° and I is the incentre. ∠BIC = ?', ['110°', '125°', '140°', '135°'], 1, '90 + 70/2 = 125°.'],
            ['tan 10° × tan 80° = ?', ['0', '1', '√3', '1/√3'], 1, '10° + 80° = 90°, so the product is 1.'],
            ['If sec θ + tan θ = 2, then sec θ − tan θ = ?', ['2', '1/2', '1', '3/2'], 1, 'Their product is 1, so 1/2.'],
            ['O is the circumcentre of acute △ABC and ∠A = 50°. ∠BOC = ?', ['100°', '130°', '115°', '80°'], 0, '∠BOC = 2A = 100°.']
        ]
    },
    {
        id: 'int', title: 'Interest: SI vs CI', time: 12,
        concept: [
            'CI − SI for **2 years = P(r/100)²**.',
            'CI − SI for **3 years = P(r/100)² (3 + r/100)**.',
            'Under SI, a sum doubles in **100/r years**. Rule of 72: under CI it roughly doubles in 72/r years.',
            'CI for 2 years at r% = **2r + r²/100** percent of P (e.g. 10% → 21%, 20% → 44%).'
        ],
        trick: 'Memorise the 2-year CI percentages: 5% → 10.25%, 10% → 21%, 12% → 25.44%, 15% → 32.25%, 20% → 44%.',
        example: { q: 'P = ₹10,000 at 10% for 2 years. CI − SI?', steps: ['P(r/100)²', '= 10000 × 0.01', '= **₹100**'] },
        traps: ['Half-yearly compounding: halve the rate and double the periods.'],
        qs: [
            ['The difference between CI and SI on ₹10,000 at 10% p.a. for 2 years is:', ['₹50', '₹100', '₹110', '₹210'], 1, '10000 × (0.1)² = 100.'],
            ['A sum doubles in 8 years at simple interest. The rate is:', ['10%', '12%', '12.5%', '8%'], 2, '100/8 = 12.5%.'],
            ['CI on ₹5,000 at 20% p.a. for 2 years is:', ['₹2,000', '₹2,100', '₹2,200', '₹2,400'], 2, '44% of 5000 = 2200.'],
            ['CI − SI on ₹1,000 at 10% p.a. for 3 years is:', ['₹30', '₹31', '₹33.1', '₹21'], 1, '1000 × 0.01 × 3.1 = 31.']
        ]
    }
    ]
},
{
    id: 'reason', name: 'General Intelligence & Reasoning', short: 'Reasoning', icon: '🧩',
    lessons: [
    {
        id: 'code', title: 'Coding–Decoding: Position Power', time: 10,
        concept: [
            'Anchor positions with **EJOTY = 5, 10, 15, 20, 25**. Any letter is one or two steps from an anchor.',
            'Opposite letters add to **27**: A–Z, B–Y, C–X, D–W, E–V, F–U, G–T, H–S, I–R, J–Q, K–P, L–O, M–N.',
            'Position from the right = **27 − position from the left**.',
            'Check the first and last letters first; most patterns reveal themselves there.'
        ],
        trick: 'Write the coded word under the original and note the +/− shift for each letter. Patterns are usually constant shift, alternating shift, opposite letters, or reversal.',
        example: { q: 'CAT → DBU. DOG → ?', steps: ['Each letter +1', 'D→E, O→P, G→H', '**EPH**'] },
        traps: ['Watch for wrap-around: Z + 1 = A.'],
        qs: [
            ['The opposite letter of M (A↔Z, B↔Y…) is:', ['L', 'N', 'O', 'K'], 1, 'M = 13; 27 − 13 = 14 = N.'],
            ['If CAT is coded as DBU, then DOG is coded as:', ['EPH', 'CNF', 'EPG', 'FQI'], 0, 'Each letter shifts +1.'],
            ['If each letter is replaced by its opposite letter, GOD becomes:', ['TLW', 'TMW', 'SLW', 'TLV'], 0, 'G(7)→T(20), O(15)→L(12), D(4)→W(23).'],
            ['R is the 18th letter from the left. Its position from the right is:', ['8th', '9th', '10th', '7th'], 1, '27 − 18 = 9.']
        ]
    },
    {
        id: 'series', title: 'Number Series Decoder', time: 12,
        concept: [
            'Run checks in order: **differences → second differences → ratios → squares/cubes ±1 → alternate terms → primes**.',
            'n(n + 1) series: 2, 6, 12, 20, 30, 42…',
            '×2 + 1 series: 3, 7, 15, 31, 63…',
            'Know squares to 30 and cubes to 20 by heart.'
        ],
        trick: 'If numbers grow fast, think multiplication or powers. If they grow slowly, think differences.',
        example: { q: '4, 9, 25, 49, 121, ?', steps: ['2², 3², 5², 7², 11²', 'Squares of primes', 'Next = 13² = **169**'] },
        traps: ['Mixed series alternate two patterns — check odd and even positions separately.'],
        qs: [
            ['2, 6, 12, 20, 30, ?', ['40', '42', '44', '36'], 1, 'n(n + 1): 6 × 7 = 42.'],
            ['3, 7, 15, 31, 63, ?', ['125', '127', '126', '129'], 1, '×2 + 1: 63 × 2 + 1 = 127.'],
            ['1, 8, 27, 64, ?', ['100', '125', '216', '81'], 1, 'Cubes: 5³ = 125.'],
            ['4, 9, 25, 49, 121, ?', ['144', '169', '196', '225'], 1, 'Squares of primes: 13² = 169.']
        ]
    },
    {
        id: 'syl', title: 'Syllogism with Venn Diagrams', time: 14,
        concept: [
            'All + All = **All**. All + No = **No**. Some + All = **Some**. Some + No = **Some … not**.',
            'Some + Some and All + Some give **no definite conclusion** between the end terms.',
            '"Some A are B" always lets you conclude "Some B are A". "All A are B" lets you conclude "Some B are A" (not "All B are A").',
            'For "possibility" conclusions: if a link is not ruled out by the diagram, it is **possible**.'
        ],
        trick: 'Draw the minimum diagram first (smallest overlaps). A conclusion follows only if it is true in every possible diagram.',
        example: { q: 'All pens are books. Some books are bags. "Some pens are bags"?', steps: ['Pens sit inside books', 'Bags touch books but need not touch pens', '**Does not follow**'] },
        traps: ['Do not use real-world knowledge — only the statements.'],
        qs: [
            ['All pens are books. Some books are bags. I: Some pens are bags. II: Some bags are books.', ['Only I follows', 'Only II follows', 'Both follow', 'Neither follows'], 1, 'I is not certain. II is the reverse of "Some books are bags".'],
            ['All A are B. No B is C. Which conclusion follows?', ['Some A are C', 'No A is C', 'All C are A', 'Some C are A'], 1, 'All + No = No: No A is C.'],
            ['Some A are B. All B are C. Which conclusion follows?', ['All A are C', 'Some A are C', 'No A is C', 'All C are A'], 1, 'Some + All = Some: Some A are C.'],
            ['Some X are Y. Some Y are Z. Conclusion: Some X are Z.', ['Follows', 'Does not follow', 'Follows only if all Y are Z', 'Cannot be judged'], 1, 'Some + Some gives no definite conclusion.']
        ]
    },
    {
        id: 'rel', title: 'Blood Relations & Directions', time: 12,
        concept: [
            'Family tree notation: **+ male, − female, = couple**, one row per generation.',
            'Direction sense: draw every step. Use Pythagorean triples **3-4-5, 5-12-13, 8-15-17, 6-8-10**.',
            'Right turn = 90° clockwise; left turn = 90° anticlockwise.',
            'Shadows: morning sun in the east → shadow to the **west**; evening → shadow to the **east**.'
        ],
        trick: 'For "pointing to a photo" questions, start decoding from the end of the sentence ("my grandfather\'s only son" = father).',
        example: { q: 'Walk 6 km north, then 8 km east. Distance from start?', steps: ['Right triangle 6, 8', '√(36 + 64)', '= **10 km**'] },
        traps: ['Gender is not given by names — never assume it.'],
        qs: [
            ['Pointing to a man, Riya says, "He is the son of my grandfather\'s only son." The man is Riya\'s:', ['Cousin', 'Brother', 'Uncle', 'Father'], 1, 'Grandfather\'s only son = Riya\'s father; his son = Riya\'s brother.'],
            ['A man walks 6 km north and then 8 km east. How far is he from the start?', ['14 km', '10 km', '12 km', '8 km'], 1, '√(6² + 8²) = 10 km.'],
            ['Facing north, a man turns right, right again, and then left. He now faces:', ['North', 'South', 'East', 'West'], 2, 'N → E → S → (left) E.'],
            ['In the morning, A\'s shadow falls to his right. A is facing:', ['North', 'South', 'East', 'West'], 1, 'Morning shadow points west. If west is on his right, he faces south.']
        ]
    },
    {
        id: 'clock', title: 'Clock, Mirror & Calendar', time: 12,
        concept: [
            'Angle between hands = **|30H − 5.5M|** (take 360° minus it if over 180°).',
            'Mirror image of a time = **11:60 − time** (for times between 1:00 and 11:59).',
            'Odd days: normal year = 1, leap year = 2. Next year\'s same date shifts by 1 day (2 if Feb 29 falls in between).',
            'Hands coincide **11 times** in 12 hours and 22 times in a day.'
        ],
        trick: 'For calendar questions, count odd days only — never count actual days.',
        example: { q: 'Angle at 3:40?', steps: ['|30×3 − 5.5×40|', '= |90 − 220|', '= **130°**'] },
        traps: ['Leap century years must be divisible by 400 (2000 yes, 1900 no).'],
        qs: [
            ['The angle between the clock hands at 3:40 is:', ['120°', '130°', '140°', '125°'], 1, '|90 − 220| = 130°.'],
            ['A clock shows 4:20. Its mirror image shows:', ['7:40', '8:40', '7:20', '8:20'], 0, '11:60 − 4:20 = 7:40.'],
            ['1 January 2025 was a Wednesday. 1 January 2026 was a:', ['Wednesday', 'Thursday', 'Friday', 'Tuesday'], 1, '2025 is not a leap year: +1 odd day.'],
            ['How many times do the hands of a clock coincide in 12 hours?', ['12', '11', '24', '22'], 1, '11 times in 12 hours.']
        ]
    }
    ]
},
{
    id: 'eng', name: 'English Comprehension', short: 'English', icon: '📖',
    lessons: [
    {
        id: 'sva', title: 'Error Spotting: Subject–Verb Agreement', time: 12,
        concept: [
            '**Each / Every / Either / Neither** + singular verb.',
            '**One of the** + plural noun + singular verb ("One of my friends *is*…").',
            '**The number of** + singular verb; **A number of** + plural verb.',
            '**Neither…nor / Either…or**: the verb agrees with the **nearer** subject.',
            '**as well as / along with / together with**: the verb agrees with the **first** subject.'
        ],
        trick: 'Cross out everything between the subject and verb (prepositional phrases, "along with…") and read the core sentence.',
        example: { q: 'The captain, along with his players, ___ arrived.', steps: ['Ignore "along with his players"', 'The captain ___ arrived', '**has**'] },
        traps: ['Scissors, trousers, spectacles are plural; news, mathematics, physics are singular.'],
        qs: [
            ['Choose the correct sentence.', ['One of my friend is a doctor.', 'One of my friends are a doctor.', 'One of my friends is a doctor.', 'One of my friend are a doctor.'], 2, 'One of the + plural noun + singular verb.'],
            ['The number of students ___ increasing.', ['are', 'is', 'were', 'have'], 1, '"The number of" takes a singular verb.'],
            ['Neither the teacher nor the students ___ present.', ['was', 'were', 'is', 'has been'], 1, 'The verb agrees with the nearer subject, "students".'],
            ['The captain, along with his players, ___ arrived.', ['have', 'has', 'are', 'were'], 1, 'The verb agrees with the first subject, "captain".']
        ]
    },
    {
        id: 'prep', title: 'Fixed Prepositions', time: 10,
        concept: [
            'High-frequency pairs: **accused of, charged with, abide by, comply with, congratulate on, prefer to, senior to, insist on, married to, good at, deal in (trade), deal with (handle)**.',
            '**Die of** a disease, **die from** an external cause (die from a wound).',
            '**Superior / inferior / senior / junior / prefer** take **to**, never "than".',
            'Make a personal list of every preposition you get wrong in mocks — the same 60–80 pairs repeat.'
        ],
        trick: 'Learn them in sentences, not as pairs. "She was charged *with* murder" sticks better than "charged–with".',
        example: { q: 'I prefer tea ___ coffee.', steps: ['Prefer takes "to"', '**to**'] },
        traps: ['"Comprise" never takes "of": the house comprises five rooms.'],
        qs: [
            ['He was accused ___ theft.', ['for', 'of', 'with', 'about'], 1, 'Accused of.'],
            ['I prefer tea ___ coffee.', ['than', 'over', 'to', 'from'], 2, 'Prefer… to.'],
            ['She congratulated me ___ my success.', ['for', 'on', 'at', 'about'], 1, 'Congratulate on.'],
            ['We must comply ___ the rules.', ['to', 'by', 'with', 'for'], 2, 'Comply with.']
        ]
    },
    {
        id: 'roots', title: 'Vocabulary through Roots', time: 12,
        concept: [
            'Roots unlock unseen words: **bene** (good), **mal** (bad), **chron** (time), **phil** (love), **mis/miso** (hate), **anthrop** (human), **cide** (kill), **omni** (all), **loqu** (speak), **pseud** (false), **ambi** (both).',
            'One-word substitutions built from them: misanthrope, philanthropist, omnipotent, loquacious, chronology, regicide, pseudonym, ambidextrous.',
            'Revise vocabulary in **short daily bursts** (15 minutes) — it fades fast without spaced repetition.'
        ],
        trick: 'When you meet a new word, break it into root + prefix + suffix and guess the meaning before checking it.',
        example: { q: 'Regicide?', steps: ['regi = king, cide = kill', '**Killing of a king**'] },
        traps: ['Homicide (human), fratricide (brother), patricide (father), infanticide (infant) — do not mix them up.'],
        qs: [
            ['One who hates mankind:', ['Philanthropist', 'Misanthrope', 'Misogynist', 'Anthropologist'], 1, 'Mis (hate) + anthrop (mankind).'],
            ['Killing of a king:', ['Homicide', 'Regicide', 'Fratricide', 'Genocide'], 1, 'Regi (king) + cide (kill).'],
            ['A person who talks a lot:', ['Laconic', 'Loquacious', 'Taciturn', 'Reticent'], 1, 'Loqu = speak.'],
            ['Synonym of BENEVOLENT:', ['Cruel', 'Kind', 'Lazy', 'Proud'], 1, 'Bene = good.']
        ]
    },
    {
        id: 'voice', title: 'Active–Passive & Narration', time: 14,
        concept: [
            'Passive formula: object + **form of "be" + V3** + by + subject. Present continuous: is/are **being** + V3. Perfect: has/have **been** + V3. Modal: modal + **be** + V3.',
            'Imperative: "Open the door" → **Let the door be opened**.',
            'Narration: tenses shift one step back (is → was, has → had, will → would) when the reporting verb is in the past.',
            '**Universal truths and habitual facts do not change tense.**',
            'Time words: now → then, today → that day, tomorrow → the next day, yesterday → the previous day, here → there.'
        ],
        trick: 'Identify the tense first; every passive and narration answer follows from it mechanically.',
        example: { q: 'He said, "I am busy."', steps: ['am → was', 'I → he', '**He said that he was busy.**'] },
        traps: ['Interrogatives become statements in indirect speech: no question mark, normal word order.'],
        qs: [
            ['Change to passive: "She writes a letter."', ['A letter was written by her.', 'A letter is written by her.', 'A letter is being written by her.', 'A letter has been written by her.'], 1, 'Simple present: is + V3.'],
            ['Change to passive: "Open the door."', ['The door is opened.', 'Let the door be opened.', 'The door should open.', 'Let the door open.'], 1, 'Imperative: Let + object + be + V3.'],
            ['He said, "I am busy."', ['He said that I am busy.', 'He said that he was busy.', 'He said that he is busy.', 'He says that he was busy.'], 1, 'Am → was; I → he.'],
            ['The teacher said, "The earth revolves around the sun."', ['…that the earth revolved around the sun.', '…that the earth revolves around the sun.', '…that the earth had revolved around the sun.', '…that the earth was revolving around the sun.'], 1, 'Universal truth: tense does not change.']
        ]
    },
    {
        id: 'idiom', title: 'Idioms SSC Repeats', time: 10,
        concept: [
            '**To bell the cat**: take a risky step for others. **Cry for the moon**: wish for the impossible.',
            '**Hobson\'s choice**: no real choice. **At sixes and sevens**: in disorder.',
            '**Red-letter day**: a memorable day. **To smell a rat**: to suspect something.',
            '**Achilles\' heel**: a weak point. **White elephant**: costly but useless. **Burn the midnight oil**: study late.'
        ],
        trick: 'Previous-year papers are the best idiom list: SSC repeats many idioms across years and shifts.',
        example: { q: 'A white elephant?', steps: ['Expensive to keep, little use', '**A costly but useless possession**'] },
        traps: ['Never take an idiom literally; the literal meaning is usually one of the wrong options.'],
        qs: [
            ['"To smell a rat" means:', ['To be dirty', 'To suspect something wrong', 'To catch a thief', 'To be afraid'], 1, 'To suspect a trick.'],
            ['"At sixes and sevens" means:', ['In confusion', 'In good order', 'Very old', 'Gambling'], 0, 'In a state of disorder.'],
            ['"Hobson\'s choice" means:', ['A wise decision', 'No real choice', 'A difficult choice', 'Many options'], 1, 'Take what is offered or nothing.'],
            ['"Achilles\' heel" means:', ['A strong point', 'A weak point', 'A brave act', 'A secret'], 1, 'A vulnerable spot.']
        ]
    }
    ]
},
{
    id: 'ga', name: 'General Awareness', short: 'GA', icon: '🌏',
    lessons: [
    {
        id: 'polity', title: 'Polity: Articles that Repeat', time: 12,
        concept: [
            '**Art 14** equality before law · **17** abolition of untouchability · **21** life and personal liberty · **21A** education for ages 6–14 (86th Amendment, 2002).',
            '**Art 32** constitutional remedies — Ambedkar called it the "heart and soul" of the Constitution.',
            '**Art 51A** Fundamental Duties — added by the **42nd Amendment (1976)** on the Swaran Singh Committee\'s recommendation.',
            '**Art 72** President\'s pardoning power · **112** annual financial statement · **280** Finance Commission · **324** Election Commission.',
            'Emergencies: **352** national · **356** President\'s rule in a state · **360** financial. **368** amendment procedure.'
        ],
        trick: 'Group articles into stories ("emergency = 352, 356, 360") instead of memorising them in numeric order.',
        example: { q: 'Which article covers financial emergency?', steps: ['Emergency trio: 352, 356, 360', '**Article 360**'] },
        traps: ['Fundamental Duties came from the 42nd Amendment; the 86th Amendment added the 11th duty.'],
        qs: [
            ['The Election Commission of India is provided for under Article:', ['280', '324', '312', '356'], 1, 'Article 324.'],
            ['Fundamental Duties were added by the:', ['44th Amendment', '42nd Amendment', '86th Amendment', '73rd Amendment'], 1, '42nd Amendment, 1976.'],
            ['Which Article did Dr. Ambedkar call the "heart and soul" of the Constitution?', ['Article 14', 'Article 21', 'Article 32', 'Article 19'], 2, 'Right to constitutional remedies.'],
            ['Financial emergency is covered under Article:', ['352', '356', '360', '365'], 2, 'Article 360.']
        ]
    },
    {
        id: 'hist', title: 'History: Chronology Anchors', time: 14,
        concept: [
            'Battles: **Panipat 1526, 1556, 1761** · **Plassey 1757** · **Buxar 1764**.',
            '**1885** INC founded (A.O. Hume); first session in Bombay under W.C. Bonnerjee.',
            '**1905** Partition of Bengal (Lord Curzon) · **1906** Muslim League (Dhaka).',
            '**1919** Jallianwala Bagh (13 April) · **1920** Non-Cooperation · **1929** Lahore session, Purna Swaraj (Nehru presiding) · **1930** Dandi March · **1942** Quit India.'
        ],
        trick: 'Build a one-page timeline and place every new fact on it. Isolated dates are forgotten; a sequence is remembered.',
        example: { q: 'Purna Swaraj resolution?', steps: ['Lahore session', 'December 1929, Nehru presiding', '**Lahore, 1929**'] },
        traps: ['Buxar (1764) came after Plassey (1757); both involved the East India Company.'],
        qs: [
            ['The First Battle of Panipat was fought in:', ['1526', '1556', '1761', '1576'], 0, 'Babur vs Ibrahim Lodi, 1526.'],
            ['The Purna Swaraj resolution was passed at the INC session in:', ['Lucknow 1916', 'Lahore 1929', 'Karachi 1931', 'Calcutta 1928'], 1, 'Lahore, 1929.'],
            ['Bengal was partitioned in 1905 under Viceroy:', ['Lord Ripon', 'Lord Curzon', 'Lord Minto', 'Lord Dalhousie'], 1, 'Lord Curzon.'],
            ['The Indian National Congress was founded by:', ['Dadabhai Naoroji', 'A.O. Hume', 'W.C. Bonnerjee', 'Surendranath Banerjee'], 1, 'A.O. Hume, 1885.']
        ]
    },
    {
        id: 'sci', title: 'Science: High-Yield Facts', time: 12,
        concept: [
            'Deficiencies: **A** night blindness · **B1** beriberi · **B3** pellagra · **C** scurvy · **D** rickets · **K** poor blood clotting.',
            'Chemicals: baking soda **NaHCO₃** · washing soda **Na₂CO₃·10H₂O** · plaster of Paris **CaSO₄·½H₂O** · bleaching powder **CaOCl₂**.',
            'SI units: force newton · power watt · resistance ohm · **luminous intensity candela** · amount of substance mole.',
            'Human body: largest gland **liver** · human blood pH about **7.4** · smallest bone **stapes**.'
        ],
        trick: 'Science questions are short. Memorise them as flash cards and review daily; they are the fastest marks in GA.',
        example: { q: 'Scurvy is caused by deficiency of?', steps: ['Vitamin C', '**C**'] },
        traps: ['Washing soda and baking soda are both sodium salts — check the formula carefully.'],
        qs: [
            ['Scurvy is caused by a deficiency of vitamin:', ['A', 'C', 'D', 'K'], 1, 'Vitamin C.'],
            ['The chemical formula of baking soda is:', ['Na₂CO₃', 'NaHCO₃', 'NaCl', 'CaCO₃'], 1, 'Sodium bicarbonate, NaHCO₃.'],
            ['The SI unit of luminous intensity is:', ['Lux', 'Lumen', 'Candela', 'Watt'], 2, 'Candela.'],
            ['The largest gland in the human body is the:', ['Pancreas', 'Thyroid', 'Liver', 'Pituitary'], 2, 'Liver.']
        ]
    },
    {
        id: 'geog', title: 'Geography: India Map Hooks', time: 12,
        concept: [
            'The Tropic of Cancer crosses **8 states**: Gujarat, Rajasthan, Madhya Pradesh, Chhattisgarh, Jharkhand, West Bengal, Tripura, Mizoram.',
            'West-flowing rift-valley rivers: **Narmada and Tapi** (they form estuaries, not deltas).',
            'Passes: **Shipki La** (Himachal Pradesh) · **Nathu La** (Sikkim) · **Zoji La** (Ladakh).',
            'Black (regur) soil is best for **cotton**. Largest state by area: **Rajasthan**.',
            'Indian Standard Time is based on **82.5° E**, near Mirzapur (Uttar Pradesh).'
        ],
        trick: 'Study geography with a blank map open. Placing a fact on the map once beats reading it five times.',
        example: { q: 'Does the Tropic of Cancer cross Odisha?', steps: ['Check the 8 states', 'Odisha is not one of them', '**No**'] },
        traps: ['Mahanadi, Godavari and Krishna flow east; Narmada and Tapi flow west.'],
        qs: [
            ['Which river flows westward through a rift valley?', ['Godavari', 'Narmada', 'Krishna', 'Mahanadi'], 1, 'Narmada (and Tapi).'],
            ['The Tropic of Cancer does NOT pass through:', ['Gujarat', 'Tripura', 'Odisha', 'Mizoram'], 2, 'Odisha is not on the list of 8 states.'],
            ['Black soil is best suited for:', ['Tea', 'Cotton', 'Rice', 'Coffee'], 1, 'Regur (black) soil holds moisture and suits cotton.'],
            ['Nathu La pass is in:', ['Himachal Pradesh', 'Sikkim', 'Arunachal Pradesh', 'Ladakh'], 1, 'Sikkim.']
        ]
    }
    ]
}
];

// Study tips, grouped. Each tip: title, body (supports **bold**), and an
// optional "do" line — one concrete action to take today.
const TIPS = [
{
    cat: 'Exam strategy', icon: '🎯', tips: [
        { t: 'Use the two-pass method', b: 'Pass 1: answer every question you can solve in under 45 seconds and mark the rest. Pass 2: return to the marked ones with the time left. This stops one hard question from eating the time for three easy ones.', do: 'In your next drill, skip any question that takes over 45 s and come back later.' },
        { t: 'Do the guessing maths', b: 'In Tier 1 (+2, −0.5) a pure random guess has a small positive expected value (+0.125 marks), and eliminating even one option makes it clearly worth it. In Tier 2 (+3, −1) a pure random guess has an expected value of **zero**, so guess only after you have eliminated at least one option.', do: 'Note in your mock log how many guesses you made and how many were right.' },
        { t: 'Fix a section order', b: 'Many toppers start with GA (fastest marks, about 8–10 minutes), then English, Reasoning and Quant. Test two or three orders in mocks and then keep one, so you never decide on exam day.', do: 'Try a different section order in your next two mocks and compare.' },
        { t: 'Plan backwards from the cutoff', b: 'Look up last year\'s cutoff for your category and post, add a 10–15 mark safety margin, and split that target across sections. Your preparation should chase that number, not 100%.', do: 'Write your target score per section in the Plan tab.' },
        { t: 'Previous-year questions are the syllabus', b: 'SSC repeats concepts, question styles and even exact GA facts. Solve at least the last three years\' papers topic-wise before buying any new book.', do: 'Solve 20 previous-year questions from your weakest topic today.' }
    ]
},
{
    cat: 'Memory & learning', icon: '🧠', tips: [
        { t: 'Revise on a 1-3-7-21 schedule', b: 'Memory fades fastest right after learning. Revising a topic 1, 3, 7 and 21 days after you study it moves it into long-term memory. This app schedules those revisions automatically on the Home screen.', do: 'Finish one lesson today so its revision cycle starts.' },
        { t: 'Active recall beats rereading', b: 'Close the book and write down everything you remember, then check. Rereading feels productive but builds far weaker memory than testing yourself.', do: 'After each lesson, write the formulas from memory before taking the quiz.' },
        { t: 'Interleave topics', b: 'Practising mixed questions (percent, work, speed together) trains you to recognise which method to use — exactly what the exam demands. Blocked practice of one topic feels easier but transfers less.', do: 'Run a "Mixed" drill after finishing any two lessons.' },
        { t: 'Make your own short notes', b: 'One page per topic: formulas, tricks and the traps you fell for. In the final month you should revise only from these pages, not textbooks.', do: 'Start a one-page note for the topic you studied today.' }
    ]
},
{
    cat: 'Mock analysis', icon: '📊', tips: [
        { t: 'Spend more time analysing than testing', b: 'A 60-minute mock deserves 60–90 minutes of analysis. Re-solve every wrong and every skipped question without the timer, and note why you missed it.', do: 'Log your next mock here and tag every mistake by reason.' },
        { t: 'Classify every mistake', b: 'Concept gap → relearn the lesson. Silly mistake → slow down on that question type. Time pressure → timed drills. Guess → tighten your guessing rule. Each fix is different, so the label matters.', do: 'Open the Mistake Book and review the reason breakdown.' },
        { t: 'Watch accuracy and attempts together', b: 'High attempts with under 80% accuracy means you are over-attempting: negative marks are eating your score. High accuracy with low attempts means speed is the bottleneck.', do: 'Check the insights under the Mocks tab after logging a mock.' },
        { t: 'Scale mocks with the phase', b: 'Foundation phase: sectional tests only. Practice phase: two or three full mocks a week. Final phase: one mock a day plus analysis. Too many mocks too early just measures what you have not studied yet.', do: 'See which phase you are in on the Plan tab.' }
    ]
},
{
    cat: 'Speed & calculation', icon: '⚡', tips: [
        { t: 'Learn the number tables', b: 'Tables up to 30, squares up to 50, cubes up to 30, and fractions 1/2 to 1/20 as percentages. These alone save several minutes in Quant.', do: 'Spend 15 minutes on squares 31–50 today.' },
        { t: 'Calculate on paper less', b: 'Approximate wherever the options are far apart. If options are 240, 320, 410, 480, you rarely need the exact value.', do: 'Before solving, glance at the options and decide whether approximation is enough.' },
        { t: 'Use the right budget per section', b: 'For a 60-minute Tier 1: GA 8–10 min, English 12–15, Reasoning 15–17, Quant 20–22. Practise drills with these budgets so the pace becomes automatic.', do: 'Run a timed drill and compare your seconds per question with the target.' }
    ]
},
{
    cat: 'English & GA', icon: '📰', tips: [
        { t: 'Read for 20 minutes daily', b: 'An editorial or long-form article a day improves comprehension, vocabulary and grammar intuition together. Note five new words and use each in a sentence.', do: 'Read one editorial today and add five words to your vocabulary list.' },
        { t: 'For cloze tests, read the whole passage first', b: 'Understand the tone and the topic before filling blanks. Most blanks are decided by collocation ("heavy rain", not "strong rain") or by the logic of the next sentence.', do: 'Solve one cloze test reading the full passage before filling any blank.' },
        { t: 'Use one source for current affairs', b: 'Cover the last 6–8 months with a single monthly compilation and revise it several times. Switching between sources gives coverage but no retention.', do: 'Pick one monthly compilation and revise the latest month.' },
        { t: 'Static GA is a marathon', b: 'Do 30 minutes of static GA every day rather than long weekend sessions. GA is mostly memory, and memory needs frequency.', do: 'Do one GA lesson in the Learn tab today.' }
    ]
},
{
    cat: 'Focus & exam day', icon: '🧘', tips: [
        { t: 'Work in deep blocks', b: 'Study in 50-minute blocks with 10-minute breaks, phone in another room. Three deep blocks beat eight distracted hours.', do: 'Start a 50-minute focus session from the Plan tab.' },
        { t: 'Protect your sleep', b: 'Memory consolidation happens during sleep. Seven hours of sleep improves retention more than an extra late-night hour of study.', do: 'Fix a sleep time and keep it for a week.' },
        { t: 'Rehearse exam day', b: 'Take mocks at your actual exam slot time. Visit or map the centre a day before, keep the admit card, photo ID and photographs ready, and reach early.', do: 'Schedule your next mock at your exam\'s shift time.' },
        { t: 'Use the first two minutes well', b: 'Scan the paper, settle your breathing, and start with your strongest section to build momentum. Do not get stuck on question one.', do: 'Practise this opening routine in your next mock.' }
    ]
}
];
