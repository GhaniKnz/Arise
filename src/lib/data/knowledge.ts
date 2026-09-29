import type { Evidence } from "@/lib/domain/insights";

export type SourceType =
  | "Méta-analyse"
  | "Revue systématique"
  | "Consensus"
  | "Position officielle"
  | "Essai contrôlé"
  | "Étude observationnelle"
  | "Revue narrative"
  | "Recommandation";

export interface Source {
  authors: string;
  year: number;
  title: string;
  journal: string;
  type: SourceType;
}

export interface Claim {
  text: string;
  evidence: Evidence;
}

export type ArticleCategory = "nutrition" | "entrainement" | "recuperation" | "corps";

export interface Article {
  slug: string;
  title: string;
  category: ArticleCategory;
  summary: string;
  claims: Claim[];
  practical: string[];
  sources: Source[];
  readMin: number;
}

export const CATEGORY_LABEL: Record<ArticleCategory, string> = {
  nutrition: "Nutrition",
  entrainement: "Entraînement",
  recuperation: "Récupération",
  corps: "Corps & mesure",
};

export const EVIDENCE_META: Record<Evidence, { label: string; desc: string }> = {
  solide: { label: "Données solides", desc: "Méta-analyses ou consensus concordants" },
  limitée: { label: "Données limitées", desc: "Peu d'études, petits échantillons ou résultats partiels" },
  hypothèse: { label: "Hypothèse", desc: "Mécanisme plausible, pas encore démontré directement" },
};

/** PubMed search link built from the exact title: always resolves to the real record. */
export function pubmedUrl(s: Source): string {
  return `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(s.title)}`;
}

export const ARTICLES: Article[] = [
  {
    slug: "deficit-calorique",
    title: "Déficit calorique : la base de la perte de gras",
    category: "nutrition",
    readMin: 4,
    summary:
      "Perdre de la graisse demande un déficit énergétique maintenu dans le temps. La vitesse compte : une perte modérée protège mieux la masse musculaire et les performances.",
    claims: [
      { text: "La perte de masse grasse nécessite un déficit énergétique soutenu (apport < dépense).", evidence: "solide" },
      { text: "La règle « 7 700 kcal = 1 kg » est une approximation : la perte ralentit avec le temps car la dépense diminue quand le poids baisse.", evidence: "solide" },
      { text: "Chez des athlètes, un rythme d'environ 0,7 % du poids/semaine a mieux préservé la masse maigre qu'un rythme deux fois plus rapide.", evidence: "limitée" },
      { text: "Pour des pratiquants entraînés, un rythme de 0,5–1 % du poids par semaine est recommandé en préparation.", evidence: "limitée" },
    ],
    practical: [
      "Vise environ −0,5 à −0,7 % de ton poids par semaine (≈ −0,4 à −0,55 kg pour 80 kg).",
      "Juge sur la moyenne 7 jours et sur 2–3 semaines, pas sur une pesée isolée.",
      "Ajuste par petits pas (100–150 kcal) seulement si la tendance stagne 2 semaines.",
    ],
    sources: [
      { authors: "Hall KD, Sacks G, Chandramohan D, et al.", year: 2011, title: "Quantification of the effect of energy imbalance on bodyweight", journal: "The Lancet", type: "Revue narrative" },
      { authors: "Garthe I, Raastad T, Refsnes PE, Koivisto A, Sundgot-Borgen J", year: 2011, title: "Effect of two different weight-loss rates on body composition and strength and power-related performance in elite athletes", journal: "Int J Sport Nutr Exerc Metab", type: "Essai contrôlé" },
      { authors: "Helms ER, Aragon AA, Fitschen PJ", year: 2014, title: "Evidence-based recommendations for natural bodybuilding contest preparation: nutrition and supplementation", journal: "J Int Soc Sports Nutr", type: "Revue narrative" },
      { authors: "Rosenbaum M, Leibel RL", year: 2010, title: "Adaptive thermogenesis in humans", journal: "Int J Obes", type: "Revue narrative" },
    ],
  },
  {
    slug: "proteines",
    title: "Protéines : combien et comment les répartir",
    category: "nutrition",
    readMin: 5,
    summary:
      "Un apport protéique élevé soutient la prise de muscle et limite la perte de masse maigre en déficit. Au-delà d'un certain seuil, le bénéfice supplémentaire devient faible.",
    claims: [
      { text: "Environ 1,6 g/kg/jour maximise en moyenne les gains liés à la musculation ; la limite haute de l'intervalle de confiance se situe vers 2,2 g/kg.", evidence: "solide" },
      { text: "En déficit chez des sujets entraînés et secs, des apports plus élevés (≈ 2,3–3,1 g/kg de masse maigre) ont été proposés pour préserver le muscle.", evidence: "limitée" },
      { text: "Répartir les protéines en 3 à 5 prises d'environ 0,4 g/kg semble optimiser la synthèse protéique sur la journée.", evidence: "limitée" },
      { text: "Une prise de caséine (~40 g) avant le coucher a amélioré les gains dans un essai de 12 semaines.", evidence: "limitée" },
    ],
    practical: [
      "Ton objectif ARISE est calculé à ~1,8–2,1 g/kg selon ton but.",
      "Mets une vraie source de protéines à chaque repas (skyr, œufs, viande, poisson, tofu, légumineuses).",
      "La whey est un aliment pratique, pas une obligation.",
    ],
    sources: [
      { authors: "Morton RW, Murphy KT, McKellar SR, et al.", year: 2018, title: "A systematic review, meta-analysis and meta-regression of the effect of protein supplementation on resistance training-induced gains in muscle mass and strength in healthy adults", journal: "Br J Sports Med", type: "Méta-analyse" },
      { authors: "Helms ER, Zinn C, Rowlands DS, Brown SR", year: 2014, title: "A systematic review of dietary protein during caloric restriction in resistance trained lean athletes: a case for higher intakes", journal: "Int J Sport Nutr Exerc Metab", type: "Revue systématique" },
      { authors: "Jäger R, Kerksick CM, Campbell BI, et al.", year: 2017, title: "International Society of Sports Nutrition Position Stand: protein and exercise", journal: "J Int Soc Sports Nutr", type: "Position officielle" },
      { authors: "Schoenfeld BJ, Aragon AA", year: 2018, title: "How much protein can the body use in a single meal for muscle-building? Implications for daily protein distribution", journal: "J Int Soc Sports Nutr", type: "Revue narrative" },
      { authors: "Snijders T, Res PT, Smeets JS, et al.", year: 2015, title: "Protein Ingestion before Sleep Increases Muscle Mass and Strength Gains during Prolonged Resistance-Type Exercise Training in Healthy Young Men", journal: "J Nutr", type: "Essai contrôlé" },
    ],
  },
  {
    slug: "hypertrophie-volume",
    title: "Volume, fréquence et charges pour l'hypertrophie",
    category: "entrainement",
    readMin: 5,
    summary:
      "Le nombre de séries difficiles par muscle et par semaine est l'un des leviers majeurs de l'hypertrophie. La fréquence sert surtout à répartir ce volume.",
    claims: [
      { text: "Il existe une relation dose-réponse : ≥ 10 séries par muscle et par semaine produisent plus d'hypertrophie que moins de 5.", evidence: "solide" },
      { text: "À volume égal, la fréquence (1× vs 2×+ par semaine) a un effet faible ; elle aide surtout à répartir le volume.", evidence: "solide" },
      { text: "Des charges légères (> 15 reps) comme lourdes (6–10 reps) donnent une hypertrophie similaire si les séries sont proches de l'échec ; la force progresse plus avec les charges lourdes.", evidence: "solide" },
    ],
    practical: [
      "Vise 10–20 séries effectives par groupe musculaire et par semaine.",
      "Entraîne chaque muscle au moins 2 fois par semaine pour répartir le volume.",
      "Garde les polyarticulaires en 5–10 reps, l'isolation en 10–20 reps.",
    ],
    sources: [
      { authors: "Schoenfeld BJ, Ogborn D, Krieger JW", year: 2017, title: "Dose-response relationship between weekly resistance training volume and increases in muscle mass: A systematic review and meta-analysis", journal: "J Sports Sci", type: "Méta-analyse" },
      { authors: "Schoenfeld BJ, Grgic J, Krieger J", year: 2019, title: "How many times per week should a muscle be trained to maximize muscle hypertrophy? A systematic review and meta-analysis of studies examining the effects of resistance training frequency", journal: "J Sports Sci", type: "Méta-analyse" },
      { authors: "Schoenfeld BJ, Grgic J, Ogborn D, Krieger JW", year: 2017, title: "Strength and Hypertrophy Adaptations Between Low- vs. High-Load Resistance Training: A Systematic Review and Meta-analysis", journal: "J Strength Cond Res", type: "Méta-analyse" },
    ],
  },
  {
    slug: "surcharge-progressive",
    title: "Surcharge progressive : le moteur de la progression",
    category: "entrainement",
    readMin: 3,
    summary:
      "Pour continuer à progresser, le stimulus doit augmenter progressivement : plus de charge, plus de répétitions ou plus de séries, avec une technique constante.",
    claims: [
      { text: "L'augmentation progressive des exigences de l'entraînement est un principe fondamental pour continuer à s'adapter.", evidence: "solide" },
      { text: "La « double progression » (monter les reps dans une fourchette, puis la charge) est une méthode pratique répandue ; elle n'a pas été comparée directement à d'autres modèles.", evidence: "limitée" },
    ],
    practical: [
      "ARISE affiche ta dernière performance pour chaque exercice : essaie de la battre de 1 rep ou d'un petit incrément.",
      "Quand toutes tes séries atteignent le haut de la fourchette, augmente la charge (+2,5 kg haut du corps, +5 kg bas du corps).",
      "Une technique propre et répétable passe avant le poids affiché.",
    ],
    sources: [
      { authors: "American College of Sports Medicine", year: 2009, title: "American College of Sports Medicine position stand. Progression models in resistance training for healthy adults", journal: "Med Sci Sports Exerc", type: "Position officielle" },
      { authors: "Kraemer WJ, Ratamess NA", year: 2004, title: "Fundamentals of resistance training: progression and exercise prescription", journal: "Med Sci Sports Exerc", type: "Revue narrative" },
    ],
  },
  {
    slug: "proximite-echec",
    title: "Faut-il aller à l'échec ?",
    category: "entrainement",
    readMin: 3,
    summary:
      "S'entraîner proche de l'échec est important pour l'hypertrophie, mais aller systématiquement jusqu'à l'échec n'apporte pas de bénéfice net et augmente la fatigue.",
    claims: [
      { text: "L'entraînement à l'échec n'apporte pas d'hypertrophie supérieure à un entraînement proche de l'échec (non-échec).", evidence: "solide" },
      { text: "Plus on s'arrête loin de l'échec, plus l'hypertrophie tend à diminuer ; l'effet sur la force est moins marqué.", evidence: "limitée" },
      { text: "L'échelle RIR (répétitions en réserve) est un outil validé pour estimer l'effort.", evidence: "solide" },
    ],
    practical: [
      "Termine la plupart des séries à 1–3 reps de l'échec (RIR 1–3).",
      "Réserve l'échec aux dernières séries d'exercices d'isolation.",
      "Note ton RPE/RIR dans la séance pour suivre l'effort réel.",
    ],
    sources: [
      { authors: "Refalo MC, Helms ER, Trexler ET, Hamilton DL, Fyfe JJ", year: 2023, title: "Influence of Resistance Training Proximity-to-Failure on Skeletal Muscle Hypertrophy: A Systematic Review with Meta-analysis", journal: "Sports Med", type: "Méta-analyse" },
      { authors: "Robinson ZP, Pelland JC, Remmert JF, et al.", year: 2024, title: "Exploring the Dose-Response Relationship Between Estimated Resistance Training Proximity to Failure, Strength Gain, and Muscle Hypertrophy: A Series of Meta-Regressions", journal: "Sports Med", type: "Méta-analyse" },
      { authors: "Zourdos MC, Klemp A, Dolan C, et al.", year: 2016, title: "Novel Resistance Training-Specific Rating of Perceived Exertion Scale Measuring Repetitions in Reserve", journal: "J Strength Cond Res", type: "Essai contrôlé" },
    ],
  },
  {
    slug: "repos-entre-series",
    title: "Combien de repos entre les séries ?",
    category: "entrainement",
    readMin: 3,
    summary: "Des repos trop courts réduisent les répétitions des séries suivantes. Plus de repos sur les gros exercices permet de conserver un volume de qualité.",
    claims: [
      { text: "Chez des hommes entraînés, 3 min de repos ont produit plus de force et d'hypertrophie que 1 min, à programme identique.", evidence: "limitée" },
      { text: "Une méta-analyse bayésienne suggère un léger avantage à des repos > 60 s pour l'hypertrophie, sans bénéfice clair au-delà de ~90 s.", evidence: "limitée" },
    ],
    practical: [
      "Polyarticulaires lourds : 2–3 min. Isolation : 60–90 s.",
      "Le timer ARISE démarre automatiquement après chaque série validée.",
      "Si tu perds beaucoup de reps d'une série à l'autre, allonge le repos.",
    ],
    sources: [
      { authors: "Schoenfeld BJ, Pope ZK, Benik FM, et al.", year: 2016, title: "Longer Interset Rest Periods Enhance Muscle Strength and Hypertrophy in Resistance-Trained Men", journal: "J Strength Cond Res", type: "Essai contrôlé" },
      { authors: "Singer A, Wolf M, Generoso L, et al.", year: 2024, title: "Give it a rest: a systematic review with Bayesian meta-analysis on the effect of inter-set rest interval duration on muscle hypertrophy", journal: "Front Sports Act Living", type: "Méta-analyse" },
    ],
  },
  {
    slug: "sommeil",
    title: "Sommeil : le facteur le plus sous-estimé",
    category: "recuperation",
    readMin: 4,
    summary:
      "Dormir au moins 7 heures est recommandé chez l'adulte. En déficit calorique, le manque de sommeil semble modifier la nature du poids perdu.",
    claims: [
      { text: "Les adultes devraient dormir au moins 7 heures par nuit de façon régulière.", evidence: "solide" },
      { text: "Dans un essai en déficit, dormir 5,5 h au lieu de 8,5 h a réduit la part de graisse perdue et augmenté la perte de masse maigre.", evidence: "limitée" },
      { text: "Le manque de sommeil pourrait nuire à la récupération musculaire via des voies hormonales (cortisol, testostérone, IGF-1).", evidence: "hypothèse" },
    ],
    practical: [
      "Vise 7 h 30 dans le lit pour obtenir ~7 h de sommeil réel.",
      "Heure de coucher et de lever régulières, même le week-end.",
      "Évite la caféine dans les 6–8 h avant le coucher.",
    ],
    sources: [
      { authors: "Watson NF, Badr MS, Belenky G, et al.", year: 2015, title: "Recommended Amount of Sleep for a Healthy Adult: A Joint Consensus Statement of the American Academy of Sleep Medicine and Sleep Research Society", journal: "Sleep", type: "Consensus" },
      { authors: "Nedeltcheva AV, Kilkus JM, Imperial J, Schoeller DA, Penev PD", year: 2010, title: "Insufficient sleep undermines dietary efforts to reduce adiposity", journal: "Ann Intern Med", type: "Essai contrôlé" },
      { authors: "Dattilo M, Antunes HK, Medeiros A, et al.", year: 2011, title: "Sleep and muscle recovery: endocrinological and molecular basis for a new and promising hypothesis", journal: "Med Hypotheses", type: "Revue narrative" },
    ],
  },
  {
    slug: "creatine",
    title: "Créatine monohydrate",
    category: "nutrition",
    readMin: 3,
    summary: "La créatine est l'un des compléments les plus étudiés : elle améliore la force et la performance sur efforts courts, avec un bon profil de sécurité chez l'adulte en bonne santé.",
    claims: [
      { text: "La supplémentation en créatine améliore la force et les gains de masse maigre associés à la musculation.", evidence: "solide" },
      { text: "3–5 g/jour suffisent ; une phase de charge est optionnelle (elle sature juste plus vite).", evidence: "solide" },
      { text: "Aux doses recommandées, aucun effet indésirable significatif n'est rapporté chez les personnes en bonne santé.", evidence: "solide" },
      { text: "Une prise de 1–2 kg au début est principalement de l'eau intramusculaire.", evidence: "solide" },
    ],
    practical: [
      "3–5 g de créatine monohydrate par jour, tous les jours, à n'importe quelle heure.",
      "Ne panique pas devant +1 kg sur la balance la première semaine : c'est de l'eau.",
      "En cas de pathologie rénale, demande l'avis d'un médecin.",
    ],
    sources: [
      { authors: "Kreider RB, Kalman DS, Antonio J, et al.", year: 2017, title: "International Society of Sports Nutrition position stand: safety and efficacy of creatine supplementation in exercise, sport, and medicine", journal: "J Int Soc Sports Nutr", type: "Position officielle" },
      { authors: "Lanhers C, Pereira B, Naughton G, et al.", year: 2017, title: "Creatine Supplementation and Upper Limb Strength Performance: A Systematic Review and Meta-Analysis", journal: "Sports Med", type: "Méta-analyse" },
    ],
  },
  {
    slug: "cardio-seche",
    title: "Cardio et sèche : utile, pas obligatoire",
    category: "entrainement",
    readMin: 4,
    summary:
      "Le cardio augmente la dépense et améliore la santé cardiovasculaire. Combiné à la musculation, il interfère peu avec l'hypertrophie. HIIT et cardio modéré donnent des résultats comparables sur la graisse.",
    claims: [
      { text: "Combiner endurance et musculation ne compromet pas significativement l'hypertrophie ni la force maximale ; la puissance peut être légèrement affectée.", evidence: "solide" },
      { text: "HIIT et cardio continu modéré produisent des réductions de masse grasse similaires.", evidence: "solide" },
      { text: "Séparer cardio et musculation de quelques heures, ou privilégier la marche/vélo, peut limiter l'interférence.", evidence: "limitée" },
    ],
    practical: [
      "Choisis le cardio que tu peux tenir : marche inclinée, vélo, rameur.",
      "Évite le cardio intense juste avant une séance jambes.",
      "Le déficit calorique reste le moteur principal ; le cardio aide à l'élargir.",
    ],
    sources: [
      { authors: "Schumann M, Feuerbacher JF, Sünkeler M, et al.", year: 2022, title: "Compatibility of Concurrent Aerobic and Strength Training for Skeletal Muscle Size and Function: An Updated Systematic Review and Meta-Analysis", journal: "Sports Med", type: "Méta-analyse" },
      { authors: "Wilson JM, Marin PJ, Rhea MR, et al.", year: 2012, title: "Concurrent training: a meta-analysis examining interference of aerobic and resistance exercises", journal: "J Strength Cond Res", type: "Méta-analyse" },
      { authors: "Wewege M, van den Berg R, Ward RE, Keech A", year: 2017, title: "The effects of high-intensity interval training vs. moderate-intensity continuous training on body composition in overweight and obese adults: a systematic review and meta-analysis", journal: "Obes Rev", type: "Méta-analyse" },
    ],
  },
  {
    slug: "pas-neat",
    title: "Pas quotidiens et NEAT",
    category: "entrainement",
    readMin: 3,
    summary:
      "L'activité hors sport (NEAT) varie énormément d'une personne à l'autre et diminue souvent en sèche. Les pas sont un moyen simple de la suivre et de la maintenir.",
    claims: [
      { text: "Les différences de NEAT expliquent une grande partie des différences de prise de gras lors d'une suralimentation.", evidence: "limitée" },
      { text: "Plus de pas par jour est associé à une mortalité plus faible, avec un plateau autour de 6 000–8 000 pas après 60 ans et 8 000–10 000 avant 60 ans.", evidence: "solide" },
      { text: "L'OMS recommande 150–300 min d'activité modérée par semaine en plus du renforcement musculaire.", evidence: "solide" },
    ],
    practical: [
      "Fixe un plancher de pas plutôt qu'un maximum.",
      "10 min de marche après chaque repas ≈ 3 000 pas.",
      "Si ta perte stagne, +1 500 à 2 000 pas/jour est souvent plus facile qu'une baisse de calories.",
    ],
    sources: [
      { authors: "Levine JA, Eberhardt NL, Jensen MD", year: 1999, title: "Role of nonexercise activity thermogenesis in resistance to fat gain in humans", journal: "Science", type: "Essai contrôlé" },
      { authors: "Paluch AE, Bajpai S, Bassett DR, et al.", year: 2022, title: "Daily steps and all-cause mortality: a meta-analysis of 15 international cohorts", journal: "Lancet Public Health", type: "Méta-analyse" },
      { authors: "Bull FC, Al-Ansari SS, Biddle S, et al.", year: 2020, title: "World Health Organization 2020 guidelines on physical activity and sedentary behaviour", journal: "Br J Sports Med", type: "Recommandation" },
    ],
  },
  {
    slug: "fluctuations-poids",
    title: "Pourquoi ton poids varie d'un jour à l'autre",
    category: "corps",
    readMin: 3,
    summary:
      "Le poids quotidien reflète l'eau, le glycogène, le sel et le contenu digestif autant que la graisse. La tendance sur plusieurs jours est bien plus informative.",
    claims: [
      { text: "Le glycogène musculaire est stocké avec de l'eau (environ 3 g d'eau par gramme de glycogène) : un repas riche en glucides peut faire monter la balance sans prise de gras.", evidence: "solide" },
      { text: "La pesée régulière est associée à une meilleure gestion du poids.", evidence: "solide" },
      { text: "Lisser les pesées par une moyenne mobile réduit l'influence du bruit quotidien.", evidence: "limitée" },
    ],
    practical: [
      "Pèse-toi le matin, après les toilettes, avant de manger, dans les mêmes conditions.",
      "Regarde la moyenne 7 jours affichée par ARISE, pas la pesée du jour.",
      "Un repas salé ou riche en glucides peut ajouter 0,5–1,5 kg d'eau temporairement.",
    ],
    sources: [
      { authors: "Olsson KE, Saltin B", year: 1970, title: "Variation in total body water with muscle glycogen changes in man", journal: "Acta Physiol Scand", type: "Essai contrôlé" },
      { authors: "Zheng Y, Klem ML, Sereika SM, et al.", year: 2015, title: "Self-weighing in weight management: a systematic literature review", journal: "Obesity", type: "Revue systématique" },
      { authors: "Burke LE, Wang J, Sevick MA", year: 2011, title: "Self-monitoring in weight loss: a systematic review of the literature", journal: "J Am Diet Assoc", type: "Revue systématique" },
    ],
  },
  {
    slug: "densite-calorique",
    title: "Densité calorique, fibres et satiété",
    category: "nutrition",
    readMin: 4,
    summary:
      "Les aliments peu denses en calories (légumes, fruits, soupes, viandes maigres) permettent de manger un volume satisfaisant pour moins de calories. Les fibres renforcent cet effet.",
    claims: [
      { text: "Réduire la densité énergétique des repas diminue l'apport calorique spontané tout en conservant la satiété.", evidence: "solide" },
      { text: "Un apport élevé en fibres (≥ 25–29 g/jour) est associé à de nombreux bénéfices de santé et à un poids plus bas.", evidence: "solide" },
      { text: "À calories égales, certains aliments (pommes de terre, poisson, porridge) rassasient plus que d'autres (viennoiseries, barres).", evidence: "limitée" },
    ],
    practical: [
      "Remplis la moitié de l'assiette de légumes.",
      "Le Nutrition Score d'ARISE intègre la densité calorique et les fibres.",
      "Fruits entiers plutôt que jus.",
    ],
    sources: [
      { authors: "Rolls BJ", year: 2009, title: "The relationship between dietary energy density and energy intake", journal: "Physiol Behav", type: "Revue narrative" },
      { authors: "Reynolds A, Mann J, Cummings J, et al.", year: 2019, title: "Carbohydrate quality and human health: a series of systematic reviews and meta-analyses", journal: "The Lancet", type: "Méta-analyse" },
      { authors: "Holt SH, Miller JC, Petocz P, Farmakalidis E", year: 1995, title: "A satiety index of common foods", journal: "Eur J Clin Nutr", type: "Essai contrôlé" },
    ],
  },
  {
    slug: "aliments-transformes",
    title: "Aliments ultra-transformés",
    category: "nutrition",
    readMin: 3,
    summary:
      "Dans un essai en milieu contrôlé, un régime ultra-transformé a conduit à manger spontanément ~500 kcal/jour de plus. Ils ne sont pas « interdits », mais rendent le déficit plus difficile.",
    claims: [
      { text: "Un régime ultra-transformé a augmenté l'apport spontané d'environ 500 kcal/jour et entraîné une prise de poids par rapport à un régime peu transformé.", evidence: "limitée" },
      { text: "La classification NOVA est utile mais débattue : elle ne mesure pas directement la qualité nutritionnelle.", evidence: "hypothèse" },
    ],
    practical: [
      "Base 80 % de ton alimentation sur des aliments bruts ou peu transformés.",
      "Garde tes aliments plaisir en les intégrant dans tes calories : c'est plus durable que l'interdiction.",
    ],
    sources: [
      { authors: "Hall KD, Ayuketah A, Brychta R, et al.", year: 2019, title: "Ultra-Processed Diets Cause Excess Calorie Intake and Weight Gain: An Inpatient Randomized Controlled Trial of Ad Libitum Food Intake", journal: "Cell Metab", type: "Essai contrôlé" },
    ],
  },
  {
    slug: "perte-localisee",
    title: "Abdos visibles : la perte localisée n'existe pas",
    category: "corps",
    readMin: 3,
    summary:
      "Faire des abdos ne fait pas fondre la graisse du ventre spécifiquement. La visibilité des abdominaux dépend surtout du taux de masse grasse global.",
    claims: [
      { text: "6 semaines d'exercices abdominaux seuls n'ont pas réduit la graisse abdominale par rapport à un groupe contrôle.", evidence: "limitée" },
      { text: "L'entraînement localisé d'un membre réduit la graisse de façon globale plutôt que sur la zone travaillée.", evidence: "limitée" },
      { text: "La réduction de la masse grasse totale passe par le déficit énergétique.", evidence: "solide" },
    ],
    practical: [
      "Continue le gainage et les abdos pour la force du tronc, pas pour « brûler » le ventre.",
      "Suis ton tour de taille : c'est un bon indicateur de la perte de gras abdominal.",
    ],
    sources: [
      { authors: "Vispute SS, Smith JD, LeCheminant JD, Hurley KS", year: 2011, title: "The effect of abdominal exercise on abdominal fat", journal: "J Strength Cond Res", type: "Essai contrôlé" },
      { authors: "Ramírez-Campillo R, Andrade DC, Campos-Jara C, et al.", year: 2013, title: "Regional fat changes induced by localized muscle endurance resistance training", journal: "J Strength Cond Res", type: "Essai contrôlé" },
    ],
  },
  {
    slug: "frequence-repas",
    title: "Nombre de repas et jeûne intermittent",
    category: "nutrition",
    readMin: 3,
    summary:
      "À calories égales, le nombre de repas n'a pas d'effet notable sur la perte de gras. Le jeûne intermittent fonctionne surtout parce qu'il aide certaines personnes à manger moins.",
    claims: [
      { text: "La fréquence des repas n'a pas d'effet significatif sur la composition corporelle quand l'apport calorique est identique.", evidence: "solide" },
      { text: "Le jeûne intermittent produit une perte de poids similaire à une restriction continue à apport comparable.", evidence: "solide" },
    ],
    practical: [
      "Choisis le rythme de repas qui t'aide à respecter tes calories et tes protéines.",
      "Si tu t'entraînes, garde un repas protéiné dans les heures autour de la séance.",
    ],
    sources: [
      { authors: "Schoenfeld BJ, Aragon AA, Krieger JW", year: 2015, title: "Effects of meal frequency on weight loss and body composition: a meta-analysis", journal: "Nutr Rev", type: "Méta-analyse" },
      { authors: "Cioffi I, Evangelista A, Ponzo V, et al.", year: 2018, title: "Intermittent versus continuous energy restriction on weight loss and cardiometabolic outcomes: a systematic review and meta-analysis of randomized controlled trials", journal: "J Transl Med", type: "Méta-analyse" },
    ],
  },
  {
    slug: "hydratation",
    title: "Hydratation",
    category: "recuperation",
    readMin: 2,
    summary: "Les besoins en eau varient selon la taille, le climat et l'activité. Une déshydratation marquée (> 2 % du poids) peut réduire la performance.",
    claims: [
      { text: "L'EFSA fixe un apport adéquat en eau totale (boissons + aliments) de 2,5 L/jour pour les hommes et 2,0 L/jour pour les femmes.", evidence: "solide" },
      { text: "Une perte hydrique supérieure à ~2 % du poids corporel peut dégrader la performance d'endurance.", evidence: "solide" },
    ],
    practical: [
      "Des urines claires sont un repère simple.",
      "Ajoute ~0,5–1 L les jours d'entraînement ou de chaleur.",
      "Le bouton +250 ml d'ARISE rend le suivi instantané.",
    ],
    sources: [
      { authors: "EFSA Panel on Dietetic Products, Nutrition, and Allergies", year: 2010, title: "Scientific Opinion on Dietary reference values for water", journal: "EFSA Journal", type: "Recommandation" },
      { authors: "Sawka MN, Burke LM, Eichner ER, et al.", year: 2007, title: "American College of Sports Medicine position stand. Exercise and fluid replacement", journal: "Med Sci Sports Exerc", type: "Position officielle" },
    ],
  },
  {
    slug: "alcool",
    title: "Alcool et progression",
    category: "recuperation",
    readMin: 2,
    summary: "L'alcool apporte 7 kcal/g sans rassasier et, en grande quantité après l'effort, il a réduit la synthèse protéique musculaire dans une étude.",
    claims: [
      { text: "L'alcool fournit environ 7 kcal par gramme.", evidence: "solide" },
      { text: "Une forte consommation d'alcool après l'exercice a diminué la synthèse protéique musculaire, même avec des protéines.", evidence: "limitée" },
    ],
    practical: [
      "Si tu bois, intègre-le dans tes calories et garde tes protéines hautes.",
      "Évite l'alcool le soir d'une séance importante.",
    ],
    sources: [
      { authors: "Parr EB, Camera DM, Areta JL, et al.", year: 2014, title: "Alcohol ingestion impairs maximal post-exercise rates of myofibrillar protein synthesis following a single bout of concurrent training", journal: "PLoS One", type: "Essai contrôlé" },
    ],
  },
  {
    slug: "recomposition",
    title: "Recomposition corporelle",
    category: "corps",
    readMin: 3,
    summary:
      "Perdre du gras et gagner du muscle en même temps est possible, surtout chez les débutants, les personnes en reprise ou avec plus de masse grasse, à condition d'avoir des protéines élevées.",
    claims: [
      { text: "La recomposition est documentée y compris chez des sujets entraînés, avec un apport protéique élevé et un entraînement progressif.", evidence: "limitée" },
      { text: "En déficit marqué avec entraînement intense, 2,4 g/kg de protéines ont permis un gain de masse maigre là où 1,2 g/kg ne l'ont pas permis.", evidence: "limitée" },
    ],
    practical: [
      "Suis le tour de taille et les charges : le poids peut stagner alors que le physique change.",
      "Les photos mensuelles sont précieuses en recomposition.",
    ],
    sources: [
      { authors: "Barakat C, Pearson J, Escalante G, Campbell B, De Souza EO", year: 2020, title: "Body Recomposition: Can Trained Individuals Build Muscle and Lose Fat at the Same Time?", journal: "Strength Cond J", type: "Revue narrative" },
      { authors: "Longland TM, Oikawa SY, Mitchell CJ, Devries MC, Phillips SM", year: 2016, title: "Higher compared with lower dietary protein during an energy deficit combined with intense exercise promotes greater lean mass gain and fat mass loss: a randomized trial", journal: "Am J Clin Nutr", type: "Essai contrôlé" },
    ],
  },
  {
    slug: "balances-impedance",
    title: "Balances à impédance : à interpréter avec prudence",
    category: "corps",
    readMin: 3,
    summary:
      "Les balances grand public estiment la masse grasse via l'impédance électrique. Elles sont sensibles à l'hydratation et peu précises individuellement : ce sont des estimations.",
    claims: [
      { text: "L'impédancemétrie dépend fortement de l'état d'hydratation et des équations utilisées ; sa précision individuelle est limitée.", evidence: "solide" },
      { text: "Utilisée dans des conditions identiques, elle peut indiquer une tendance sur plusieurs semaines.", evidence: "limitée" },
    ],
    practical: [
      "Mesure toujours au même moment (le matin, à jeun).",
      "Privilégie le tour de taille et les photos pour juger ta sèche.",
      "Ne réagis pas à une variation de % de masse grasse d'un jour à l'autre.",
    ],
    sources: [
      { authors: "Kyle UG, Bosaeus I, De Lorenzo AD, et al.", year: 2004, title: "Bioelectrical impedance analysis--part I: review of principles and methods", journal: "Clin Nutr", type: "Revue narrative" },
    ],
  },
  {
    slug: "cafeine",
    title: "Caféine et performance",
    category: "nutrition",
    readMin: 2,
    summary: "La caféine améliore de façon modeste mais fiable de nombreuses performances. Attention à son effet sur le sommeil.",
    claims: [
      { text: "3–6 mg/kg de caféine, 30–60 min avant l'effort, améliorent la performance dans de nombreuses disciplines.", evidence: "solide" },
      { text: "La réponse individuelle varie (génétique, habitude).", evidence: "solide" },
    ],
    practical: [
      "Un café ≈ 80–100 mg. Pour 80 kg, 3 mg/kg = 240 mg.",
      "Évite-la en fin de journée pour protéger ton sommeil.",
    ],
    sources: [
      { authors: "Guest NS, VanDusseldorp TA, Nelson MT, et al.", year: 2021, title: "International society of sports nutrition position stand: caffeine and exercise performance", journal: "J Int Soc Sports Nutr", type: "Position officielle" },
    ],
  },
  {
    slug: "metabolisme-formules",
    title: "Comment ARISE calcule tes calories",
    category: "nutrition",
    readMin: 3,
    summary:
      "Le point de départ vient d'une formule (Mifflin-St Jeor × activité). Mais la formule a une marge d'erreur : ARISE recalcule ta maintenance réelle à partir de tes données.",
    claims: [
      { text: "L'équation de Mifflin-St Jeor est l'une des plus précises pour estimer le métabolisme de repos, mais l'erreur individuelle peut dépasser 10 %.", evidence: "solide" },
      { text: "Comparer l'apport moyen et l'évolution de la tendance du poids permet d'estimer la dépense réelle (bilan énergétique).", evidence: "solide" },
    ],
    practical: [
      "Saisis tes repas le plus fidèlement possible pendant 2–4 semaines.",
      "Dès que la « maintenance adaptative » est disponible (Progress), elle devient ta meilleure référence.",
    ],
    sources: [
      { authors: "Mifflin MD, St Jeor ST, Hill LA, Scott BJ, Daugherty SA, Koh YO", year: 1990, title: "A new predictive equation for resting energy expenditure in healthy individuals", journal: "Am J Clin Nutr", type: "Essai contrôlé" },
      { authors: "Frankenfield D, Roth-Yousey L, Compher C", year: 2005, title: "Comparison of predictive equations for resting metabolic rate in healthy nonobese and obese adults: a systematic review", journal: "J Am Diet Assoc", type: "Revue systématique" },
      { authors: "Hall KD, Sacks G, Chandramohan D, et al.", year: 2011, title: "Quantification of the effect of energy imbalance on bodyweight", journal: "The Lancet", type: "Revue narrative" },
    ],
  },
];

export const ARTICLE_BY_SLUG = new Map(ARTICLES.map((a) => [a.slug, a]));
