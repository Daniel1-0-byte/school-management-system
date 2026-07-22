/**
 * Ghana Basic School Curriculum Data
 * This is the official curriculum used by all schools on the platform.
 * Sourced from the Ghana Education Service standards.
 */

export interface CurriculumSubject {
  code: string;
  name: string;
  shortName: string;
  description: string;
}

export interface CurriculumClass {
  code: string;
  name: string;
  displayOrder: number;
  subjects: Array<{
    code: string;
    isCore: boolean;
    displayOrder: number;
  }>;
}

export interface CurriculumVersion {
  name: string;
  version: string;
  description: string;
  isActive: boolean;
  classes: CurriculumClass[];
  subjects: CurriculumSubject[];
}

// All subjects in the Ghana curriculum
export const GHANA_SUBJECTS: Record<string, CurriculumSubject> = {
  ENG: {
    code: 'ENG',
    name: 'English Language',
    shortName: 'English',
    description: 'English language proficiency and communication skills',
  },
  MATH: {
    code: 'MATH',
    name: 'Mathematics',
    shortName: 'Maths',
    description: 'Mathematical concepts, reasoning, and problem-solving',
  },
  SCI: {
    code: 'SCI',
    name: 'Science',
    shortName: 'Science',
    description: 'Integrated science covering biology, chemistry, and physics',
  },
  OWOP: {
    code: 'OWOP',
    name: 'Our World and Our People',
    shortName: 'OWOP',
    description: 'Geography and environmental studies',
  },
  HG: {
    code: 'HG',
    name: 'History of Ghana',
    shortName: 'History',
    description: 'Ghanaian history and cultural heritage',
  },
  GL: {
    code: 'GL',
    name: 'Ghanaian Language',
    shortName: 'Ghanaian Lang',
    description: 'Local language instruction (Twi, Ga, Ewe, or others)',
  },
  RME: {
    code: 'RME',
    name: 'Religious and Moral Education',
    shortName: 'RME',
    description: 'Religious studies and moral development',
  },
  CA: {
    code: 'CA',
    name: 'Creative Arts',
    shortName: 'Arts',
    description: 'Art, music, drama, and creative expression',
  },
  PE: {
    code: 'PE',
    name: 'Physical Education',
    shortName: 'PE',
    description: 'Sports, fitness, and physical wellness',
  },
  FRE: {
    code: 'FRE',
    name: 'French',
    shortName: 'French',
    description: 'French language instruction',
  },
  ICT: {
    code: 'ICT',
    name: 'Computing',
    shortName: 'Computing',
    description: 'Information and Communications Technology',
  },
  NUM: {
    code: 'NUM',
    name: 'Numeracy',
    shortName: 'Numeracy',
    description: 'Early numeracy and mathematics foundations (KG)',
  },
  LIT: {
    code: 'LIT',
    name: 'Literacy',
    shortName: 'Literacy',
    description: 'Early literacy and language skills (KG)',
  },
};

// Ghana Basic School curriculum structure
export const GHANA_CURRICULUM_V1: CurriculumVersion = {
  name: 'Ghana Basic School Curriculum',
  version: '1.0',
  description: 'Official Ghana Education Service curriculum for primary education',
  isActive: true,
  classes: [
    {
      code: 'KG1',
      name: 'Kindergarten 1',
      displayOrder: 1,
      subjects: [
        { code: 'NUM', isCore: true, displayOrder: 1 },
        { code: 'LIT', isCore: true, displayOrder: 2 },
        { code: 'CA', isCore: true, displayOrder: 3 },
        { code: 'OWOP', isCore: true, displayOrder: 4 },
      ],
    },
    {
      code: 'KG2',
      name: 'Kindergarten 2',
      displayOrder: 2,
      subjects: [
        { code: 'NUM', isCore: true, displayOrder: 1 },
        { code: 'LIT', isCore: true, displayOrder: 2 },
        { code: 'CA', isCore: true, displayOrder: 3 },
        { code: 'OWOP', isCore: true, displayOrder: 4 },
      ],
    },
    {
      code: 'B1',
      name: 'Basic 1',
      displayOrder: 3,
      subjects: [
        { code: 'ENG', isCore: true, displayOrder: 1 },
        { code: 'MATH', isCore: true, displayOrder: 2 },
        { code: 'SCI', isCore: true, displayOrder: 3 },
        { code: 'OWOP', isCore: true, displayOrder: 4 },
        { code: 'HG', isCore: true, displayOrder: 5 },
        { code: 'GL', isCore: true, displayOrder: 6 },
        { code: 'RME', isCore: true, displayOrder: 7 },
        { code: 'CA', isCore: true, displayOrder: 8 },
        { code: 'PE', isCore: true, displayOrder: 9 },
      ],
    },
    {
      code: 'B2',
      name: 'Basic 2',
      displayOrder: 4,
      subjects: [
        { code: 'ENG', isCore: true, displayOrder: 1 },
        { code: 'MATH', isCore: true, displayOrder: 2 },
        { code: 'SCI', isCore: true, displayOrder: 3 },
        { code: 'OWOP', isCore: true, displayOrder: 4 },
        { code: 'HG', isCore: true, displayOrder: 5 },
        { code: 'GL', isCore: true, displayOrder: 6 },
        { code: 'RME', isCore: true, displayOrder: 7 },
        { code: 'CA', isCore: true, displayOrder: 8 },
        { code: 'PE', isCore: true, displayOrder: 9 },
      ],
    },
    {
      code: 'B3',
      name: 'Basic 3',
      displayOrder: 5,
      subjects: [
        { code: 'ENG', isCore: true, displayOrder: 1 },
        { code: 'MATH', isCore: true, displayOrder: 2 },
        { code: 'SCI', isCore: true, displayOrder: 3 },
        { code: 'OWOP', isCore: true, displayOrder: 4 },
        { code: 'HG', isCore: true, displayOrder: 5 },
        { code: 'GL', isCore: true, displayOrder: 6 },
        { code: 'RME', isCore: true, displayOrder: 7 },
        { code: 'CA', isCore: true, displayOrder: 8 },
        { code: 'PE', isCore: true, displayOrder: 9 },
      ],
    },
    {
      code: 'B4',
      name: 'Basic 4',
      displayOrder: 6,
      subjects: [
        { code: 'ENG', isCore: true, displayOrder: 1 },
        { code: 'MATH', isCore: true, displayOrder: 2 },
        { code: 'SCI', isCore: true, displayOrder: 3 },
        { code: 'OWOP', isCore: true, displayOrder: 4 },
        { code: 'HG', isCore: true, displayOrder: 5 },
        { code: 'GL', isCore: true, displayOrder: 6 },
        { code: 'RME', isCore: true, displayOrder: 7 },
        { code: 'CA', isCore: true, displayOrder: 8 },
        { code: 'PE', isCore: true, displayOrder: 9 },
        { code: 'FRE', isCore: false, displayOrder: 10 },
        { code: 'ICT', isCore: false, displayOrder: 11 },
      ],
    },
    {
      code: 'B5',
      name: 'Basic 5',
      displayOrder: 7,
      subjects: [
        { code: 'ENG', isCore: true, displayOrder: 1 },
        { code: 'MATH', isCore: true, displayOrder: 2 },
        { code: 'SCI', isCore: true, displayOrder: 3 },
        { code: 'OWOP', isCore: true, displayOrder: 4 },
        { code: 'HG', isCore: true, displayOrder: 5 },
        { code: 'GL', isCore: true, displayOrder: 6 },
        { code: 'RME', isCore: true, displayOrder: 7 },
        { code: 'CA', isCore: true, displayOrder: 8 },
        { code: 'PE', isCore: true, displayOrder: 9 },
        { code: 'FRE', isCore: false, displayOrder: 10 },
        { code: 'ICT', isCore: false, displayOrder: 11 },
      ],
    },
    {
      code: 'B6',
      name: 'Basic 6',
      displayOrder: 8,
      subjects: [
        { code: 'ENG', isCore: true, displayOrder: 1 },
        { code: 'MATH', isCore: true, displayOrder: 2 },
        { code: 'SCI', isCore: true, displayOrder: 3 },
        { code: 'OWOP', isCore: true, displayOrder: 4 },
        { code: 'HG', isCore: true, displayOrder: 5 },
        { code: 'GL', isCore: true, displayOrder: 6 },
        { code: 'RME', isCore: true, displayOrder: 7 },
        { code: 'CA', isCore: true, displayOrder: 8 },
        { code: 'PE', isCore: true, displayOrder: 9 },
        { code: 'FRE', isCore: false, displayOrder: 10 },
        { code: 'ICT', isCore: false, displayOrder: 11 },
      ],
    },
    {
      code: 'B7',
      name: 'Basic 7',
      displayOrder: 9,
      subjects: [
        { code: 'ENG', isCore: true, displayOrder: 1 },
        { code: 'MATH', isCore: true, displayOrder: 2 },
        { code: 'SCI', isCore: true, displayOrder: 3 },
        { code: 'OWOP', isCore: true, displayOrder: 4 },
        { code: 'HG', isCore: true, displayOrder: 5 },
        { code: 'GL', isCore: true, displayOrder: 6 },
        { code: 'RME', isCore: true, displayOrder: 7 },
        { code: 'CA', isCore: true, displayOrder: 8 },
        { code: 'PE', isCore: true, displayOrder: 9 },
        { code: 'FRE', isCore: false, displayOrder: 10 },
        { code: 'ICT', isCore: false, displayOrder: 11 },
      ],
    },
    {
      code: 'B8',
      name: 'Basic 8',
      displayOrder: 10,
      subjects: [
        { code: 'ENG', isCore: true, displayOrder: 1 },
        { code: 'MATH', isCore: true, displayOrder: 2 },
        { code: 'SCI', isCore: true, displayOrder: 3 },
        { code: 'OWOP', isCore: true, displayOrder: 4 },
        { code: 'HG', isCore: true, displayOrder: 5 },
        { code: 'GL', isCore: true, displayOrder: 6 },
        { code: 'RME', isCore: true, displayOrder: 7 },
        { code: 'CA', isCore: true, displayOrder: 8 },
        { code: 'PE', isCore: true, displayOrder: 9 },
        { code: 'FRE', isCore: false, displayOrder: 10 },
        { code: 'ICT', isCore: false, displayOrder: 11 },
      ],
    },
    {
      code: 'B9',
      name: 'Basic 9',
      displayOrder: 11,
      subjects: [
        { code: 'ENG', isCore: true, displayOrder: 1 },
        { code: 'MATH', isCore: true, displayOrder: 2 },
        { code: 'SCI', isCore: true, displayOrder: 3 },
        { code: 'OWOP', isCore: true, displayOrder: 4 },
        { code: 'HG', isCore: true, displayOrder: 5 },
        { code: 'GL', isCore: true, displayOrder: 6 },
        { code: 'RME', isCore: true, displayOrder: 7 },
        { code: 'CA', isCore: true, displayOrder: 8 },
        { code: 'PE', isCore: true, displayOrder: 9 },
        { code: 'FRE', isCore: false, displayOrder: 10 },
        { code: 'ICT', isCore: false, displayOrder: 11 },
      ],
    },
  ],
  subjects: Object.values(GHANA_SUBJECTS),
};
