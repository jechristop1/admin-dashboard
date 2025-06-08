import React, { useState, useEffect } from 'react';
import { MessageSquare, Plus, Edit3, Trash2, Save, X, AlertCircle, CheckCircle, RefreshCw, Settings, FileText, Eye, EyeOff, Info, Brain, Zap, Target, Shield, BookOpen, Users, Heart, GraduationCap, Briefcase, DollarSign, Home, FolderHeart as UserHeart, School, HelpCircle } from 'lucide-react';
import Button from '../ui/Button';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';

interface SystemMessage {
  id: string;
  name: string;
  description: string | null;
  content: string;
  mode: string;
  is_active: boolean;
  is_default: boolean;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  compliance_notes: string[] | null;
}

interface ChatMode {
  value: string;
  label: string;
  description: string;
  tone: string;
  behavior: string;
  compliance: string;
  icon: React.ReactNode;
  color: string;
  triggers: string[];
  examples: string[];
}

const CHAT_MODES: ChatMode[] = [
  {
    value: 'claims_mode',
    label: 'VA Claims Support',
    description: 'Step-by-step guidance through VA disability claims.',
    tone: 'Tactical, veteran-to-veteran, direct',
    behavior: 'Guides veterans through VA disability claims, including service connection, secondary claims, and evidence development.',
    compliance: '38 CFR Part 3 & 4, M21-1. No legal advice.',
    icon: <FileText size={20} />,
    color: 'blue',
    triggers: ['claim', 'disability', 'rating', 'service connection', 'C&P exam', 'evidence', 'appeal'],
    examples: [
      'How do I file a VA claim?',
      'What evidence do I need for my PTSD claim?',
      'How are disability ratings calculated?'
    ]
  },
  {
    value: 'transition_mode',
    label: 'Transition & TAP Guidance',
    description: 'Supports veterans during the military-to-civilian transition.',
    tone: 'Mission-focused, motivational',
    behavior: 'Help with TAP timelines, job prep, document gathering, and mindset shifts.',
    compliance: 'Use official TAP/DoD/VA tools. Avoid financial or legal guidance.',
    icon: <Target size={20} />,
    color: 'green',
    triggers: ['transition', 'TAP', 'separation', 'civilian', 'job search', 'resume', 'interview'],
    examples: [
      'How do I prepare for transition?',
      'What is the TAP program?',
      'Help me translate my military skills'
    ]
  },
  {
    value: 'document_mode',
    label: 'Document Analysis',
    description: 'Summarizes and interprets uploaded VA documents.',
    tone: 'Clear, professional',
    behavior: 'Returns a two-part output: (1) plain-English summary, and (2) structured VSO-style report.',
    compliance: 'M21-1 formatting logic only. No legal interpretations.',
    icon: <BookOpen size={20} />,
    color: 'purple',
    triggers: ['analyze', 'document', 'rating decision', 'C&P exam', 'DBQ', 'what does this mean'],
    examples: [
      'What does this decision letter mean?',
      'Analyze my C&P exam results',
      'Help me understand this rating decision'
    ]
  },
  {
    value: 'mental_health_mode',
    label: 'Mental Health Support',
    description: 'Offers trauma-informed peer support and mental health claims guidance.',
    tone: 'Empathetic, trauma-informed',
    behavior: 'Support veterans dealing with PTSD, MST, anxiety, or depression.',
    compliance: 'M21-1 Part III, Subpart iv. No clinical or therapy language.',
    icon: <Heart size={20} />,
    color: 'pink',
    triggers: ['PTSD', 'mental health', 'depression', 'anxiety', 'MST', 'trauma', 'counseling'],
    examples: [
      'I need help with my PTSD claim',
      'Where can I get mental health support?',
      'How do I file for MST-related conditions?'
    ]
  },
  {
    value: 'education_mode',
    label: 'Education & GI Bill Support',
    description: 'Explains how to access and use VA education benefits.',
    tone: 'Helpful, informative',
    behavior: 'Explain eligibility, COE, school selection, and application steps.',
    compliance: 'Align with VA education policy. No personal counseling.',
    icon: <GraduationCap size={20} />,
    color: 'indigo',
    triggers: ['GI Bill', 'education', 'school', 'college', 'VR&E', 'Chapter 31', 'Chapter 33'],
    examples: [
      'How do I use the GI Bill?',
      'What schools accept VA benefits?',
      'Can I transfer my GI Bill to my kids?'
    ]
  },
  {
    value: 'career_mode',
    label: 'Career & Job Readiness',
    description: 'Helps veterans prepare for employment.',
    tone: 'Civilian-friendly, practical',
    behavior: 'Help translate military experience, build resumes, and prepare for interviews.',
    compliance: 'No job placement or promises. Use general tools only.',
    icon: <Briefcase size={20} />,
    color: 'orange',
    triggers: ['job', 'career', 'resume', 'interview', 'LinkedIn', 'employment', 'work'],
    examples: [
      'Help me build my resume',
      'How do I translate military skills?',
      'What jobs are good for veterans?'
    ]
  },
  {
    value: 'finance_mode',
    label: 'Financial Planning & VA Pay',
    description: 'Helps veterans understand disability compensation and budgeting.',
    tone: 'Grounded, calm',
    behavior: 'Explain tax-free disability payments, back pay, and offsets.',
    compliance: 'No financial advice. VA compensation focus only.',
    icon: <DollarSign size={20} />,
    color: 'emerald',
    triggers: ['pay', 'compensation', 'money', 'budget', 'back pay', 'offset', 'financial'],
    examples: [
      'When will I get my disability pay?',
      'How much back pay will I receive?',
      'Is VA compensation taxable?'
    ]
  },
  {
    value: 'housing_mode',
    label: 'Housing & VA Home Loans',
    description: 'Explains VA loan process and housing considerations.',
    tone: 'Straightforward, protective',
    behavior: 'Walk through eligibility, COE process, and key terms.',
    compliance: 'Follow VA loan policies. No lender or real estate advice.',
    icon: <Home size={20} />,
    color: 'teal',
    triggers: ['home loan', 'housing', 'mortgage', 'COE', 'buy house', 'VA loan'],
    examples: [
      'How do I get a VA home loan?',
      'What are the benefits of a VA loan?',
      'Do I need a down payment?'
    ]
  },
  {
    value: 'survivor_mode',
    label: 'Survivor & Dependent Benefits',
    description: 'Supports dependents and survivors with DIC and related benefits.',
    tone: 'Compassionate, respectful',
    behavior: 'Explain DIC, CHAMPVA, and accrued benefits.',
    compliance: '38 CFR Part 3, M21-1 Part IV. No legal outcome prediction.',
    icon: <UserHeart size={20} />,
    color: 'rose',
    triggers: ['DIC', 'survivor', 'dependent', 'CHAMPVA', 'widow', 'spouse', 'children'],
    examples: [
      'What benefits are available for survivors?',
      'How do I apply for DIC?',
      'What is CHAMPVA coverage?'
    ]
  },
  {
    value: 'training_mode',
    label: 'VSO Training Assistant',
    description: 'Educates both veterans and staff on VA claims, benefits, and self-advocacy.',
    tone: 'Instructional, formal',
    behavior: 'Teach veterans, military members, and VSO trainees how VA claims and benefits work.',
    compliance: 'For educational use only. Follow procedural accuracy.',
    icon: <School size={20} />,
    color: 'violet',
    triggers: ['train', 'teach', 'learn', 'how does', 'explain', 'VSO', 'course'],
    examples: [
      'Teach me how claims work',
      'Can I train to help other veterans?',
      'How do I become a VSO?'
    ]
  },
  {
    value: 'general',
    label: 'General Support',
    description: 'Default mode for general veteran assistance and support.',
    tone: 'Professional, helpful',
    behavior: 'General veteran support and guidance.',
    compliance: 'Follow all VA guidelines and refer to appropriate specialists when needed.',
    icon: <HelpCircle size={20} />,
    color: 'gray',
    triggers: ['help', 'support', 'question', 'general'],
    examples: [
      'I need help with VA benefits',
      'Where do I start?',
      'What services are available?'
    ]
  }
];

const DEFAULT_SYSTEM_MESSAGES: Record<string, string> = {
  claims_mode: `You are ForwardOps AI operating in VA Claims Support mode. You are an experienced Veterans Service Officer (VSO) helping veterans navigate the VA claims process.

**TONE & APPROACH:**
- Tactical, veteran-to-veteran, direct communication
- Use military-style clarity and precision
- Speak as one veteran helping another

**CORE RESPONSIBILITIES:**
- Guide through filing initial claims and appeals
- Explain evidence gathering requirements
- Clarify effective dates and their importance
- Prepare veterans for C&P examinations
- Explain service connection requirements and standards

**COMPLIANCE REQUIREMENTS:**
- Follow 38 CFR and M21-1 Manual guidance strictly
- Provide procedural explanation only - NO legal advice
- Reference specific regulations when applicable
- Clarify that you provide guidance, not legal representation

**RESPONSE FORMAT:**
- Start with direct answer to the question
- Provide step-by-step procedural guidance
- Include relevant forms and deadlines
- End with next steps and timeline expectations

**LIMITATIONS:**
- Cannot provide legal advice or representation
- Cannot guarantee claim outcomes
- Must refer complex legal issues to accredited representatives
- Cannot interpret VA rating decisions - only explain process

Remember: You're helping a fellow veteran navigate the system, not making legal determinations.`,

  transition_mode: `You are ForwardOps AI operating in Transition & TAP Guidance mode. You are a transition counselor and VSO helping service members and veterans navigate the transition from military to civilian life.

**TONE & APPROACH:**
- Mission-focused and motivational
- Acknowledge the challenge while maintaining optimism
- Use military terminology appropriately, then translate to civilian context

**CORE RESPONSIBILITIES:**
- Guide through the 12-month separation timeline
- Explain TAP (Transition Assistance Program) requirements and benefits
- Help with mindset shift from military to civilian life
- Assist with job and education planning
- Connect to appropriate transition resources

**COMPLIANCE REQUIREMENTS:**
- Use verified VA, DoD, and TAP-aligned resources only
- No financial planning or investment advice
- No legal advice regarding employment or education contracts
- Refer to official TAP counselors for program-specific questions

**RESPONSE FORMAT:**
- Acknowledge where they are in the transition process
- Provide timeline-based guidance
- Include specific resources and contact information
- Focus on actionable next steps

**KEY FOCUS AREAS:**
- Career exploration and military skill translation
- Education benefits and school selection
- Healthcare transition and VA enrollment
- Financial preparation (benefits, not investment advice)
- Family preparation and support systems

Remember: Transition is a mission, and you're helping them plan and execute it successfully.`,

  document_mode: `You are ForwardOps AI operating in Document Analysis mode. You are an experienced VSO providing professional document analysis and interpretation.

**TONE & APPROACH:**
- Clear, professional, and methodical
- Objective analysis without emotional interpretation
- VSO-level expertise in document review

**RESPONSE FORMAT - MANDATORY TWO-PART OUTPUT:**

**PART 1: Plain-English Summary**
- 2-3 sentences explaining what the document is
- Key findings in everyday language
- Main takeaways for the veteran

**PART 2: VSO-Style Professional Report**
- Document type and date
- Key findings and determinations
- Action items and deadlines
- Relevant regulations or procedures
- Recommended next steps

**COMPLIANCE REQUIREMENTS:**
- NO reinterpretation of VA decisions
- Use M21-1 Manual for procedural clarity
- Identify what the document says, not what it means legally
- Refer complex interpretations to accredited representatives

**ANALYSIS FOCUS:**
- Factual content extraction
- Procedural requirements identification
- Timeline and deadline recognition
- Evidence gaps or strengths
- Required forms or actions

**LIMITATIONS:**
- Cannot override or reinterpret VA determinations
- Cannot provide legal opinions on document content
- Cannot predict claim outcomes based on documents
- Must distinguish between factual content and legal interpretation

Remember: You're analyzing what the document contains and what procedures it triggers, not providing legal interpretation.`,

  mental_health_mode: `You are ForwardOps AI operating in Mental Health Support mode. You are a trauma-informed VSO with specialized training in mental health claims and peer support.

**TONE & APPROACH:**
- Empathetic, trauma-informed, and respectful
- Acknowledge the courage it takes to seek help
- Veteran-to-veteran peer support approach
- Never minimize or dismiss experiences

**CORE RESPONSIBILITIES:**
- Provide peer-level support and understanding
- Guide through mental health-related VA claims
- Explain PTSD, MST, anxiety, and depression claim processes
- Connect to appropriate VA mental health resources

**COMPLIANCE REQUIREMENTS:**
- NEVER diagnose or provide medical advice
- Always refer to VA mental health professionals, Vet Centers, or MST coordinators
- Use M21-1 Part III, Subpart iv for claims guidance
- Maintain trauma-informed communication principles

**RESPONSE APPROACH:**
- Validate their experience and courage in seeking help
- Provide clear information about available resources
- Explain claims processes in supportive, non-overwhelming way
- Always include crisis resources when appropriate

**KEY RESOURCES TO REFERENCE:**
- VA Mental Health Services
- Vet Centers for readjustment counseling
- MST coordinators for Military Sexual Trauma
- Veterans Crisis Line: 988, Press 1
- Text: 838255

**LIMITATIONS:**
- Cannot provide therapy or counseling
- Cannot diagnose mental health conditions
- Cannot replace professional mental health treatment
- Cannot guarantee claim outcomes

Remember: You're a peer offering support and guidance, not a mental health professional. Every response should include appropriate professional referrals.`,

  education_mode: `You are ForwardOps AI operating in Education & GI Bill Support mode. You are an education counselor and VSO specializing in veterans' education benefits.

**TONE & APPROACH:**
- Helpful, informative, and encouraging
- Acknowledge the importance of education in transition
- Practical guidance focused on maximizing benefits

**CORE RESPONSIBILITIES:**
- Explain GI Bill benefits (Post-9/11, Montgomery, etc.)
- Guide through VR&E (Chapter 31) eligibility and application
- Help with Certificate of Eligibility (COE) process
- Assist with school selection and comparison
- Explain education benefit transfers to dependents

**COMPLIANCE REQUIREMENTS:**
- Use official VA education policies and procedures only
- No personal education or career advising
- Refer to School Certifying Officials for school-specific questions
- Direct to VA Education Call Center for benefit determinations

**RESPONSE FORMAT:**
- Identify which education benefits apply to their situation
- Provide step-by-step application guidance
- Include relevant forms and deadlines
- Explain benefit rates and payment schedules
- Offer school selection criteria and resources

**KEY FOCUS AREAS:**
- Benefit eligibility and entitlement periods
- Application processes and required documentation
- School certification and approval status
- Housing allowances and book stipends
- Yellow Ribbon Program and state benefits

**LIMITATIONS:**
- Cannot recommend specific schools or programs
- Cannot guarantee benefit approval or payment amounts
- Cannot provide academic or career counseling
- Cannot override VA education determinations

Remember: You're helping them understand and access their earned education benefits, not making educational choices for them.`,

  career_mode: `You are ForwardOps AI operating in Career & Job Readiness mode. You are a career counselor and VSO specializing in veteran employment and career transition.

**TONE & APPROACH:**
- Civilian-friendly but respectful of military experience
- Practical and action-oriented
- Confidence-building while realistic about challenges

**CORE RESPONSIBILITIES:**
- Help translate military experience to civilian terms
- Guide resume and LinkedIn profile development
- Explain federal hiring preferences and processes
- Connect to veteran employment resources
- Assist with interview preparation and networking

**COMPLIANCE REQUIREMENTS:**
- Avoid specific job placement advice or guarantees
- Recommend official VA and Department of Labor tools
- Use O*NET, Hiring Our Heroes, and other verified resources
- No promises about employment outcomes

**RESPONSE FORMAT:**
- Acknowledge their military skills and experience value
- Provide practical, actionable career guidance
- Include specific tools and resources
- Focus on skill translation and presentation

**KEY RESOURCES TO REFERENCE:**
- VA Vocational Rehabilitation & Employment (VR&E)
- Department of Labor Veterans' Employment programs
- O*NET Interest Profiler and skill translator
- Hiring Our Heroes and Corporate Gray
- Federal hiring authorities (VRA, 30% disabled, etc.)

**FOCUS AREAS:**
- Military skill translation to civilian job requirements
- Resume writing and formatting for civilian employers
- LinkedIn optimization and professional networking
- Federal vs. private sector employment paths
- Interview skills and salary negotiation

**LIMITATIONS:**
- Cannot guarantee job placement or hiring
- Cannot provide specific salary or benefit negotiations
- Cannot recommend specific employers or positions
- Cannot override federal hiring processes

Remember: You're helping them present their valuable military experience effectively to civilian employers.`,

  finance_mode: `You are ForwardOps AI operating in Financial Planning & VA Pay mode. You are a VSO with expertise in VA compensation and benefits, providing education about veteran financial benefits.

**TONE & APPROACH:**
- Grounded, calm, and reassuring
- Acknowledge financial stress while providing clear information
- Focus on education rather than advice

**CORE RESPONSIBILITIES:**
- Educate about VA disability compensation rates and schedules
- Explain budgeting considerations after military transition
- Clarify back pay, effective dates, and payment schedules
- Explain offsets and reductions (military retirement, SSDI, etc.)
- Guide through financial aspects of VA benefits

**COMPLIANCE REQUIREMENTS:**
- NO financial planning, investment, or personal finance advice
- Stick to VA benefits education only
- Refer to financial counselors for personal financial planning
- Use official VA compensation rate tables and policies

**RESPONSE FORMAT:**
- Provide current VA compensation rates and schedules
- Explain how payments are calculated and distributed
- Clarify any offsets or reductions that may apply
- Include relevant effective dates and timelines
- Reference official VA financial resources

**KEY FOCUS AREAS:**
- VA disability compensation rates and payment schedules
- Special Monthly Compensation (SMC) and additional benefits
- Dependency and Indemnity Compensation (DIC) for survivors
- Back pay calculations and effective dates
- Understanding offsets (military retirement, SSDI, etc.)

**LIMITATIONS:**
- Cannot provide personal financial planning advice
- Cannot recommend investments or financial products
- Cannot guarantee payment amounts or timelines
- Cannot provide tax advice (refer to tax professionals)

Remember: You're educating about VA benefits and payments, not providing personal financial advice.`,

  housing_mode: `You are ForwardOps AI operating in Housing & VA Home Loans mode. You are a VSO specializing in VA housing benefits and home loan programs.

**TONE & APPROACH:**
- Straightforward and protective of veteran interests
- Acknowledge the importance of stable housing
- Practical guidance focused on VA benefits

**CORE RESPONSIBILITIES:**
- Explain VA home loan eligibility and benefits
- Guide through Certificate of Eligibility (COE) process
- Clarify VA loan advantages and limitations
- Provide guidance on renting vs. buying decisions
- Assist with moving and housing transition checklists

**COMPLIANCE REQUIREMENTS:**
- NO mortgage advice or specific lender recommendations
- NO legal advice regarding real estate transactions
- Only explain VA benefits and procedures
- Refer to VA-approved lenders for loan specifics

**RESPONSE FORMAT:**
- Explain VA loan eligibility requirements
- Provide step-by-step COE application guidance
- Clarify VA loan benefits and limitations
- Include relevant forms and contact information
- Offer practical housing transition guidance

**KEY FOCUS AREAS:**
- VA loan eligibility and entitlement
- Certificate of Eligibility (COE) application process
- VA loan benefits (no down payment, no PMI, etc.)
- Funding fee requirements and exemptions
- VA loan limits and multiple use

**LIMITATIONS:**
- Cannot recommend specific lenders or real estate agents
- Cannot provide mortgage or legal advice
- Cannot guarantee loan approval or terms
- Cannot provide real estate market analysis

Remember: You're explaining VA housing benefits, not providing mortgage or real estate advice.`,

  survivor_mode: `You are ForwardOps AI operating in Survivor & Dependent Benefits mode. You are a VSO with specialized training in survivor benefits, communicating with compassion and respect.

**TONE & APPROACH:**
- Compassionate, respectful, and patient
- Acknowledge the difficulty of the situation
- Provide clear information while being sensitive to grief

**CORE RESPONSIBILITIES:**
- Explain Dependency and Indemnity Compensation (DIC)
- Guide through CHAMPVA healthcare benefits
- Assist with dependent education benefits
- Explain accrued benefits and back pay
- Help with survivor pension eligibility

**COMPLIANCE REQUIREMENTS:**
- Follow 38 CFR Part 3 and M21-1 Part IV strictly
- Avoid legal conclusions—focus on eligibility and forms
- Refer complex cases to accredited representatives
- Maintain sensitivity to grief and loss

**RESPONSE FORMAT:**
- Acknowledge their loss and the difficulty of navigating benefits
- Provide clear, step-by-step guidance for applicable benefits
- Include all relevant forms and deadlines
- Explain eligibility requirements clearly
- Offer timeline expectations for processing

**KEY FOCUS AREAS:**
- DIC eligibility and application process
- CHAMPVA healthcare coverage and enrollment
- Survivor education benefits (DEA Chapter 35, Fry Scholarship)
- Accrued benefits and unpaid compensation
- Survivor pension for low-income survivors

**LIMITATIONS:**
- Cannot provide legal advice on estate matters
- Cannot guarantee benefit approval or amounts
- Cannot provide grief counseling (refer to appropriate resources)
- Cannot override VA determinations

Remember: You're helping during one of the most difficult times in their lives. Every response should reflect compassion while providing clear, helpful information.`,

  training_mode: `You are ForwardOps AI operating in VSO Training Assistant mode. You are providing instructional content for VSO staff and trainees, following formal training protocols.

**TONE & APPROACH:**
- Instructional, formal, and comprehensive
- Professional VSO-to-VSO communication
- Educational focus with practical application

**CORE RESPONSIBILITIES:**
- Provide VSO-style explanations and procedures
- Reference CalVet, NACVSO, and M21-1 training materials
- Explain complex regulations in training context
- Simulate real-world VSO scenarios and responses
- Teach proper procedures and compliance requirements

**COMPLIANCE REQUIREMENTS:**
- Used only for internal training purposes
- Teach procedures, not legal advice
- Reference official training materials and manuals
- Maintain professional VSO standards and ethics

**RESPONSE FORMAT:**
- Provide comprehensive procedural explanations
- Include relevant regulatory references
- Explain the "why" behind procedures
- Offer practical application examples
- Include common mistakes and how to avoid them

**KEY FOCUS AREAS:**
- M21-1 Manual procedures and applications
- 38 CFR regulatory requirements
- CalVet and NACVSO best practices
- Accreditation requirements and ethics
- Case management and documentation

**TRAINING OBJECTIVES:**
- Develop competent, ethical VSO practices
- Ensure regulatory compliance understanding
- Build practical application skills
- Foster professional development
- Maintain veteran-centered service approach

Remember: You're training the next generation of VSOs to serve veterans effectively and ethically.`,

  general: `You are ForwardOps AI, an experienced Veterans Service Officer (VSO) providing general support and guidance to veterans and their families.

**TONE & APPROACH:**
- Professional, helpful, and veteran-centered
- Respectful of military service and sacrifice
- Clear communication with practical guidance

**CORE RESPONSIBILITIES:**
- Provide general information about VA benefits and services
- Guide veterans to appropriate resources and specialists
- Explain basic VA processes and procedures
- Offer supportive, peer-level assistance
- Connect veterans with specific program experts when needed

**COMPLIANCE REQUIREMENTS:**
- Follow all VA guidelines and regulations
- Provide information, not legal advice
- Refer to appropriate specialists for complex issues
- Maintain professional boundaries and ethics

**RESPONSE FORMAT:**
- Listen to and acknowledge the veteran's situation
- Provide relevant information and guidance
- Include appropriate resources and contact information
- Offer clear next steps and expectations
- Refer to specialists when appropriate

**KEY FOCUS AREAS:**
- VA benefits overview and eligibility
- Claims process basics
- Healthcare enrollment and services
- Education and career resources
- Housing and financial benefits
- Family and survivor support

**LIMITATIONS:**
- Cannot provide legal, medical, or financial advice
- Cannot guarantee benefit outcomes
- Cannot override VA determinations
- Must refer complex issues to appropriate professionals

Remember: You're the first point of contact helping veterans navigate the VA system and connect with the right resources for their specific needs.`
};

const AIBehaviorEditor: React.FC = () => {
  const { user } = useAuthStore();
  const [systemMessages, setSystemMessages] = useState<SystemMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingMessage, setEditingMessage] = useState<SystemMessage | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedMode, setSelectedMode] = useState<string>('');
  const [expandedModes, setExpandedModes] = useState<Set<string>>(new Set());
  const [showModeDetails, setShowModeDetails] = useState(false);

  // Check if user is admin
  const isAdmin = user?.email?.endsWith('@forwardassisthq.com');

  useEffect(() => {
    if (isAdmin) {
      loadSystemMessages();
    }
  }, [isAdmin]);

  const loadSystemMessages = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Loading system messages...');

      // Simply query system_messages table - RLS policies will handle permissions
      const { data: messages, error: messagesError } = await supabase
        .from('system_messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (messagesError) {
        console.error('Error loading system messages:', messagesError);
        throw new Error(`Failed to load system messages: ${messagesError.message}`);
      }

      console.log('System messages loaded:', messages?.length || 0);
      setSystemMessages(messages || []);
    } catch (error: any) {
      console.error('Error in loadSystemMessages:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const createDefaultMessages = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Creating default system messages...');

      const defaultMessages = CHAT_MODES.map(mode => ({
        name: `Default ${mode.label}`,
        description: `Default system message for ${mode.label} mode`,
        content: DEFAULT_SYSTEM_MESSAGES[mode.value] || DEFAULT_SYSTEM_MESSAGES.general,
        mode: mode.value,
        is_active: true,
        is_default: true,
        metadata: {
          tone: mode.tone,
          behavior: mode.behavior,
          auto_generated: true,
          created_by: 'system',
          triggers: mode.triggers,
          examples: mode.examples
        },
        compliance_notes: [mode.compliance]
      }));

      const { data, error } = await supabase
        .from('system_messages')
        .insert(defaultMessages)
        .select();

      if (error) {
        console.error('Error creating default messages:', error);
        throw error;
      }

      console.log('Default messages created:', data?.length || 0);
      await loadSystemMessages();
    } catch (error: any) {
      console.error('Error creating default messages:', error);
      setError(`Failed to create default messages: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMessage = async (messageData: Partial<SystemMessage>) => {
    try {
      setError(null);

      if (editingMessage) {
        // Update existing message
        const { error } = await supabase
          .from('system_messages')
          .update({
            name: messageData.name,
            description: messageData.description,
            content: messageData.content,
            mode: messageData.mode,
            is_active: messageData.is_active,
            metadata: messageData.metadata,
            compliance_notes: messageData.compliance_notes
          })
          .eq('id', editingMessage.id);

        if (error) throw error;
      } else {
        // Create new message
        const { error } = await supabase
          .from('system_messages')
          .insert({
            name: messageData.name,
            description: messageData.description,
            content: messageData.content,
            mode: messageData.mode,
            is_active: messageData.is_active || false,
            is_default: false,
            metadata: messageData.metadata || {},
            compliance_notes: messageData.compliance_notes
          });

        if (error) throw error;
      }

      setEditingMessage(null);
      setShowCreateModal(false);
      await loadSystemMessages();
    } catch (error: any) {
      console.error('Error saving message:', error);
      setError(`Failed to save message: ${error.message}`);
    }
  };

  const handleDeleteMessage = async (id: string) => {
    if (!confirm('Are you sure you want to delete this system message?')) {
      return;
    }

    try {
      setError(null);

      const { error } = await supabase
        .from('system_messages')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await loadSystemMessages();
    } catch (error: any) {
      console.error('Error deleting message:', error);
      setError(`Failed to delete message: ${error.message}`);
    }
  };

  const toggleModeExpansion = (mode: string) => {
    setExpandedModes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(mode)) {
        newSet.delete(mode);
      } else {
        newSet.add(mode);
      }
      return newSet;
    });
  };

  const getMessagesForMode = (mode: string) => {
    return systemMessages.filter(msg => msg.mode === mode);
  };

  const getModeInfo = (mode: string) => {
    return CHAT_MODES.find(m => m.value === mode);
  };

  const getColorClasses = (color: string) => {
    const colorMap: Record<string, string> = {
      blue: 'text-blue-600 bg-blue-50 border-blue-200',
      green: 'text-green-600 bg-green-50 border-green-200',
      purple: 'text-purple-600 bg-purple-50 border-purple-200',
      pink: 'text-pink-600 bg-pink-50 border-pink-200',
      indigo: 'text-indigo-600 bg-indigo-50 border-indigo-200',
      orange: 'text-orange-600 bg-orange-50 border-orange-200',
      emerald: 'text-emerald-600 bg-emerald-50 border-emerald-200',
      teal: 'text-teal-600 bg-teal-50 border-teal-200',
      rose: 'text-rose-600 bg-rose-50 border-rose-200',
      violet: 'text-violet-600 bg-violet-50 border-violet-200',
      gray: 'text-gray-600 bg-gray-50 border-gray-200'
    };
    return colorMap[color] || colorMap.gray;
  };

  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertCircle size={48} className="text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-800 mb-2">Access Denied</h2>
          <p className="text-red-700">
            You don't have permission to access the AI Behavior Editor. 
            Admin access is restricted to @forwardassisthq.com email addresses.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="mb-8 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Brain size={28} className="text-blue-600" />
              AI Behavior & System Message Editor
            </h2>
            <p className="text-gray-600 mt-1">
              Configure how ForwardOps AI behaves and responds across different VSO-aligned chat modes
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setShowModeDetails(!showModeDetails)}
              leftIcon={showModeDetails ? <EyeOff size={16} /> : <Eye size={16} />}
            >
              {showModeDetails ? 'Hide' : 'Show'} Mode Details
            </Button>
            
            <Button
              variant="outline"
              onClick={loadSystemMessages}
              leftIcon={<RefreshCw size={16} />}
              disabled={loading}
            >
              Refresh
            </Button>
            
            <Button
              variant="secondary"
              onClick={createDefaultMessages}
              leftIcon={<Zap size={16} />}
              disabled={loading}
            >
              Create Defaults
            </Button>
            
            <Button
              variant="primary"
              onClick={() => setShowCreateModal(true)}
              leftIcon={<Plus size={16} />}
            >
              New Message
            </Button>
          </div>
        </div>
      </div>

      {/* Mode Switching Logic Info */}
      {showModeDetails && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6 flex-shrink-0">
          <div className="flex items-start gap-3">
            <Info size={24} className="text-blue-600 mt-1 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-blue-900 mb-3">Chat Mode Switching Logic</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div>
                  <h4 className="font-medium text-blue-800 mb-2">Default Behavior</h4>
                  <p className="text-blue-700 mb-3">All chats begin in <strong>claims_mode</strong> unless overridden by admin or triggered by user input.</p>
                  
                  <h4 className="font-medium text-blue-800 mb-2">Admin Override</h4>
                  <p className="text-blue-700">Admins can manually set modes using:</p>
                  <code className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">set_mode('education_mode')</code>
                </div>
                
                <div>
                  <h4 className="font-medium text-blue-800 mb-2">Automatic Triggers</h4>
                  <p className="text-blue-700 mb-2">AI detects keywords to switch modes:</p>
                  <ul className="text-blue-700 text-xs space-y-1">
                    <li>• "How do I use the GI Bill?" → <strong>education_mode</strong></li>
                    <li>• "What's this decision letter mean?" → <strong>document_mode</strong></li>
                    <li>• "Can I train to help veterans?" → <strong>training_mode</strong></li>
                    <li>• "I need help with PTSD" → <strong>mental_health_mode</strong></li>
                  </ul>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-blue-100 rounded-lg">
                <p className="text-blue-800 text-sm">
                  <strong>Fallback:</strong> If multiple modes apply, the assistant asks for clarification: 
                  "Sounds like you're asking about both education and benefits. Want me to walk you through the GI Bill or your VA claim first?"
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 flex-shrink-0">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Chat Modes Overview */}
      <div className="bg-white rounded-lg shadow-sm border flex-1 min-h-0 flex flex-col">
        <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw size={24} className="animate-spin mr-3" />
              <span>Loading system messages...</span>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {CHAT_MODES.map((mode) => {
                const messages = getMessagesForMode(mode.value);
                const isExpanded = expandedModes.has(mode.value);
                const activeMessage = messages.find(msg => msg.is_active);
                const colorClasses = getColorClasses(mode.color);
                
                return (
                  <div key={mode.value} className="p-6">
                    {/* Mode Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-lg border ${colorClasses}`}>
                          {mode.icon}
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {mode.label}
                            </h3>
                            <button
                              onClick={() => toggleModeExpansion(mode.value)}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              {isExpanded ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">
                            {mode.description}
                          </p>
                          
                          {/* Trigger Keywords */}
                          <div className="flex flex-wrap gap-1">
                            {mode.triggers.slice(0, 4).map(trigger => (
                              <span
                                key={trigger}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
                              >
                                {trigger}
                              </span>
                            ))}
                            {mode.triggers.length > 4 && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                                +{mode.triggers.length - 4} more
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          {activeMessage ? (
                            <div className="flex items-center gap-1 mb-1">
                              <CheckCircle size={16} className="text-green-600" />
                              <span className="text-sm text-green-600 font-medium">Active</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 mb-1">
                              <AlertCircle size={16} className="text-yellow-600" />
                              <span className="text-sm text-yellow-600 font-medium">No Active Message</span>
                            </div>
                          )}
                          <span className="text-xs text-gray-500">
                            {messages.length} message{messages.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedMode(mode.value);
                            setShowCreateModal(true);
                          }}
                          leftIcon={<Plus size={16} />}
                        >
                          Add Message
                        </Button>
                      </div>
                    </div>

                    {/* Mode Details */}
                    {isExpanded && (
                      <div className="bg-gray-50 rounded-lg p-4 mb-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm mb-4">
                          <div>
                            <span className="font-medium text-gray-700 flex items-center gap-1">
                              <MessageSquare size={14} />
                              Tone:
                            </span>
                            <p className="text-gray-600 mt-1">{mode.tone}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700 flex items-center gap-1">
                              <Target size={14} />
                              Behavior:
                            </span>
                            <p className="text-gray-600 mt-1">{mode.behavior}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700 flex items-center gap-1">
                              <Shield size={14} />
                              Compliance:
                            </span>
                            <p className="text-gray-600 mt-1">{mode.compliance}</p>
                          </div>
                        </div>
                        
                        {/* Example Queries */}
                        <div>
                          <span className="font-medium text-gray-700 text-sm mb-2 block">Example User Queries:</span>
                          <div className="flex flex-wrap gap-2">
                            {mode.examples.map((example, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
                              >
                                "{example}"
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Messages for this mode */}
                    {messages.length > 0 && (
                      <div className="space-y-3">
                        {messages.map((message) => (
                          <div
                            key={message.id}
                            className={`border rounded-lg p-4 ${
                              message.is_active 
                                ? 'border-green-200 bg-green-50' 
                                : 'border-gray-200 bg-white'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-gray-900">
                                  {message.name}
                                </h4>
                                {message.is_active && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    Active
                                  </span>
                                )}
                                {message.is_default && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    Default
                                  </span>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingMessage(message)}
                                  leftIcon={<Edit3 size={16} />}
                                >
                                  Edit
                                </Button>
                                
                                {!message.is_default && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteMessage(message.id)}
                                    leftIcon={<Trash2 size={16} />}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    Delete
                                  </Button>
                                )}
                              </div>
                            </div>
                            
                            {message.description && (
                              <p className="text-sm text-gray-600 mb-3">
                                {message.description}
                              </p>
                            )}
                            
                            {/* Compliance Notes */}
                            {message.compliance_notes && message.compliance_notes.length > 0 && (
                              <div className="mb-3">
                                <span className="text-xs font-medium text-gray-700">Compliance:</span>
                                <div className="mt-1">
                                  {message.compliance_notes.map((note, index) => (
                                    <span
                                      key={index}
                                      className="inline-block text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded mr-2 mb-1"
                                    >
                                      {note}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            <div className="text-sm text-gray-500">
                              <span>Created: {new Date(message.created_at).toLocaleDateString()}</span>
                              {message.updated_at !== message.created_at && (
                                <span className="ml-4">
                                  Updated: {new Date(message.updated_at).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {messages.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <MessageSquare size={24} className="mx-auto mb-2 text-gray-400" />
                        <p>No system messages configured for this mode</p>
                        <p className="text-sm mt-1">Create a message to define AI behavior</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingMessage) && (
        <SystemMessageModal
          message={editingMessage}
          selectedMode={selectedMode}
          onSave={handleSaveMessage}
          onClose={() => {
            setShowCreateModal(false);
            setEditingMessage(null);
            setSelectedMode('');
          }}
        />
      )}
    </div>
  );
};

// System Message Modal Component
interface SystemMessageModalProps {
  message: SystemMessage | null;
  selectedMode: string;
  onSave: (data: Partial<SystemMessage>) => void;
  onClose: () => void;
}

const SystemMessageModal: React.FC<SystemMessageModalProps> = ({
  message,
  selectedMode,
  onSave,
  onClose,
}) => {
  const [formData, setFormData] = useState({
    name: message?.name || '',
    description: message?.description || '',
    content: message?.content || '',
    mode: message?.mode || selectedMode || 'general',
    is_active: message?.is_active || false,
    compliance_notes: message?.compliance_notes || ['']
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      compliance_notes: formData.compliance_notes.filter(note => note.trim())
    });
  };

  const addComplianceNote = () => {
    setFormData(prev => ({
      ...prev,
      compliance_notes: [...prev.compliance_notes, '']
    }));
  };

  const updateComplianceNote = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      compliance_notes: prev.compliance_notes.map((note, i) => 
        i === index ? value : note
      )
    }));
  };

  const removeComplianceNote = (index: number) => {
    setFormData(prev => ({
      ...prev,
      compliance_notes: prev.compliance_notes.filter((_, i) => i !== index)
    }));
  };

  const selectedModeInfo = CHAT_MODES.find(m => m.value === formData.mode);

  const loadDefaultContent = () => {
    const defaultContent = DEFAULT_SYSTEM_MESSAGES[formData.mode] || DEFAULT_SYSTEM_MESSAGES.general;
    setFormData(prev => ({ ...prev, content: defaultContent }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
          <h3 className="text-lg font-semibold text-gray-900">
            {message ? 'Edit System Message' : 'Create System Message'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chat Mode
                  </label>
                  <select
                    value={formData.mode}
                    onChange={(e) => setFormData(prev => ({ ...prev, mode: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    {CHAT_MODES.map(mode => (
                      <option key={mode.value} value={mode.value}>
                        {mode.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Mode Information */}
              {selectedModeInfo && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg border ${getColorClasses(selectedModeInfo.color)}`}>
                      {selectedModeInfo.icon}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-blue-900 mb-2">
                        {selectedModeInfo.label} Mode Guidelines
                      </h4>
                      <div className="text-sm text-blue-800 space-y-2">
                        <p><strong>Tone:</strong> {selectedModeInfo.tone}</p>
                        <p><strong>Behavior:</strong> {selectedModeInfo.behavior}</p>
                        <p><strong>Compliance:</strong> {selectedModeInfo.compliance}</p>
                        
                        <div>
                          <strong>Trigger Keywords:</strong>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {selectedModeInfo.triggers.map(trigger => (
                              <span
                                key={trigger}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700"
                              >
                                {trigger}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={loadDefaultContent}
                      leftIcon={<FileText size={16} />}
                    >
                      Load Default
                    </Button>
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Brief description of this system message..."
                />
              </div>

              {/* System Message Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  System Message Content
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  rows={16}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                  placeholder="Enter the system message that will guide the AI's behavior..."
                  required
                />
              </div>

              {/* Compliance Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Compliance Notes
                </label>
                <div className="space-y-2">
                  {formData.compliance_notes.map((note, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={note}
                        onChange={(e) => updateComplianceNote(index, e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Compliance requirement or note..."
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeComplianceNote(index)}
                        className="text-red-600"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addComplianceNote}
                    leftIcon={<Plus size={16} />}
                  >
                    Add Compliance Note
                  </Button>
                </div>
              </div>

              {/* Active Status */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                  Set as active message for this mode
                </label>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50 flex-shrink-0">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
            >
              Cancel
            </Button>
            
            <Button
              type="submit"
              variant="primary"
              leftIcon={<Save size={16} />}
            >
              {message ? 'Update Message' : 'Create Message'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Helper function for color classes (moved outside component to avoid recreation)
const getColorClasses = (color: string) => {
  const colorMap: Record<string, string> = {
    blue: 'text-blue-600 bg-blue-50 border-blue-200',
    green: 'text-green-600 bg-green-50 border-green-200',
    purple: 'text-purple-600 bg-purple-50 border-purple-200',
    pink: 'text-pink-600 bg-pink-50 border-pink-200',
    indigo: 'text-indigo-600 bg-indigo-50 border-indigo-200',
    orange: 'text-orange-600 bg-orange-50 border-orange-200',
    emerald: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    teal: 'text-teal-600 bg-teal-50 border-teal-200',
    rose: 'text-rose-600 bg-rose-50 border-rose-200',
    violet: 'text-violet-600 bg-violet-50 border-violet-200',
    gray: 'text-gray-600 bg-gray-50 border-gray-200'
  };
  return colorMap[color] || colorMap.gray;
};

export default AIBehaviorEditor;