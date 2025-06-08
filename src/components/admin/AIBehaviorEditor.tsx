import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Plus, 
  Edit3, 
  Trash2, 
  Save, 
  X, 
  AlertCircle, 
  CheckCircle, 
  RefreshCw,
  Settings,
  FileText,
  Eye,
  EyeOff,
  Info
} from 'lucide-react';
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
}

const CHAT_MODES: ChatMode[] = [
  {
    value: 'claims_mode',
    label: 'VA Claims Support',
    description: 'Guides users through filing, evidence gathering, effective dates, C&P exams, and service connection.',
    tone: 'Tactical, veteran-to-veteran, direct',
    behavior: 'Procedural guidance for VA claims process',
    compliance: 'Must follow 38 CFR and M21-1 guidance. No legal advice—only procedural explanation.'
  },
  {
    value: 'transition_mode',
    label: 'Transition & TAP Guidance',
    description: 'Covers the 12-month separation timeline, TAP prep, mindset shift, job and school planning.',
    tone: 'Mission-focused, motivational',
    behavior: 'Transition planning and TAP preparation',
    compliance: 'Use verified VA, DoD, and TAP-aligned resources. No financial or legal advice.'
  },
  {
    value: 'document_mode',
    label: 'Document Analysis',
    description: 'Returns a two-part output: (1) plain-English summary, and (2) structured VSO-style report.',
    tone: 'Clear, professional',
    behavior: 'Document analysis with structured reporting',
    compliance: 'No reinterpretation of VA decisions. Use M21-1 for procedural clarity.'
  },
  {
    value: 'mental_health_mode',
    label: 'Mental Health Support',
    description: 'Offers peer-level support and VA claim guidance related to PTSD, MST, anxiety, depression.',
    tone: 'Empathetic, trauma-informed',
    behavior: 'Mental health support with claims guidance',
    compliance: 'Never diagnose. Refer to VA, Vet Centers, or MST coordinators. Use M21-1 Part III, Subpart iv.'
  },
  {
    value: 'education_mode',
    label: 'Education & GI Bill Support',
    description: 'Explains how to apply for GI Bill, VR&E, use the COE, and compare schools.',
    tone: 'Helpful, informative',
    behavior: 'Education benefits guidance',
    compliance: 'Use official VA education policies. No personal education advising.'
  },
  {
    value: 'career_mode',
    label: 'Career & Job Readiness',
    description: 'Helps translate military experience, build resumes, optimize LinkedIn, and explore careers.',
    tone: 'Civilian-friendly, practical',
    behavior: 'Career transition and job readiness',
    compliance: 'Avoid specific job placement advice. Recommend VA and DoL tools (e.g., O*NET, Hiring Our Heroes).'
  },
  {
    value: 'finance_mode',
    label: 'Financial Planning & VA Pay',
    description: 'Educates users on disability pay, budgeting after transition, and understanding back pay or offsets.',
    tone: 'Grounded, calm',
    behavior: 'Financial education focused on VA benefits',
    compliance: 'No financial planning advice. Stick to VA benefits education only.'
  },
  {
    value: 'housing_mode',
    label: 'Housing & VA Home Loans',
    description: 'Walks through VA loan eligibility, COE, renting vs buying, and moving checklists.',
    tone: 'Straightforward, protective',
    behavior: 'Housing and VA loan guidance',
    compliance: 'No mortgage or legal advice. Only explain VA benefits and procedures.'
  },
  {
    value: 'survivor_mode',
    label: 'Survivor & Dependent Benefits',
    description: 'Explains DIC, CHAMPVA, dependents\' claims, and accrued benefits.',
    tone: 'Compassionate, respectful',
    behavior: 'Survivor and dependent benefits support',
    compliance: 'Follow 38 CFR Part 3 and M21-1 Part IV. Avoid legal conclusions—focus on eligibility and forms.'
  },
  {
    value: 'training_mode',
    label: 'VSO Training Assistant',
    description: 'Provides answers for staff or trainee VSOs using VSO-style explanations.',
    tone: 'Instructional, formal',
    behavior: 'VSO training and education',
    compliance: 'Used only for internal training purposes. Teach procedures, not legal advice.'
  },
  {
    value: 'general',
    label: 'General Support',
    description: 'Default mode for general veteran assistance and support.',
    tone: 'Professional, helpful',
    behavior: 'General veteran support and guidance',
    compliance: 'Follow all VA guidelines and refer to appropriate specialists when needed.'
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
          created_by: 'system'
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
            <h2 className="text-2xl font-bold text-gray-900">AI Behavior & System Message Editor</h2>
            <p className="text-gray-600 mt-1">
              Configure how ForwardOps AI behaves and responds across different chat modes
            </p>
          </div>
          
          <div className="flex items-center gap-3">
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
              leftIcon={<Plus size={16} />}
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

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 flex-shrink-0">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Chat Modes Overview */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden flex-1">
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
                
                return (
                  <div key={mode.value} className="p-6">
                    {/* Mode Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleModeExpansion(mode.value)}
                          className="flex items-center gap-2 text-left"
                        >
                          {isExpanded ? (
                            <EyeOff size={20} className="text-gray-400" />
                          ) : (
                            <Eye size={20} className="text-gray-400" />
                          )}
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              {mode.label}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {mode.description}
                            </p>
                          </div>
                        </button>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          {activeMessage ? (
                            <div className="flex items-center gap-1">
                              <CheckCircle size={16} className="text-green-600" />
                              <span className="text-sm text-green-600">Active</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <AlertCircle size={16} className="text-yellow-600" />
                              <span className="text-sm text-yellow-600">No Active Message</span>
                            </div>
                          )}
                          <span className="text-sm text-gray-500">
                            ({messages.length} message{messages.length !== 1 ? 's' : ''})
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
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-gray-700">Tone:</span>
                            <p className="text-gray-600 mt-1">{mode.tone}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Behavior:</span>
                            <p className="text-gray-600 mt-1">{mode.behavior}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Compliance:</span>
                            <p className="text-gray-600 mt-1">{mode.compliance}</p>
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
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
        
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
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
                <div className="flex items-start gap-2">
                  <Info size={20} className="text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900 mb-2">
                      {selectedModeInfo.label} Mode Guidelines
                    </h4>
                    <div className="text-sm text-blue-800 space-y-1">
                      <p><strong>Tone:</strong> {selectedModeInfo.tone}</p>
                      <p><strong>Behavior:</strong> {selectedModeInfo.behavior}</p>
                      <p><strong>Compliance:</strong> {selectedModeInfo.compliance}</p>
                    </div>
                  </div>
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
                rows={12}
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

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t mt-6">
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

export default AIBehaviorEditor;