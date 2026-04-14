/**
 * questions.js
 *
 * All shooting modifier questions for Mantic Armada (rulebook p.24).
 *
 * Each question object:
 *   id       {string}    — key used to store the answer in state
 *   label    {string}    — short name shown in the progress bar
 *   question {string}    — heading displayed on the question card
 *   subtext  {string?}   — optional clarifying paragraph (italic)
 *   skipIf   {function?} — (answers) => boolean; skip this question if true
 *   options  {Option[]}  — the selectable choices
 *
 * Each Option object:
 *   label    {string}  — primary button text
 *   desc     {string}  — secondary italic description
 *   value    {string}  — the value stored in state.answers[question.id]
 *   modifier {number}  — the numeric contribution to the total modifier
 */

const QUESTIONS = [
  {
    id: 'weapon',
    label: 'Weapon Type',
    question: 'What type of weapon is being fired?',
    options: [
      {
        label: 'Standard',
        desc:  'Direct-fire weapon — range modifier applies',
        value: 'standard',
        modifier: 0,
      },
      {
        label: 'Indirect',
        desc:  'Arcing/mortar weapon — range modifier does not apply',
        value: 'indirect',
        modifier: -2,
      },
    ],
  },

  {
    id: 'range',
    label: 'Range',
    question: 'What is the range to target?',
    // The range modifier does not apply to Indirect Weapons (rulebook p.24)
    skipIf: (answers) => answers.weapon === 'indirect',
    options: [
      { label: 'Point Blank', desc: 'Target is within 3"',   value: 'point_blank', modifier: +2 },
      { label: 'Close Range', desc: 'Target is within 10"',  value: 'close',       modifier:  0 },
      { label: 'Long Range',  desc: 'Target is beyond 10"',  value: 'long',        modifier: -1 },
    ],
  },

  {
    id: 'crew',
    label: 'Crew Quality',
    question: "What is the shooting ship's crew quality?",
    options: [
      { label: 'Veteran',       desc: 'Experienced, battle-hardened crew', value: 'veteran',       modifier: +1 },
      { label: 'Standard',      desc: 'Regular trained crew',              value: 'standard',      modifier:  0 },
      { label: 'Inexperienced', desc: 'Green or poorly trained crew',      value: 'inexperienced', modifier: -1 },
    ],
  },

  {
    id: 'shooter_speed',
    label: 'Shooter Speed',
    question: "What is the shooting ship's speed?",
    options: [
      { label: 'Anchored / Grounded', desc: 'Ship is stationary or run aground', value: 'anchored', modifier: +1 },
      { label: 'Battle Speed',        desc: 'Normal combat speed',               value: 'battle',   modifier:  0 },
      { label: 'Full Speed',          desc: 'Moving at maximum speed',           value: 'full',     modifier: -1 },
    ],
  },

  {
    id: 'target_speed',
    label: 'Target Speed',
    question: "What is the target ship's speed?",
    options: [
      { label: 'Anchored / Grounded', desc: 'Target is stationary or run aground', value: 'anchored', modifier: +1 },
      { label: 'Battle Speed',        desc: 'Normal combat speed',                 value: 'battle',   modifier:  0 },
      { label: 'Full Speed',          desc: 'Moving at maximum speed',             value: 'full',     modifier: -1 },
    ],
  },

  {
    id: 'target_size',
    label: 'Target Size',
    question: 'What is the size of the target?',
    options: [
      { label: 'Tiny',                desc: 'Very small vessel',        value: 'tiny',     modifier: -2 },
      { label: 'Small',               desc: 'Small vessel',             value: 'small',    modifier: -1 },
      { label: 'Standard',            desc: 'Average-sized vessel',     value: 'standard', modifier:  0 },
      { label: 'Large / Extra Large', desc: 'Large warship or capital', value: 'large',    modifier: +1 },
    ],
  },

  {
    id: 'visibility',
    label: 'Visibility',
    question: 'How visible is the target?',
    options: [
      { label: 'Fully Visible',     desc: 'Clear line of sight',              value: 'full',    modifier:  0 },
      { label: 'Partially Visible', desc: 'Obscured by terrain, smoke, etc.', value: 'partial', modifier: -1 },
    ],
  },

  {
    id: 'snap_fire',
    label: 'Snap Fire',
    question: 'Is the shooting ship firing as she bears?',
    subtext: 'Fire as She Bears: the ship fires opportunistically during movement rather than in a dedicated shooting activation.',
    options: [
      { label: 'Normal Shot',       desc: 'Standard shooting activation', value: 'no',  modifier:  0 },
      { label: 'Fire as She Bears', desc: 'Snap fire during movement',    value: 'yes', modifier: -2 },
    ],
  },

  {
    id: 'evasive',
    label: 'Evasive Move',
    question: 'Has the shooting ship already evaded this activation?',
    subtext: 'Applies if the shooting ship previously rolled to Evade during the current activation.',
    options: [
      { label: 'No Evasion', desc: 'Has not evaded this activation',        value: 'no',  modifier:  0 },
      { label: 'Evaded',     desc: 'Already evaded during this activation', value: 'yes', modifier: -1 },
    ],
  },
];
