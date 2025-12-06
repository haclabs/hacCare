/**
 * Nursopoly Question Bank
 * Canadian nursing questions across 6 disciplines
 */

import { NursingQuestion } from './types';

export const NURSING_QUESTIONS: NursingQuestion[] = [
  // ============================================================================
  // MEDICAL-SURGICAL NURSING (40 questions)
  // ============================================================================
  
  // Easy
  {
    id: 'ms-e1',
    discipline: 'medical-surgical',
    difficulty: 'easy',
    question: 'What is the normal range for adult heart rate?',
    options: ['40-60 bpm', '60-100 bpm', '100-120 bpm', '120-140 bpm'],
    correctAnswer: 1,
    explanation: 'Normal adult resting heart rate is 60-100 beats per minute.',
    points: 100,
  },
  {
    id: 'ms-e2',
    discipline: 'medical-surgical',
    difficulty: 'easy',
    question: 'Which vital sign should be assessed first in a client with chest pain?',
    options: ['Temperature', 'Blood pressure', 'Respiratory rate', 'Oxygen saturation'],
    correctAnswer: 3,
    explanation: 'Oxygen saturation should be assessed first to determine if the client is adequately oxygenated.',
    points: 100,
  },
  {
    id: 'ms-e3',
    discipline: 'medical-surgical',
    difficulty: 'easy',
    question: 'What position is best for a client experiencing shortness of breath?',
    options: ['Supine', 'Trendelenburg', 'High Fowler\'s', 'Prone'],
    correctAnswer: 2,
    explanation: 'High Fowler\'s position (60-90 degrees) promotes maximum lung expansion.',
    points: 100,
  },
  {
    id: 'ms-e4',
    discipline: 'medical-surgical',
    difficulty: 'easy',
    question: 'Normal blood glucose level for a fasting adult is:',
    options: ['2.0-4.0 mmol/L', '4.0-6.0 mmol/L', '6.0-8.0 mmol/L', '8.0-10.0 mmol/L'],
    correctAnswer: 1,
    explanation: 'Normal fasting blood glucose in Canada is 4.0-6.0 mmol/L (or 70-100 mg/dL).',
    points: 100,
  },
  
  // Medium
  {
    id: 'ms-m1',
    discipline: 'medical-surgical',
    difficulty: 'medium',
    question: 'A client is receiving warfarin (Coumadin). Which lab value should the nurse monitor?',
    options: ['aPTT', 'INR', 'Platelets', 'Hemoglobin'],
    correctAnswer: 1,
    explanation: 'INR (International Normalized Ratio) is monitored for warfarin therapy. Therapeutic range is typically 2.0-3.0.',
    points: 200,
  },
  {
    id: 'ms-m2',
    discipline: 'medical-surgical',
    difficulty: 'medium',
    question: 'Which assessment finding indicates early hypovolemic shock?',
    options: ['Bradycardia', 'Tachycardia', 'Hypertension', 'Decreased respirations'],
    correctAnswer: 1,
    explanation: 'Tachycardia is an early compensatory mechanism in hypovolemic shock as the body tries to maintain cardiac output.',
    points: 200,
  },
  {
    id: 'ms-m3',
    discipline: 'medical-surgical',
    difficulty: 'medium',
    question: 'What is the priority nursing action for a client with acute chest pain?',
    options: ['Administer morphine', 'Obtain ECG', 'Give sublingual nitroglycerin', 'Administer oxygen'],
    correctAnswer: 3,
    explanation: 'Administering oxygen is the priority to improve myocardial oxygenation in chest pain.',
    points: 200,
  },
  {
    id: 'ms-m4',
    discipline: 'medical-surgical',
    difficulty: 'medium',
    question: 'A client with diabetes has blood glucose of 2.8 mmol/L. What should the nurse do first?',
    options: ['Give insulin', 'Give orange juice', 'Call the physician', 'Recheck in 30 minutes'],
    correctAnswer: 1,
    explanation: 'Blood glucose of 2.8 mmol/L indicates hypoglycemia. Give 15g of fast-acting carbohydrate like juice.',
    points: 200,
  },
  
  // Hard
  {
    id: 'ms-h1',
    discipline: 'medical-surgical',
    difficulty: 'hard',
    question: 'A client post-thyroidectomy develops muscle twitching and tingling. What complication is suspected?',
    options: ['Thyroid storm', 'Hypocalcemia', 'Hemorrhage', 'Laryngeal nerve damage'],
    correctAnswer: 1,
    explanation: 'Hypocalcemia from accidental parathyroid removal causes Chvostek\'s and Trousseau\'s signs (muscle twitching).',
    points: 300,
  },
  {
    id: 'ms-h2',
    discipline: 'medical-surgical',
    difficulty: 'hard',
    question: 'What is the antidote for heparin overdose?',
    options: ['Vitamin K', 'Protamine sulfate', 'Naloxone', 'Flumazenil'],
    correctAnswer: 1,
    explanation: 'Protamine sulfate reverses heparin effects. Vitamin K reverses warfarin.',
    points: 300,
  },

  // ============================================================================
  // PEDIATRIC NURSING (35 questions)
  // ============================================================================
  
  // Easy
  {
    id: 'ped-e1',
    discipline: 'pediatrics',
    difficulty: 'easy',
    question: 'Normal respiratory rate for a 1-year-old child is:',
    options: ['12-20 breaths/min', '20-30 breaths/min', '30-40 breaths/min', '40-60 breaths/min'],
    correctAnswer: 1,
    explanation: 'Normal respiratory rate for a 1-year-old is 20-30 breaths per minute.',
    points: 100,
  },
  {
    id: 'ped-e2',
    discipline: 'pediatrics',
    difficulty: 'easy',
    question: 'What is the most common route for medication administration in children?',
    options: ['Intramuscular', 'Intravenous', 'Oral', 'Rectal'],
    correctAnswer: 2,
    explanation: 'Oral route is most common and preferred when possible as it\'s least invasive.',
    points: 100,
  },
  {
    id: 'ped-e3',
    discipline: 'pediatrics',
    difficulty: 'easy',
    question: 'At what age can solid foods typically be introduced to infants?',
    options: ['2 months', '4 months', '6 months', '9 months'],
    correctAnswer: 2,
    explanation: 'Health Canada recommends introducing solid foods around 6 months when developmentally ready.',
    points: 100,
  },
  {
    id: 'ped-e4',
    discipline: 'pediatrics',
    difficulty: 'easy',
    question: 'What is the priority assessment for a child with suspected epiglottitis?',
    options: ['Temperature', 'Throat inspection', 'Respiratory status', 'Blood pressure'],
    correctAnswer: 2,
    explanation: 'Respiratory status is priority. Never inspect throat as it may cause complete airway obstruction.',
    points: 100,
  },
  
  // Medium
  {
    id: 'ped-m1',
    discipline: 'pediatrics',
    difficulty: 'medium',
    question: 'A 4-year-old has croup. What assessment finding is expected?',
    options: ['Barking cough', 'Productive cough', 'Silent chest', 'Wheezing'],
    correctAnswer: 0,
    explanation: 'Croup causes characteristic barking or seal-like cough, stridor, and hoarseness.',
    points: 200,
  },
  {
    id: 'ped-m2',
    discipline: 'pediatrics',
    difficulty: 'medium',
    question: 'What is the most appropriate pain assessment tool for a 5-year-old?',
    options: ['FLACC scale', 'Numeric scale', 'Wong-Baker FACES', 'Verbal description'],
    correctAnswer: 2,
    explanation: 'Wong-Baker FACES pain scale is appropriate for children 3+ years who can identify facial expressions.',
    points: 200,
  },
  {
    id: 'ped-m3',
    discipline: 'pediatrics',
    difficulty: 'medium',
    question: 'A child with nephrotic syndrome should follow which diet?',
    options: ['Low sodium, low protein', 'High protein, low sodium', 'Low fat, high calcium', 'High potassium, low sodium'],
    correctAnswer: 1,
    explanation: 'High protein diet replaces protein lost in urine. Low sodium helps reduce edema.',
    points: 200,
  },
  
  // Hard
  {
    id: 'ped-h1',
    discipline: 'pediatrics',
    difficulty: 'hard',
    question: 'What is the priority intervention for a child experiencing a seizure?',
    options: ['Insert oral airway', 'Restrain the child', 'Protect from injury', 'Give anticonvulsant'],
    correctAnswer: 2,
    explanation: 'Protect from injury by removing hazards and positioning safely. Never force anything in mouth.',
    points: 300,
  },
  {
    id: 'ped-h2',
    discipline: 'pediatrics',
    difficulty: 'hard',
    question: 'A child with sickle cell crisis should receive which priority intervention?',
    options: ['Antibiotics', 'Hydration and pain management', 'Blood transfusion', 'Splenectomy'],
    correctAnswer: 1,
    explanation: 'Hydration prevents further sickling and pain management is essential during vaso-occlusive crisis.',
    points: 300,
  },

  // ============================================================================
  // MENTAL HEALTH NURSING (35 questions)
  // ============================================================================
  
  // Easy
  {
    id: 'mh-e1',
    discipline: 'mental-health',
    difficulty: 'easy',
    question: 'What is the therapeutic communication technique that involves restating what the client said?',
    options: ['Clarifying', 'Paraphrasing', 'Reflecting', 'Summarizing'],
    correctAnswer: 1,
    explanation: 'Paraphrasing involves restating the client\'s message in your own words to confirm understanding.',
    points: 100,
  },
  {
    id: 'mh-e2',
    discipline: 'mental-health',
    difficulty: 'easy',
    question: 'Which therapeutic communication technique should be avoided?',
    options: ['Open-ended questions', 'Giving advice', 'Active listening', 'Silence'],
    correctAnswer: 1,
    explanation: 'Giving advice is non-therapeutic as it removes client autonomy and problem-solving ability.',
    points: 100,
  },
  {
    id: 'mh-e3',
    discipline: 'mental-health',
    difficulty: 'easy',
    question: 'A client with depression says "I\'m worthless." What is the best response?',
    options: ['"No you\'re not!"', '"You seem to be feeling pretty down."', '"Everyone feels that way sometimes."', '"You should think positively."'],
    correctAnswer: 1,
    explanation: 'Reflecting feelings validates the client\'s emotions and encourages further expression.',
    points: 100,
  },
  {
    id: 'mh-e4',
    discipline: 'mental-health',
    difficulty: 'easy',
    question: 'What is the priority assessment for a newly admitted psychiatric client?',
    options: ['Medication history', 'Suicide risk', 'Family history', 'Social support'],
    correctAnswer: 1,
    explanation: 'Safety is always the priority. Suicide risk assessment must be done immediately.',
    points: 100,
  },
  
  // Medium
  {
    id: 'mh-m1',
    discipline: 'mental-health',
    difficulty: 'medium',
    question: 'A client with schizophrenia says "The FBI is monitoring my thoughts." What symptom is this?',
    options: ['Hallucination', 'Delusion', 'Illusion', 'Obsession'],
    correctAnswer: 1,
    explanation: 'Delusions are fixed false beliefs. This is a paranoid delusion of reference.',
    points: 200,
  },
  {
    id: 'mh-m2',
    discipline: 'mental-health',
    difficulty: 'medium',
    question: 'What is the priority concern when a client starts taking an SSRI antidepressant?',
    options: ['Weight gain', 'Increased suicide risk', 'Insomnia', 'Sexual dysfunction'],
    correctAnswer: 1,
    explanation: 'Energy returns before mood improves, temporarily increasing suicide risk in first 1-2 weeks.',
    points: 200,
  },
  {
    id: 'mh-m3',
    discipline: 'mental-health',
    difficulty: 'medium',
    question: 'A client taking lithium has a level of 1.8 mEq/L. What should the nurse do?',
    options: ['Continue current dose', 'Hold dose and notify MD', 'Increase dose', 'Give with food'],
    correctAnswer: 1,
    explanation: 'Therapeutic lithium range is 0.6-1.2 mEq/L. 1.8 indicates toxicity - hold dose and notify physician.',
    points: 200,
  },
  
  // Hard
  {
    id: 'mh-h1',
    discipline: 'mental-health',
    difficulty: 'hard',
    question: 'What is the priority intervention for a client experiencing alcohol withdrawal with tremors and agitation?',
    options: ['Fluids and nutrition', 'Benzodiazepine administration', 'Reality orientation', 'Physical restraints'],
    correctAnswer: 1,
    explanation: 'Benzodiazepines prevent seizures and DTs (delirium tremens) which can be life-threatening.',
    points: 300,
  },
  {
    id: 'mh-h2',
    discipline: 'mental-health',
    difficulty: 'hard',
    question: 'A client on MAOIs should avoid which food?',
    options: ['Bananas', 'Aged cheese', 'Milk', 'Whole grains'],
    correctAnswer: 1,
    explanation: 'Aged cheese contains tyramine which can cause hypertensive crisis with MAOIs.',
    points: 300,
  },

  // ============================================================================
  // MATERNAL-NEWBORN NURSING (35 questions)
  // ============================================================================
  
  // Easy
  {
    id: 'mn-e1',
    discipline: 'maternal-newborn',
    difficulty: 'easy',
    question: 'What is the normal duration of pregnancy?',
    options: ['38 weeks', '40 weeks', '42 weeks', '44 weeks'],
    correctAnswer: 1,
    explanation: 'Normal full-term pregnancy is 40 weeks from last menstrual period (LMP).',
    points: 100,
  },
  {
    id: 'mn-e2',
    discipline: 'maternal-newborn',
    difficulty: 'easy',
    question: 'What is the first action after birth?',
    options: ['Weigh baby', 'Dry and warm baby', 'Give vitamin K', 'Apply ID bands'],
    correctAnswer: 1,
    explanation: 'Immediately dry and warm the newborn to prevent cold stress and stimulate breathing.',
    points: 100,
  },
  {
    id: 'mn-e3',
    discipline: 'maternal-newborn',
    difficulty: 'easy',
    question: 'Normal fetal heart rate range is:',
    options: ['80-100 bpm', '110-160 bpm', '160-180 bpm', '180-200 bpm'],
    correctAnswer: 1,
    explanation: 'Normal fetal heart rate is 110-160 beats per minute.',
    points: 100,
  },
  {
    id: 'mn-e4',
    discipline: 'maternal-newborn',
    difficulty: 'easy',
    question: 'When should breastfeeding ideally begin after birth?',
    options: ['Within 1 hour', 'After 2 hours', 'After 4 hours', 'After 8 hours'],
    correctAnswer: 0,
    explanation: 'WHO recommends initiating breastfeeding within the first hour to promote bonding and milk production.',
    points: 100,
  },
  
  // Medium
  {
    id: 'mn-m1',
    discipline: 'maternal-newborn',
    difficulty: 'medium',
    question: 'What is the priority nursing action for postpartum hemorrhage?',
    options: ['Start IV fluids', 'Massage uterine fundus', 'Notify physician', 'Check vital signs'],
    correctAnswer: 1,
    explanation: 'Fundal massage stimulates uterine contraction to control bleeding (uterine atony is #1 cause of PPH).',
    points: 200,
  },
  {
    id: 'mn-m2',
    discipline: 'maternal-newborn',
    difficulty: 'medium',
    question: 'A pregnant client has BP 160/110 and +3 proteinuria. What condition is suspected?',
    options: ['Gestational diabetes', 'Preeclampsia', 'Placenta previa', 'Hyperemesis gravidarum'],
    correctAnswer: 1,
    explanation: 'Severe hypertension and proteinuria indicate preeclampsia, requiring immediate intervention.',
    points: 200,
  },
  {
    id: 'mn-m3',
    discipline: 'maternal-newborn',
    difficulty: 'medium',
    question: 'What medication is given to prevent ophthalmia neonatorum?',
    options: ['Vitamin K', 'Hepatitis B vaccine', 'Erythromycin eye ointment', 'Silver nitrate drops'],
    correctAnswer: 2,
    explanation: 'Erythromycin eye ointment prevents eye infection from gonorrhea/chlamydia during birth.',
    points: 200,
  },
  
  // Hard
  {
    id: 'mn-h1',
    discipline: 'maternal-newborn',
    difficulty: 'hard',
    question: 'A laboring client has late decelerations on fetal monitor. What is the priority action?',
    options: ['Continue monitoring', 'Change maternal position', 'Prepare for C-section', 'Increase oxytocin'],
    correctAnswer: 1,
    explanation: 'Late decelerations indicate uteroplacental insufficiency. Position change (left lateral) improves blood flow.',
    points: 300,
  },
  {
    id: 'mn-h2',
    discipline: 'maternal-newborn',
    difficulty: 'hard',
    question: 'What is the antidote for magnesium sulfate toxicity?',
    options: ['Calcium gluconate', 'Naloxone', 'Protamine sulfate', 'Vitamin K'],
    correctAnswer: 0,
    explanation: 'Calcium gluconate reverses magnesium sulfate toxicity (used for seizure prophylaxis in preeclampsia).',
    points: 300,
  },

  // ============================================================================
  // COMMUNITY HEALTH NURSING (30 questions)
  // ============================================================================
  
  // Easy
  {
    id: 'ch-e1',
    discipline: 'community-health',
    difficulty: 'easy',
    question: 'What is the focus of community health nursing?',
    options: ['Individual care', 'Hospital care', 'Population health', 'Acute illness'],
    correctAnswer: 2,
    explanation: 'Community health nursing focuses on health promotion and disease prevention for populations.',
    points: 100,
  },
  {
    id: 'ch-e2',
    discipline: 'community-health',
    difficulty: 'easy',
    question: 'Which is an example of primary prevention?',
    options: ['Mammography screening', 'Immunizations', 'Physical therapy', 'Insulin for diabetes'],
    correctAnswer: 1,
    explanation: 'Immunizations are primary prevention - preventing disease before it occurs.',
    points: 100,
  },
  {
    id: 'ch-e3',
    discipline: 'community-health',
    difficulty: 'easy',
    question: 'What does the Canada Health Act guarantee?',
    options: ['Free medications', 'Universal healthcare access', 'Private insurance', 'Dental care'],
    correctAnswer: 1,
    explanation: 'Canada Health Act ensures universal access to medically necessary hospital and physician services.',
    points: 100,
  },
  {
    id: 'ch-e4',
    discipline: 'community-health',
    difficulty: 'easy',
    question: 'What is the primary social determinant of health?',
    options: ['Genetics', 'Healthcare access', 'Income and social status', 'Personal behavior'],
    correctAnswer: 2,
    explanation: 'Income and social status are the strongest determinants affecting health outcomes.',
    points: 100,
  },
  
  // Medium
  {
    id: 'ch-m1',
    discipline: 'community-health',
    difficulty: 'medium',
    question: 'What is secondary prevention?',
    options: ['Health promotion', 'Early detection and treatment', 'Rehabilitation', 'Disease prevention'],
    correctAnswer: 1,
    explanation: 'Secondary prevention is early detection/screening (e.g., Pap tests, mammograms).',
    points: 200,
  },
  {
    id: 'ch-m2',
    discipline: 'community-health',
    difficulty: 'medium',
    question: 'Which nursing intervention addresses the social determinant of housing?',
    options: ['Medication teaching', 'Referral to housing programs', 'Wound care', 'Pain management'],
    correctAnswer: 1,
    explanation: 'Referring to housing programs directly addresses housing instability as a health determinant.',
    points: 200,
  },
  {
    id: 'ch-m3',
    discipline: 'community-health',
    difficulty: 'medium',
    question: 'What is harm reduction in substance use?',
    options: ['Complete abstinence', 'Minimizing negative consequences', 'Forced treatment', 'Isolation'],
    correctAnswer: 1,
    explanation: 'Harm reduction focuses on reducing harmful effects of substance use without requiring abstinence.',
    points: 200,
  },
  
  // Hard
  {
    id: 'ch-h1',
    discipline: 'community-health',
    difficulty: 'hard',
    question: 'What is the primary goal of the Ottawa Charter for Health Promotion?',
    options: ['Treat disease', 'Build healthy public policy', 'Provide acute care', 'Increase hospital beds'],
    correctAnswer: 1,
    explanation: 'Ottawa Charter emphasizes building healthy public policy to create supportive environments for health.',
    points: 300,
  },
  {
    id: 'ch-h2',
    discipline: 'community-health',
    difficulty: 'hard',
    question: 'What principle guides nursing care for Indigenous populations in Canada?',
    options: ['Assimilation', 'Cultural safety', 'Standard protocols', 'Efficiency'],
    correctAnswer: 1,
    explanation: 'Cultural safety recognizes power imbalances and addresses health inequities for Indigenous peoples.',
    points: 300,
  },

  // ============================================================================
  // CRITICAL CARE NURSING (35 questions)
  // ============================================================================
  
  // Easy
  {
    id: 'cc-e1',
    discipline: 'critical-care',
    difficulty: 'easy',
    question: 'What is the normal range for oxygen saturation (SpO2)?',
    options: ['75-85%', '85-90%', '90-95%', '95-100%'],
    correctAnswer: 3,
    explanation: 'Normal oxygen saturation is 95-100%. Below 90% indicates hypoxemia.',
    points: 100,
  },
  {
    id: 'cc-e2',
    discipline: 'critical-care',
    difficulty: 'easy',
    question: 'What is the first-line treatment for ventricular fibrillation?',
    options: ['CPR only', 'Defibrillation', 'Epinephrine', 'Amiodarone'],
    correctAnswer: 1,
    explanation: 'Immediate defibrillation is the priority treatment for VF to restore normal rhythm.',
    points: 100,
  },
  {
    id: 'cc-e3',
    discipline: 'critical-care',
    difficulty: 'easy',
    question: 'What does PEEP stand for in mechanical ventilation?',
    options: ['Positive End Expiratory Pressure', 'Prolonged Expiratory Effort Process', 'Pulmonary Edema Emergency Protocol', 'Patient Evaluation and Emergency Procedure'],
    correctAnswer: 0,
    explanation: 'PEEP maintains positive pressure in airways at end of expiration to prevent alveolar collapse.',
    points: 100,
  },
  {
    id: 'cc-e4',
    discipline: 'critical-care',
    difficulty: 'easy',
    question: 'What is the priority assessment for a client on a ventilator?',
    options: ['Urine output', 'Breath sounds', 'Blood pressure', 'Temperature'],
    correctAnswer: 1,
    explanation: 'Breath sounds assess ventilation effectiveness and detect complications like pneumothorax.',
    points: 100,
  },
  
  // Medium
  {
    id: 'cc-m1',
    discipline: 'critical-care',
    difficulty: 'medium',
    question: 'A client in septic shock is receiving norepinephrine. What should the nurse monitor?',
    options: ['Urine output only', 'Blood pressure and perfusion', 'Temperature', 'Respiratory rate'],
    correctAnswer: 1,
    explanation: 'Norepinephrine is a vasopressor. Monitor BP, perfusion, and for extravasation causing tissue necrosis.',
    points: 200,
  },
  {
    id: 'cc-m2',
    discipline: 'critical-care',
    difficulty: 'medium',
    question: 'What arterial blood gas result indicates respiratory acidosis?',
    options: ['pH 7.50, PaCO2 30', 'pH 7.30, PaCO2 50', 'pH 7.50, HCO3 30', 'pH 7.30, HCO3 18'],
    correctAnswer: 1,
    explanation: 'Low pH (acidosis) with high PaCO2 (retained CO2) = respiratory acidosis.',
    points: 200,
  },
  {
    id: 'cc-m3',
    discipline: 'critical-care',
    difficulty: 'medium',
    question: 'What is the priority intervention for a client with increased intracranial pressure?',
    options: ['Lower head of bed', 'Elevate head of bed 30 degrees', 'Give hypotonic fluids', 'Cluster nursing care'],
    correctAnswer: 1,
    explanation: 'Elevate HOB 30 degrees to promote venous drainage and reduce ICP. Avoid clustering care.',
    points: 200,
  },
  
  // Hard
  {
    id: 'cc-h1',
    discipline: 'critical-care',
    difficulty: 'hard',
    question: 'A post-op client has urine output 20 mL/hr, CVP 2 mmHg, hypotension. What is the priority?',
    options: ['Give diuretic', 'Fluid bolus', 'Start dopamine', 'Notify surgeon'],
    correctAnswer: 1,
    explanation: 'Low CVP and oliguria indicate hypovolemia. Fluid resuscitation is the priority.',
    points: 300,
  },
  {
    id: 'cc-h2',
    discipline: 'critical-care',
    difficulty: 'hard',
    question: 'What is the treatment for acute hyperkalemia with peaked T waves on ECG?',
    options: ['Sodium bicarbonate', 'Calcium gluconate', 'Insulin and glucose', 'All of the above'],
    correctAnswer: 3,
    explanation: 'Calcium stabilizes myocardium, insulin+glucose/bicarb shift K+ into cells. May need dialysis.',
    points: 300,
  },
];

// Helper function to get questions by discipline
export const getQuestionsByDiscipline = (discipline: string): NursingQuestion[] => {
  return NURSING_QUESTIONS.filter(q => q.discipline === discipline);
};

// Helper function to get random question
export const getRandomQuestion = (
  discipline: string,
  difficulties: string[],
  excludeIds: string[] = []
): NursingQuestion | null => {
  const filtered = NURSING_QUESTIONS.filter(
    q => q.discipline === discipline && 
         difficulties.includes(q.difficulty) &&
         !excludeIds.includes(q.id)
  );
  
  if (filtered.length === 0) return null;
  
  const randomIndex = Math.floor(Math.random() * filtered.length);
  return filtered[randomIndex];
};
