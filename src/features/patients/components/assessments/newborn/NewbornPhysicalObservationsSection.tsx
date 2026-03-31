import React from 'react';
import type { PhysicalObservations } from '../../../types/newbornAssessment';
import { NormalVarianceRow } from './NormalVarianceRow';

interface NewbornPhysicalObservationsSectionProps {
  observations: PhysicalObservations;
  onChange: (updated: PhysicalObservations) => void;
}

// Helper to produce a setter for a nested key within a system section
function useSectionUpdater(
  system: keyof PhysicalObservations,
  observations: PhysicalObservations,
  onChange: (updated: PhysicalObservations) => void
) {
  return (key: string, value: string[] | string) => {
    onChange({
      ...observations,
      [system]: {
        ...(observations[system] ?? {}),
        [key]: value,
      },
    });
  };
}

// ─── Section header ───────────────────────────────────────────────────────────
const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
  <tr className="bg-gray-100">
    <td colSpan={3} className="py-1.5 px-2 text-xs font-bold text-gray-700 uppercase tracking-wide">
      {title}
    </td>
  </tr>
);

// ─── Column header row ────────────────────────────────────────────────────────
const ColumnHeaders: React.FC = () => (
  <tr className="bg-gray-50 border-b-2 border-gray-200">
    <th className="py-1.5 pr-3 text-left text-xs font-semibold text-gray-600 w-32"></th>
    <th className="py-1.5 pr-4 text-left text-xs font-semibold text-green-700">Normal</th>
    <th className="py-1.5 text-left text-xs font-semibold text-amber-600">
      Variance <span className="text-gray-400 font-normal">(requires Multidisciplinary Notes)</span>
    </th>
  </tr>
);

export const NewbornPhysicalObservationsSection: React.FC<NewbornPhysicalObservationsSectionProps> = ({
  observations,
  onChange,
}) => {
  const head = observations.head ?? {};
  const neck = observations.neck ?? {};
  const chest = observations.chest ?? {};
  const cardio = observations.cardiovascular ?? {};
  const resp = observations.respiratory ?? {};
  const abdomen = observations.abdomen ?? {};
  const skeletal = observations.skeletal ?? {};
  const genitalia = observations.genitalia ?? {};
  const skin = observations.skin ?? {};
  const neuro = observations.neuromuscular ?? {};

  const updateHead = useSectionUpdater('head', observations, onChange);
  const updateNeck = useSectionUpdater('neck', observations, onChange);
  const updateChest = useSectionUpdater('chest', observations, onChange);
  const updateCardio = useSectionUpdater('cardiovascular', observations, onChange);
  const updateResp = useSectionUpdater('respiratory', observations, onChange);
  const updateAbdomen = useSectionUpdater('abdomen', observations, onChange);
  const updateSkeletal = useSectionUpdater('skeletal', observations, onChange);
  const updateGenitalia = useSectionUpdater('genitalia', observations, onChange);
  const updateSkin = useSectionUpdater('skin', observations, onChange);
  const updateNeuro = useSectionUpdater('neuromuscular', observations, onChange);

  return (
    <div className="overflow-x-auto">
      <p className="text-xs text-gray-500 italic mb-2">
        Check all that apply. Variances require an entry in Multidisciplinary Notes and must be reported at transfer of care.
      </p>
      <table className="w-full border-collapse">
        <thead>
          <ColumnHeaders />
        </thead>
        <tbody>
          {/* ── HEAD ── */}
          <SectionHeader title="Head" />
          <NormalVarianceRow
            label="Scalp/Skull"
            normalOptions={['Moulding']}
            varianceOptions={['Caput', 'Vacuum/forcep marks', 'Cephalohematoma']}
            selectedNormal={head.scalp_skull_normal ?? []}
            selectedVariance={head.scalp_skull_variance ?? []}
            onNormalChange={v => updateHead('scalp_skull_normal', v)}
            onVarianceChange={v => updateHead('scalp_skull_variance', v)}
            showVarianceOther varianceOther={head.scalp_skull_other}
            onVarianceOtherChange={v => updateHead('scalp_skull_other', v)}
          />
          <NormalVarianceRow
            label="Facial Appearance"
            normalOptions={['Symmetrical']}
            varianceOptions={[]}
            selectedNormal={head.facial_appearance_normal ?? []}
            selectedVariance={head.facial_appearance_variance ?? []}
            onNormalChange={v => updateHead('facial_appearance_normal', v)}
            onVarianceChange={v => updateHead('facial_appearance_variance', v)}
            showVarianceOther varianceOther={head.facial_appearance_variance?.find(x => !['Symmetrical'].includes(x))}
            onVarianceOtherChange={v => updateHead('facial_appearance_variance', v ? [v] : [])}
          />
          <NormalVarianceRow
            label="Anterior Fontanelle"
            normalOptions={['Open', 'Soft/flat']}
            varianceOptions={['Closed', 'Bulging', 'Sunken']}
            selectedNormal={head.anterior_fontanelle_normal ?? []}
            selectedVariance={head.anterior_fontanelle_variance ?? []}
            onNormalChange={v => updateHead('anterior_fontanelle_normal', v)}
            onVarianceChange={v => updateHead('anterior_fontanelle_variance', v)}
          />
          <NormalVarianceRow
            label="Posterior Fontanelle"
            normalOptions={['Open']}
            varianceOptions={['Closed']}
            selectedNormal={head.posterior_fontanelle_normal ?? []}
            selectedVariance={head.posterior_fontanelle_variance ?? []}
            onNormalChange={v => updateHead('posterior_fontanelle_normal', v)}
            onVarianceChange={v => updateHead('posterior_fontanelle_variance', v)}
          />
          <NormalVarianceRow
            label="Eyes"
            normalOptions={['Symmetrical', 'Edematous lids']}
            varianceOptions={['Discharge', 'Subconjunctival hemorrhage']}
            selectedNormal={head.eyes_normal ?? []}
            selectedVariance={head.eyes_variance ?? []}
            onNormalChange={v => updateHead('eyes_normal', v)}
            onVarianceChange={v => updateHead('eyes_variance', v)}
            showVarianceOther varianceOther={head.eyes_other}
            onVarianceOtherChange={v => updateHead('eyes_other', v)}
          />
          <NormalVarianceRow
            label="Ears"
            normalOptions={['Aligned with outer canthus', 'Well-formed cartilage']}
            varianceOptions={['Ear tag', 'Low set']}
            selectedNormal={head.ears_normal ?? []}
            selectedVariance={head.ears_variance ?? []}
            onNormalChange={v => updateHead('ears_normal', v)}
            onVarianceChange={v => updateHead('ears_variance', v)}
            showVarianceOther varianceOther={head.ears_other}
            onVarianceOtherChange={v => updateHead('ears_other', v)}
          />
          <NormalVarianceRow
            label="Nose"
            normalOptions={['Symmetrical', 'Patent nares']}
            varianceOptions={[]}
            selectedNormal={head.nose_normal ?? []}
            selectedVariance={head.nose_variance ?? []}
            onNormalChange={v => updateHead('nose_normal', v)}
            onVarianceChange={v => updateHead('nose_variance', v)}
            showVarianceOther varianceOther={head.nose_other}
            onVarianceOtherChange={v => updateHead('nose_other', v)}
          />
          <NormalVarianceRow
            label="Mouth"
            normalOptions={['Intact lips', 'Intact palate']}
            varianceOptions={['Tight frenulum']}
            selectedNormal={head.mouth_normal ?? []}
            selectedVariance={head.mouth_variance ?? []}
            onNormalChange={v => updateHead('mouth_normal', v)}
            onVarianceChange={v => updateHead('mouth_variance', v)}
            showVarianceOther varianceOther={head.mouth_other}
            onVarianceOtherChange={v => updateHead('mouth_other', v)}
          />

          {/* ── NECK ── */}
          <SectionHeader title="Neck" />
          <NormalVarianceRow
            label="Neck"
            normalOptions={['Full range of motion']}
            varianceOptions={['Limited range of motion']}
            selectedNormal={neck.neck_normal ?? []}
            selectedVariance={neck.neck_variance ?? []}
            onNormalChange={v => updateNeck('neck_normal', v)}
            onVarianceChange={v => updateNeck('neck_variance', v)}
            showVarianceOther varianceOther={neck.neck_other}
            onVarianceOtherChange={v => updateNeck('neck_other', v)}
          />

          {/* ── CHEST ── */}
          <SectionHeader title="Chest" />
          <NormalVarianceRow
            label="Shape"
            normalOptions={['Symmetrical', 'Round', 'Intact clavicles']}
            varianceOptions={[]}
            selectedNormal={chest.shape_normal ?? []}
            selectedVariance={chest.shape_variance ?? []}
            onNormalChange={v => updateChest('shape_normal', v)}
            onVarianceChange={v => updateChest('shape_variance', v)}
            showVarianceOther varianceOther={chest.shape_other}
            onVarianceOtherChange={v => updateChest('shape_other', v)}
          />
          <NormalVarianceRow
            label="Breasts"
            normalOptions={['Breast tissue']}
            varianceOptions={[]}
            selectedNormal={chest.breasts_normal ?? []}
            selectedVariance={chest.breasts_variance ?? []}
            onNormalChange={v => updateChest('breasts_normal', v)}
            onVarianceChange={v => updateChest('breasts_variance', v)}
            showVarianceOther varianceOther={chest.breasts_other}
            onVarianceOtherChange={v => updateChest('breasts_other', v)}
          />

          {/* ── CARDIOVASCULAR ── */}
          <SectionHeader title="Cardiovascular" />
          <NormalVarianceRow
            label="Rate"
            normalOptions={['100–160 bpm']}
            varianceOptions={['Tachycardia', 'Bradycardia']}
            selectedNormal={cardio.rate_normal ?? []}
            selectedVariance={cardio.rate_variance ?? []}
            onNormalChange={v => updateCardio('rate_normal', v)}
            onVarianceChange={v => updateCardio('rate_variance', v)}
          />
          <NormalVarianceRow
            label="Rhythm"
            normalOptions={['Regular']}
            varianceOptions={['Irregular', 'Murmur']}
            selectedNormal={cardio.rhythm_normal ?? []}
            selectedVariance={cardio.rhythm_variance ?? []}
            onNormalChange={v => updateCardio('rhythm_normal', v)}
            onVarianceChange={v => updateCardio('rhythm_variance', v)}
          />

          {/* ── RESPIRATORY ── */}
          <SectionHeader title="Respiratory" />
          <NormalVarianceRow
            label="Air Entry"
            normalOptions={['Equal bilaterally']}
            varianceOptions={['Decreased: Left', 'Decreased: Right']}
            selectedNormal={resp.air_entry_normal ?? []}
            selectedVariance={resp.air_entry_variance ?? []}
            onNormalChange={v => updateResp('air_entry_normal', v)}
            onVarianceChange={v => updateResp('air_entry_variance', v)}
          />
          <NormalVarianceRow
            label="Breath Sounds"
            normalOptions={['Clear']}
            varianceOptions={['Crackles']}
            selectedNormal={resp.breath_sounds_normal ?? []}
            selectedVariance={resp.breath_sounds_variance ?? []}
            onNormalChange={v => updateResp('breath_sounds_normal', v)}
            onVarianceChange={v => updateResp('breath_sounds_variance', v)}
            showVarianceOther varianceOther={resp.breath_sounds_other}
            onVarianceOtherChange={v => updateResp('breath_sounds_other', v)}
          />
          <NormalVarianceRow
            label="Rate"
            normalOptions={['30–60 per minute']}
            varianceOptions={['Tachypnea', 'Bradypnea', 'Apneic episodes >15 seconds']}
            selectedNormal={resp.rate_normal ?? []}
            selectedVariance={resp.rate_variance ?? []}
            onNormalChange={v => updateResp('rate_normal', v)}
            onVarianceChange={v => updateResp('rate_variance', v)}
          />
          <NormalVarianceRow
            label="Effort"
            normalOptions={['Effortless']}
            varianceOptions={['Laboured', 'Indrawing/retractions', 'Nasal flaring', 'Grunting']}
            selectedNormal={resp.effort_normal ?? []}
            selectedVariance={resp.effort_variance ?? []}
            onNormalChange={v => updateResp('effort_normal', v)}
            onVarianceChange={v => updateResp('effort_variance', v)}
          />

          {/* ── ABDOMEN ── */}
          <SectionHeader title="Abdomen" />
          <NormalVarianceRow
            label="Shape/Contour"
            normalOptions={['Soft', 'Round']}
            varianceOptions={['Distended', 'Flat/concave', 'Hernia']}
            selectedNormal={abdomen.shape_normal ?? []}
            selectedVariance={abdomen.shape_variance ?? []}
            onNormalChange={v => updateAbdomen('shape_normal', v)}
            onVarianceChange={v => updateAbdomen('shape_variance', v)}
            showVarianceOther varianceOther={abdomen.shape_other}
            onVarianceOtherChange={v => updateAbdomen('shape_other', v)}
          />
          <NormalVarianceRow
            label="Bowel Sounds"
            normalOptions={['Bowel sounds present']}
            varianceOptions={['Bowel sounds absent']}
            selectedNormal={abdomen.bowel_sounds_normal ?? []}
            selectedVariance={abdomen.bowel_sounds_variance ?? []}
            onNormalChange={v => updateAbdomen('bowel_sounds_normal', v)}
            onVarianceChange={v => updateAbdomen('bowel_sounds_variance', v)}
          />
          <NormalVarianceRow
            label="Umbilical Cord"
            normalOptions={['3 Vessels']}
            varianceOptions={['2 Vessels']}
            selectedNormal={abdomen.umbilical_cord_normal ?? []}
            selectedVariance={abdomen.umbilical_cord_variance ?? []}
            onNormalChange={v => updateAbdomen('umbilical_cord_normal', v)}
            onVarianceChange={v => updateAbdomen('umbilical_cord_variance', v)}
          />

          {/* ── SKELETAL / EXTREMITIES ── */}
          <SectionHeader title="Skeletal/Extremities" />
          <NormalVarianceRow
            label="Extremities"
            normalOptions={['10 fingers', '10 toes', 'Equal arm lengths', 'Equal leg lengths', 'Equal gluteal folds', 'Full range of motion']}
            varianceOptions={['Polydactyly', 'Webbing of toes/fingers', 'Asymmetrical extremities', 'Unequal gluteal folds', 'Impaired range of motion']}
            selectedNormal={skeletal.extremities_normal ?? []}
            selectedVariance={skeletal.extremities_variance ?? []}
            onNormalChange={v => updateSkeletal('extremities_normal', v)}
            onVarianceChange={v => updateSkeletal('extremities_variance', v)}
            showVarianceOther varianceOther={skeletal.extremities_other}
            onVarianceOtherChange={v => updateSkeletal('extremities_other', v)}
          />
          <NormalVarianceRow
            label="Spine"
            normalOptions={['Intact', 'Straight', 'Midline']}
            varianceOptions={['Spina Bifida', 'Curvature', 'Tuft of hair', 'Coccygeal dimple']}
            selectedNormal={skeletal.spine_normal ?? []}
            selectedVariance={skeletal.spine_variance ?? []}
            onNormalChange={v => updateSkeletal('spine_normal', v)}
            onVarianceChange={v => updateSkeletal('spine_variance', v)}
            showVarianceOther varianceOther={skeletal.spine_other}
            onVarianceOtherChange={v => updateSkeletal('spine_other', v)}
          />

          {/* ── GENITALIA ── */}
          <SectionHeader title="Genitalia" />
          <NormalVarianceRow
            label="Gender"
            normalOptions={['Gender specific genitalia']}
            varianceOptions={['Undifferentiated gender']}
            selectedNormal={genitalia.gender_normal ?? []}
            selectedVariance={genitalia.gender_variance ?? []}
            onNormalChange={v => updateGenitalia('gender_normal', v)}
            onVarianceChange={v => updateGenitalia('gender_variance', v)}
          />
          <NormalVarianceRow
            label="Male"
            normalOptions={['Anus visualized', 'Scrotum present', 'Testes descended', 'Central urethral opening']}
            varianceOptions={['No anal opening', 'Hydrocele', 'Undescended testes/not palpable', 'Hypospadias']}
            selectedNormal={genitalia.male_normal ?? []}
            selectedVariance={genitalia.male_variance ?? []}
            onNormalChange={v => updateGenitalia('male_normal', v)}
            onVarianceChange={v => updateGenitalia('male_variance', v)}
            showVarianceOther varianceOther={genitalia.male_other}
            onVarianceOtherChange={v => updateGenitalia('male_other', v)}
          />
          <NormalVarianceRow
            label="Female"
            normalOptions={['Anus visualized', 'Urethra visualized', 'Labia majora formed', 'Vaginal skin tag']}
            varianceOptions={['No anal opening', 'Urethra not visible', 'Fusion of labia']}
            selectedNormal={genitalia.female_normal ?? []}
            selectedVariance={genitalia.female_variance ?? []}
            onNormalChange={v => updateGenitalia('female_normal', v)}
            onVarianceChange={v => updateGenitalia('female_variance', v)}
            showVarianceOther varianceOther={genitalia.female_other}
            onVarianceOtherChange={v => updateGenitalia('female_other', v)}
          />

          {/* ── SKIN ── */}
          <SectionHeader title="Skin" />
          <NormalVarianceRow
            label="Integrity"
            normalOptions={['Intact', 'Slight peeling', 'Dry', 'Mongolian spots', 'Sole creases']}
            varianceOptions={['Laceration/broken skin', 'Rash', 'Bruising', 'Petechia', 'Birth mark/stork bite', 'Absent sole creases']}
            selectedNormal={skin.integrity_normal ?? []}
            selectedVariance={skin.integrity_variance ?? []}
            onNormalChange={v => updateSkin('integrity_normal', v)}
            onVarianceChange={v => updateSkin('integrity_variance', v)}
          />
          <NormalVarianceRow
            label="Turgor"
            normalOptions={['Elastic']}
            varianceOptions={['Decreased']}
            selectedNormal={skin.turgor_normal ?? []}
            selectedVariance={skin.turgor_variance ?? []}
            onNormalChange={v => updateSkin('turgor_normal', v)}
            onVarianceChange={v => updateSkin('turgor_variance', v)}
          />
          <NormalVarianceRow
            label="Color"
            normalOptions={['Centrally pink', 'Acrocyanosis']}
            varianceOptions={['Pallor', 'Central cyanosis', 'Plethora', 'Mottling']}
            selectedNormal={skin.color_normal ?? []}
            selectedVariance={skin.color_variance ?? []}
            onNormalChange={v => updateSkin('color_normal', v)}
            onVarianceChange={v => updateSkin('color_variance', v)}
            showVarianceOther varianceOther={skin.color_other}
            onVarianceOtherChange={v => updateSkin('color_other', v)}
          />

          {/* ── NEUROMUSCULAR ── */}
          <SectionHeader title="Neuromuscular" />
          <NormalVarianceRow
            label="Tone"
            normalOptions={['Active tone', 'Flexed limbs']}
            varianceOptions={['Hypertonia', 'Hypotonia', 'Jittery']}
            selectedNormal={neuro.tone_normal ?? []}
            selectedVariance={neuro.tone_variance ?? []}
            onNormalChange={v => updateNeuro('tone_normal', v)}
            onVarianceChange={v => updateNeuro('tone_variance', v)}
            showVarianceOther varianceOther={neuro.tone_other}
            onVarianceOtherChange={v => updateNeuro('tone_other', v)}
          />
          <NormalVarianceRow
            label="Reflexes"
            normalOptions={['Moro reflex (startle)', 'Palmar reflex (grasp)', 'Sucking reflex', 'Rooting']}
            varianceOptions={[]}
            selectedNormal={neuro.reflexes_normal ?? []}
            selectedVariance={[]}
            onNormalChange={v => updateNeuro('reflexes_normal', v)}
            onVarianceChange={() => {}}
            showVarianceOther varianceOther={neuro.reflexes_variance_specify}
            onVarianceOtherChange={v => updateNeuro('reflexes_variance_specify', v)}
          />
          <NormalVarianceRow
            label="Cry"
            normalOptions={['Lusty']}
            varianceOptions={['Weak', 'High pitched', 'Inconsolable']}
            selectedNormal={neuro.cry_normal ?? []}
            selectedVariance={neuro.cry_variance ?? []}
            onNormalChange={v => updateNeuro('cry_normal', v)}
            onVarianceChange={v => updateNeuro('cry_variance', v)}
          />
        </tbody>
      </table>
    </div>
  );
};
