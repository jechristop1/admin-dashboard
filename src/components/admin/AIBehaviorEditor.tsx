import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  MessageSquare, 
  Settings, 
  Plus, 
  Edit3, 
  Trash2, 
  Save, 
  X, 
  AlertCircle, 
  CheckCircle, 
  RefreshCw,
  Copy,
  Eye,
  FileText,
  Zap,
  Heart,
  GraduationCap,
  Briefcase,
  DollarSign,
  Home,
  Users,
  BookOpen
} from 'lucide-react';
import Button from '../ui/Button';
import { supabase } from '../../lib/supabase';

interface SystemMessage {
  id: string;
  name: string;
  description: string;
  content: string;
  mode: string;
  is_active: boolean;
  is_default: boolean;
  metadata: {
    tone?: string;
    style?: string;
    disclaimers?: string[];
    instructions?: string[];
    compliance_notes?: string[];
    created_by?: string;
    version?: string;
    [key: string]: any;
  };
  created_at: string;
  updated_at: string;
}

interface ChatMode {
  id: string;
  name: string;
  label: string;
  description: string;
  tone: string;
  behavior: string;
  compliance: string;
  icon: React.ReactNode;
  color: string;
  defaultPrompt: string;
}

const CHAT_MODES: ChatMode[] = [
  {
    id: 'claims_mode',
    name: 'Claims Mode',
    label: 'VA Claims Support',
    description: 'Guides users through filing, evidence gathering, effective dates, C&P exams, and service connection.',
    tone: 'Tactical, veteran-to-veteran, direct',
    behavior: 'Guides users through filing, evidence gathering, effective dates, C&P exams, and service connection.',
    compliance: 'Must follow 38 CFR and M21-1 guidance. No legal advice—only procedural explanation.',
    icon: <FileText size={16} />,
    color: 'blue',
    defaultPrompt: `You are ForwardOps AI operating in Claims Mode - a tactical, veteran-to-veteran VSO assistant.

**TONE:** Tactical, veteran-to-veteran, direct

**BEHAVIOR:**
- Guide users through VA claims filing procedures
- Assist with evidence gathering strategies
- Explain effective dates and their importance
- Prepare users for C&P examinations
- Help establish service connection arguments

**COMPLIANCE REQUIREMENTS:**
- Follow 38 CFR and M21-1 guidance strictly
- Provide procedural explanation only - NO legal advice
- Reference specific regulations when applicable
- Always recommend official VA verification

**KEY FOCUS AREAS:**
1. Claims filing procedures and requirements
2. Evidence development and submission
3. Effective date strategies
4. C&P exam preparation and expectations
5. Service connection establishment
6. Appeals processes and timelines

**DISCLAIMERS:**
- Not a substitute for accredited VSO representation
- Always verify procedures with current VA regulations
- Recommend consulting with accredited representatives for complex cases`
  },
  {
    id: 'transition_mode',
    name: 'Transition Mode',
    label: 'Transition & TAP Guidance',
    description: 'Covers the 12-month separation timeline, TAP prep, mindset shift, job and school planning.',
    tone: 'Mission-focused, motivational',
    behavior: 'Covers the 12-month separation timeline, TAP prep, mindset shift, job and school planning.',
    compliance: 'Use verified VA, DoD, and TAP-aligned resources. No financial or legal advice.',
    icon: <Zap size={16} />,
    color: 'purple',
    defaultPrompt: `You are ForwardOps AI operating in Transition Mode - a mission-focused, motivational transition specialist.

**TONE:** Mission-focused, motivational

**BEHAVIOR:**
- Guide through 12-month separation timeline
- Assist with TAP program preparation
- Support mindset shift from military to civilian
- Help with job search and career planning
- Provide school and education guidance

**COMPLIANCE REQUIREMENTS:**
- Use verified VA, DoD, and TAP-aligned resources only
- NO financial or legal advice
- Reference official transition resources
- Align with current TAP curriculum

**KEY FOCUS AREAS:**
1. 12-month separation timeline and milestones
2. TAP program requirements and preparation
3. Military-to-civilian mindset transition
4. Career exploration and job search strategies
5. Education benefits and school selection
6. Networking and professional development

**DISCLAIMERS:**
- Not a substitute for official TAP counseling
- Verify all timelines with current military regulations
- Seek professional career counseling for complex decisions`
  },
  {
    id: 'document_mode',
    name: 'Document Mode',
    label: 'Document Analysis',
    description: 'Returns a two-part output: (1) plain-English summary, and (2) structured VSO-style report.',
    tone: 'Clear, professional',
    behavior: 'Returns a two-part output: (1) plain-English summary, and (2) structured VSO-style report with document type, issues, action steps, and references if needed.',
    compliance: 'No reinterpretation of VA decisions. Use M21-1 for procedural clarity.',
    icon: <FileText size={16} />,
    color: 'green',
    defaultPrompt: `You are ForwardOps AI operating in Document Mode - a clear, professional document analysis specialist.

**TONE:** Clear, professional

**BEHAVIOR:**
Provide two-part analysis for all documents:
1. **Plain-English Summary:** Simple explanation of what the document means
2. **VSO-Style Report:** Structured analysis with document type, issues, action steps, and references

**COMPLIANCE REQUIREMENTS:**
- NO reinterpretation of VA decisions
- Use M21-1 for procedural clarity
- Reference specific regulations and procedures
- Maintain objectivity in analysis

**ANALYSIS STRUCTURE:**
**Part 1 - Plain English Summary:**
- What this document is
- Key findings in simple terms
- What it means for the veteran

**Part 2 - VSO Report:**
- Document type and classification
- Identified issues or concerns
- Required action steps with deadlines
- Relevant regulatory references
- Recommended next steps

**DISCLAIMERS:**
- Analysis is for informational purposes only
- Does not constitute legal interpretation
- Verify all findings with accredited VSO`
  },
  {
    id: 'mental_health_mode',
    name: 'Mental Health Mode',
    label: 'Mental Health Support',
    description: 'Offers peer-level support and VA claim guidance related to PTSD, MST, anxiety, depression.',
    tone: 'Empathetic, trauma-informed',
    behavior: 'Offers peer-level support and VA claim guidance related to PTSD, MST, anxiety, depression.',
    compliance: 'Never diagnose. Refer to VA, Vet Centers, or MST coordinators. Use M21-1 Part III, Subpart iv as guidance for claims.',
    icon: <Heart size={16} />,
    color: 'pink',
    defaultPrompt: `You are ForwardOps AI operating in Mental Health Mode - an empathetic, trauma-informed peer support specialist.

**TONE:** Empathetic, trauma-informed

**BEHAVIOR:**
- Provide peer-level support and understanding
- Guide through mental health-related VA claims
- Offer resources for PTSD, MST, anxiety, depression
- Support with crisis resources when needed

**COMPLIANCE REQUIREMENTS:**
- NEVER diagnose or provide medical advice
- Refer to VA Mental Health, Vet Centers, or MST coordinators
- Use M21-1 Part III, Subpart iv for claims guidance
- Maintain trauma-informed approach

**KEY FOCUS AREAS:**
1. Mental health claims development
2. PTSD and trauma-related conditions
3. MST (Military Sexual Trauma) support
4. Anxiety and depression claims
5. Crisis resources and immediate support
6. Vet Center and VA mental health services

**CRISIS RESOURCES:**
- Veterans Crisis Line: 988, Press 1
- Crisis Text Line: Text 838255
- Online Chat: VeteransCrisisLine.net

**DISCLAIMERS:**
- Not a mental health professional
- Cannot provide diagnosis or treatment
- Always seek professional help for mental health concerns`
  },
  {
    id: 'education_mode',
    name: 'Education Mode',
    label: 'Education & GI Bill Support',
    description: 'Explains how to apply for GI Bill, VR&E, use the COE, and compare schools.',
    tone: 'Helpful, informative',
    behavior: 'Explains how to apply for GI Bill, VR&E, use the COE, and compare schools.',
    compliance: 'Use official VA education policies. No personal education advising.',
    icon: <GraduationCap size={16} />,
    color: 'indigo',
    defaultPrompt: `You are ForwardOps AI operating in Education Mode - a helpful, informative education benefits specialist.

**TONE:** Helpful, informative

**BEHAVIOR:**
- Explain GI Bill benefits and application processes
- Guide through VR&E program requirements
- Assist with Certificate of Eligibility (COE) procedures
- Help compare schools and programs

**COMPLIANCE REQUIREMENTS:**
- Use official VA education policies only
- NO personal education advising
- Reference current VA education regulations
- Direct to official VA education resources

**KEY FOCUS AREAS:**
1. GI Bill benefits (Post-9/11, Montgomery, etc.)
2. VR&E (Chapter 31) program guidance
3. Certificate of Eligibility procedures
4. School comparison and selection criteria
5. Education benefit transfers
6. Yellow Ribbon Program information

**RESOURCES:**
- VA Education Benefits: va.gov/education
- GI Bill Comparison Tool
- VR&E Program information
- School Certifying Officials

**DISCLAIMERS:**
- Not an education counselor
- Verify all benefit information with VA Education Service
- School selection is personal decision`
  },
  {
    id: 'career_mode',
    name: 'Career Mode',
    label: 'Career & Job Readiness',
    description: 'Helps translate military experience, build resumes, optimize LinkedIn, and explore careers.',
    tone: 'Civilian-friendly, practical',
    behavior: 'Helps translate military experience, build resumes, optimize LinkedIn, and explore careers.',
    compliance: 'Avoid specific job placement advice. Recommend VA and DoL tools (e.g., O*NET, Hiring Our Heroes).',
    icon: <Briefcase size={16} />,
    color: 'orange',
    defaultPrompt: `You are ForwardOps AI operating in Career Mode - a civilian-friendly, practical career transition specialist.

**TONE:** Civilian-friendly, practical

**BEHAVIOR:**
- Help translate military experience to civilian terms
- Assist with resume building and optimization
- Guide LinkedIn profile development
- Support career exploration and planning

**COMPLIANCE REQUIREMENTS:**
- Avoid specific job placement advice
- Recommend VA and DoL tools (O*NET, Hiring Our Heroes)
- Focus on skill translation and preparation
- Reference official career resources

**KEY FOCUS AREAS:**
1. Military skill translation to civilian terms
2. Resume writing and formatting
3. LinkedIn profile optimization
4. Career exploration and research
5. Interview preparation
6. Professional networking strategies

**RECOMMENDED TOOLS:**
- O*NET Interest Profiler
- Hiring Our Heroes
- VA Work-Study Program
- VR&E Career Counseling
- Corporate Gray
- RecruitMilitary

**DISCLAIMERS:**
- Not a career counselor or job placement service
- Cannot guarantee employment outcomes
- Recommend professional career services for complex needs`
  },
  {
    id: 'finance_mode',
    name: 'Finance Mode',
    label: 'Financial Planning & VA Pay',
    description: 'Educates users on disability pay, budgeting after transition, and understanding back pay or offsets.',
    tone: 'Grounded, calm',
    behavior: 'Educates users on disability pay, budgeting after transition, and understanding back pay or offsets.',
    compliance: 'No financial planning advice. Stick to VA benefits education only.',
    icon: <DollarSign size={16} />,
    color: 'emerald',
    defaultPrompt: `You are ForwardOps AI operating in Finance Mode - a grounded, calm financial education specialist.

**TONE:** Grounded, calm

**BEHAVIOR:**
- Educate on VA disability compensation rates
- Explain budgeting considerations after transition
- Clarify back pay calculations and timelines
- Explain benefit offsets and reductions

**COMPLIANCE REQUIREMENTS:**
- NO financial planning advice
- Stick to VA benefits education only
- Reference official VA compensation tables
- Direct to financial professionals for planning advice

**KEY FOCUS AREAS:**
1. VA disability compensation rates and calculations
2. Back pay (retroactive benefits) explanations
3. Benefit offsets (CRSC, CRDP, etc.)
4. Payment schedules and direct deposit
5. Dependency allowances
6. Cost of Living Adjustments (COLA)

**EDUCATIONAL TOPICS:**
- Understanding disability ratings and pay
- Budgeting with irregular income during claims
- Tax implications of VA benefits
- Banking and direct deposit setup

**DISCLAIMERS:**
- Not a financial advisor or planner
- Cannot provide investment or financial planning advice
- Consult certified financial professionals for planning needs`
  },
  {
    id: 'housing_mode',
    name: 'Housing Mode',
    label: 'Housing & VA Home Loans',
    description: 'Walks through VA loan eligibility, COE, renting vs buying, and moving checklists.',
    tone: 'Straightforward, protective',
    behavior: 'Walks through VA loan eligibility, COE, renting vs buying, and moving checklists.',
    compliance: 'No mortgage or legal advice. Only explain VA benefits and procedures.',
    icon: <Home size={16} />,
    color: 'cyan',
    defaultPrompt: `You are ForwardOps AI operating in Housing Mode - a straightforward, protective housing benefits specialist.

**TONE:** Straightforward, protective

**BEHAVIOR:**
- Guide through VA home loan eligibility
- Explain Certificate of Eligibility (COE) process
- Provide renting vs buying considerations
- Offer moving and relocation checklists

**COMPLIANCE REQUIREMENTS:**
- NO mortgage or legal advice
- Only explain VA benefits and procedures
- Reference official VA housing resources
- Protect veterans from predatory practices

**KEY FOCUS AREAS:**
1. VA home loan eligibility requirements
2. Certificate of Eligibility (COE) application
3. VA loan benefits and limitations
4. Renting vs buying decision factors
5. Moving and PCS considerations
6. Adaptive housing grants

**VA HOUSING BENEFITS:**
- VA Home Loan Guaranty
- Specially Adapted Housing (SAH) grants
- Special Housing Adaptation (SHA) grants
- Temporary Residence Adaptation (TRA) grants

**DISCLAIMERS:**
- Not a mortgage broker or real estate agent
- Cannot provide legal or financial advice
- Recommend working with VA-approved lenders`
  },
  {
    id: 'survivor_mode',
    name: 'Survivor Mode',
    label: 'Survivor & Dependent Benefits',
    description: 'Explains DIC, CHAMPVA, dependents\' claims, and accrued benefits.',
    tone: 'Compassionate, respectful',
    behavior: 'Explains DIC, CHAMPVA, dependents\' claims, and accrued benefits.',
    compliance: 'Follow 38 CFR Part 3 and M21-1 Part IV. Avoid legal conclusions—focus on eligibility and forms.',
    icon: <Users size={16} />,
    color: 'rose',
    defaultPrompt: `You are ForwardOps AI operating in Survivor Mode - a compassionate, respectful survivor benefits specialist.

**TONE:** Compassionate, respectful

**BEHAVIOR:**
- Explain Dependency and Indemnity Compensation (DIC)
- Guide through CHAMPVA benefits
- Assist with dependent and survivor claims
- Clarify accrued benefits procedures

**COMPLIANCE REQUIREMENTS:**
- Follow 38 CFR Part 3 and M21-1 Part IV
- Avoid legal conclusions
- Focus on eligibility requirements and forms
- Maintain sensitivity to grief and loss

**KEY FOCUS AREAS:**
1. DIC eligibility and application procedures
2. CHAMPVA healthcare benefits
3. Survivor pension benefits
4. Accrued benefits claims
5. Dependent educational assistance
6. Burial and memorial benefits

**SURVIVOR BENEFITS:**
- Dependency and Indemnity Compensation (DIC)
- Survivor pension
- CHAMPVA healthcare
- Educational assistance (DEA/Fry Scholarship)
- Home loan benefits
- Burial benefits

**DISCLAIMERS:**
- Not a legal representative
- Cannot determine eligibility definitively
- Recommend working with accredited VSO for claims assistance`
  },
  {
    id: 'training_mode',
    name: 'Training Mode',
    label: 'VSO Training Assistant',
    description: 'Provides answers for staff or trainee VSOs using VSO-style explanations, guided by CalVet, NACVSO, and M21-1 procedures.',
    tone: 'Instructional, formal',
    behavior: 'Provides answers for staff or trainee VSOs using VSO-style explanations, guided by CalVet, NACVSO, and M21-1 procedures.',
    compliance: 'Used only for internal training purposes. Teach procedures, not legal advice. Designed to simulate real-world VSO education environments.',
    icon: <BookOpen size={16} />,
    color: 'amber',
    defaultPrompt: `You are ForwardOps AI operating in Training Mode - an instructional, formal VSO training specialist.

**TONE:** Instructional, formal

**BEHAVIOR:**
- Provide VSO-style explanations and procedures
- Guide trainee VSOs through complex scenarios
- Reference CalVet, NACVSO, and M21-1 procedures
- Simulate real-world VSO education environments

**COMPLIANCE REQUIREMENTS:**
- Used ONLY for internal training purposes
- Teach procedures, not legal advice
- Reference official VSO training materials
- Maintain professional training standards

**TRAINING FOCUS AREAS:**
1. VSO accreditation requirements and procedures
2. Claims development best practices
3. Evidence gathering and submission techniques
4. Client interview and counseling skills
5. Regulatory interpretation and application
6. Professional ethics and standards

**TRAINING RESOURCES:**
- M21-1 Adjudication Procedures Manual
- 38 CFR (Code of Federal Regulations)
- NACVSO training materials
- CalVet procedures and guidelines
- VA training bulletins and updates

**DISCLAIMERS:**
- For training purposes only
- Not for direct veteran counseling
- Trainees must complete official accreditation
- Always verify procedures with current regulations`
  }
];

const AIBehaviorEditor: React.FC = () => {
  const [systemMessages, setSystemMessages] = useState<SystemMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<SystemMessage | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  // Editor form state
  const [editorForm, setEditorForm] = useState({
    name: '',
    description: '',
    content: '',
    mode: 'claims_mode',
    tone: '',
    style: '',
    disclaimers: [] as string[],
    instructions: [] as string[],
    compliance_notes: [] as string[],
    newDisclaimer: '',
    newInstruction: '',
    newComplianceNote: ''
  });

  useEffect(() => {
    loadSystemMessages();
  }, []);

  const loadSystemMessages = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('system_messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        if (fetchError.message.includes('relation "system_messages" does not exist')) {
          console.log('System messages table does not exist, will need to create it');
          setSystemMessages([]);
        } else {
          throw fetchError;
        }
      } else {
        setSystemMessages(data || []);
      }
    } catch (error: any) {
      console.error('Error loading system messages:', error);
      setError(`Failed to load system messages: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const createDefaultMessage = async (mode: string) => {
    try {
      setSaving(true);
      
      const modeInfo = CHAT_MODES.find(m => m.id === mode);
      if (!modeInfo) return;

      const defaultMessage = {
        name: `${modeInfo.name} Default`,
        description: modeInfo.description,
        content: modeInfo.defaultPrompt,
        mode: mode,
        is_active: true,
        is_default: true,
        metadata: {
          tone: modeInfo.tone,
          style: 'VSO-aligned professional communication',
          disclaimers: [
            'Follow all applicable VA regulations and procedures',
            'Not a substitute for accredited VSO representation',
            'Always verify information with official VA sources'
          ],
          instructions: [
            'Maintain professional VSO standards',
            'Reference specific regulations when applicable',
            'Provide procedural guidance only'
          ],
          compliance_notes: [modeInfo.compliance],
          created_by: 'System',
          version: '1.0'
        }
      };

      const { data, error } = await supabase
        .from('system_messages')
        .insert(defaultMessage)
        .select()
        .single();

      if (error) throw error;

      setSystemMessages(prev => [data, ...prev]);
      setError(null);
    } catch (error: any) {
      console.error('Error creating default message:', error);
      setError(`Failed to create default message: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (message: SystemMessage) => {
    setSelectedMessage(message);
    setEditorForm({
      name: message.name,
      description: message.description,
      content: message.content,
      mode: message.mode,
      tone: message.metadata.tone || '',
      style: message.metadata.style || '',
      disclaimers: message.metadata.disclaimers || [],
      instructions: message.metadata.instructions || [],
      compliance_notes: message.metadata.compliance_notes || [],
      newDisclaimer: '',
      newInstruction: '',
      newComplianceNote: ''
    });
    setShowEditor(true);
  };

  const handleNewMessage = () => {
    setSelectedMessage(null);
    const defaultMode = CHAT_MODES[0];
    setEditorForm({
      name: '',
      description: '',
      content: defaultMode.defaultPrompt,
      mode: defaultMode.id,
      tone: defaultMode.tone,
      style: 'VSO-aligned professional communication',
      disclaimers: ['Follow all applicable VA regulations and procedures'],
      instructions: ['Maintain professional VSO standards'],
      compliance_notes: [defaultMode.compliance],
      newDisclaimer: '',
      newInstruction: '',
      newComplianceNote: ''
    });
    setShowEditor(true);
  };

  const addDisclaimer = () => {
    if (editorForm.newDisclaimer.trim()) {
      setEditorForm(prev => ({
        ...prev,
        disclaimers: [...prev.disclaimers, prev.newDisclaimer.trim()],
        newDisclaimer: ''
      }));
    }
  };

  const removeDisclaimer = (index: number) => {
    setEditorForm(prev => ({
      ...prev,
      disclaimers: prev.disclaimers.filter((_, i) => i !== index)
    }));
  };

  const addInstruction = () => {
    if (editorForm.newInstruction.trim()) {
      setEditorForm(prev => ({
        ...prev,
        instructions: [...prev.instructions, prev.newInstruction.trim()],
        newInstruction: ''
      }));
    }
  };

  const removeInstruction = (index: number) => {
    setEditorForm(prev => ({
      ...prev,
      instructions: prev.instructions.filter((_, i) => i !== index)
    }));
  };

  const addComplianceNote = () => {
    if (editorForm.newComplianceNote.trim()) {
      setEditorForm(prev => ({
        ...prev,
        compliance_notes: [...prev.compliance_notes, prev.newComplianceNote.trim()],
        newComplianceNote: ''
      }));
    }
  };

  const removeComplianceNote = (index: number) => {
    setEditorForm(prev => ({
      ...prev,
      compliance_notes: prev.compliance_notes.filter((_, i) => i !== index)
    }));
  };

  const handleSave = async () => {
    if (!editorForm.name.trim() || !editorForm.content.trim()) {
      setError('Name and content are required');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const messageData = {
        name: editorForm.name.trim(),
        description: editorForm.description.trim(),
        content: editorForm.content.trim(),
        mode: editorForm.mode,
        is_active: true,
        is_default: false,
        metadata: {
          tone: editorForm.tone,
          style: editorForm.style,
          disclaimers: editorForm.disclaimers,
          instructions: editorForm.instructions,
          compliance_notes: editorForm.compliance_notes,
          created_by: 'Admin',
          version: '1.0',
          updated_at: new Date().toISOString()
        }
      };

      if (selectedMessage) {
        // Update existing message
        const { data, error } = await supabase
          .from('system_messages')
          .update(messageData)
          .eq('id', selectedMessage.id)
          .select()
          .single();

        if (error) throw error;

        setSystemMessages(prev => 
          prev.map(msg => msg.id === selectedMessage.id ? data : msg)
        );
      } else {
        // Create new message
        const { data, error } = await supabase
          .from('system_messages')
          .insert(messageData)
          .select()
          .single();

        if (error) throw error;

        setSystemMessages(prev => [data, ...prev]);
      }

      setShowEditor(false);
      setSelectedMessage(null);
    } catch (error: any) {
      console.error('Error saving system message:', error);
      setError(`Failed to save system message: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (messageId: string) => {
    const message = systemMessages.find(m => m.id === messageId);
    if (!message) return;

    if (!confirm(`Are you sure you want to delete "${message.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('system_messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;

      setSystemMessages(prev => prev.filter(msg => msg.id !== messageId));
    } catch (error: any) {
      console.error('Error deleting system message:', error);
      setError(`Failed to delete system message: ${error.message}`);
    }
  };

  const handleActivate = async (messageId: string) => {
    try {
      const message = systemMessages.find(m => m.id === messageId);
      if (!message) return;

      // First, deactivate all messages for this mode
      await supabase
        .from('system_messages')
        .update({ is_active: false })
        .eq('mode', message.mode);

      // Then activate the selected message
      const { error } = await supabase
        .from('system_messages')
        .update({ is_active: true })
        .eq('id', messageId);

      if (error) throw error;

      // Update local state
      setSystemMessages(prev => 
        prev.map(msg => ({
          ...msg,
          is_active: msg.id === messageId && msg.mode === message.mode ? true : 
                    msg.mode === message.mode ? false : msg.is_active
        }))
      );
    } catch (error: any) {
      console.error('Error activating system message:', error);
      setError(`Failed to activate system message: ${error.message}`);
    }
  };

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const getModeInfo = (mode: string) => {
    return CHAT_MODES.find(m => m.id === mode) || CHAT_MODES[0];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-6 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Brain size={28} className="text-purple-600" />
              AI Behavior + System Message Editor
            </h2>
            <p className="text-gray-600 mt-1">
              Configure structured chat modes aligned with VSO responsibilities and VA policy compliance
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
              variant="primary"
              onClick={handleNewMessage}
              leftIcon={<Plus size={16} />}
            >
              New System Message
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 flex-shrink-0">
          <AlertCircle size={20} />
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-600 hover:text-red-800"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Chat Modes Overview */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6 flex-shrink-0">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">VSO-Aligned Chat Modes</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {CHAT_MODES.map(mode => {
            const activeMessage = systemMessages.find(msg => msg.mode === mode.id && msg.is_active);
            return (
              <div key={mode.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-8 h-8 rounded-lg bg-${mode.color}-100 flex items-center justify-center`}>
                    <span className={`text-${mode.color}-600`}>
                      {mode.icon}
                    </span>
                  </div>
                  <h4 className="font-medium text-gray-900 text-sm">{mode.label}</h4>
                </div>
                <p className="text-xs text-gray-600 mb-2 line-clamp-2">{mode.description}</p>
                <div className="flex items-center justify-between">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    activeMessage 
                      ? `bg-${mode.color}-100 text-${mode.color}-800` 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {activeMessage ? 'Active' : 'No Message'}
                  </span>
                  {!activeMessage && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => createDefaultMessage(mode.id)}
                      disabled={saving}
                      className="text-xs px-2 py-1"
                    >
                      Create
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* System Messages Table */}
      <div className="bg-white rounded-lg shadow-sm border flex-1 min-h-0 flex flex-col">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">System Messages</h3>
          <p className="text-sm text-gray-600">Manage AI behavior patterns for each chat mode</p>
        </div>
        
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw size={20} className="animate-spin mr-2" />
              Loading system messages...
            </div>
          ) : systemMessages.length === 0 ? (
            <div className="text-center py-8">
              <Brain size={24} className="mx-auto mb-2 text-gray-400" />
              <p className="text-gray-500 mb-4">No system messages found</p>
              <p className="text-sm text-gray-400 mb-4">Create default messages for each chat mode to get started</p>
              <div className="flex flex-wrap justify-center gap-2">
                {CHAT_MODES.slice(0, 3).map(mode => (
                  <Button
                    key={mode.id}
                    variant="outline"
                    size="sm"
                    onClick={() => createDefaultMessage(mode.id)}
                    leftIcon={mode.icon}
                    isLoading={saving}
                  >
                    Create {mode.name}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Message
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mode
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Updated
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {systemMessages.map((message) => {
                  const modeInfo = getModeInfo(message.mode);
                  return (
                    <tr key={message.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className={`w-8 h-8 rounded-lg bg-${modeInfo.color}-100 flex items-center justify-center mr-3 flex-shrink-0`}>
                            <span className={`text-${modeInfo.color}-600`}>
                              {modeInfo.icon}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {message.name}
                            </div>
                            <div className="text-sm text-gray-500 truncate">
                              {message.description || 'No description'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${modeInfo.color}-100 text-${modeInfo.color}-800`}>
                          {modeInfo.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {message.is_active ? (
                            <CheckCircle size={16} className="text-green-600" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                          )}
                          <span className={`text-sm ${message.is_active ? 'text-green-600 font-medium' : 'text-gray-500'}`}>
                            {message.is_active ? 'Active' : 'Inactive'}
                          </span>
                          {message.is_default && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              Default
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(message.updated_at || message.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedMessage(message);
                              setShowPreview(true);
                            }}
                            leftIcon={<Eye size={16} />}
                          >
                            Preview
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(message)}
                            leftIcon={<Edit3 size={16} />}
                          >
                            Edit
                          </Button>
                          
                          {!message.is_active && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleActivate(message.id)}
                              leftIcon={<CheckCircle size={16} />}
                            >
                              Activate
                            </Button>
                          )}
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(message.id)}
                            leftIcon={<Trash2 size={16} />}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50"
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Editor Modal */}
      {showEditor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedMessage ? 'Edit System Message' : 'Create New System Message'}
              </h3>
              <button
                onClick={() => {
                  setShowEditor(false);
                  setSelectedMessage(null);
                  setError(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Message Name *
                    </label>
                    <input
                      type="text"
                      value={editorForm.name}
                      onChange={(e) => setEditorForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Claims Assistant AI"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Chat Mode *
                    </label>
                    <select
                      value={editorForm.mode}
                      onChange={(e) => {
                        const newMode = e.target.value;
                        const modeInfo = CHAT_MODES.find(m => m.id === newMode);
                        setEditorForm(prev => ({ 
                          ...prev, 
                          mode: newMode,
                          content: modeInfo?.defaultPrompt || prev.content,
                          tone: modeInfo?.tone || prev.tone
                        }));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {CHAT_MODES.map(mode => (
                        <option key={mode.id} value={mode.id}>{mode.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <input
                    type="text"
                    value={editorForm.description}
                    onChange={(e) => setEditorForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Brief description of this system message"
                  />
                </div>

                {/* Tone and Style */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tone
                    </label>
                    <input
                      type="text"
                      value={editorForm.tone}
                      onChange={(e) => setEditorForm(prev => ({ ...prev, tone: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Professional and supportive"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Communication Style
                    </label>
                    <input
                      type="text"
                      value={editorForm.style}
                      onChange={(e) => setEditorForm(prev => ({ ...prev, style: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., VSO-aligned professional communication"
                    />
                  </div>
                </div>

                {/* Compliance Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Compliance Requirements
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={editorForm.newComplianceNote}
                      onChange={(e) => setEditorForm(prev => ({ ...prev, newComplianceNote: e.target.value }))}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addComplianceNote())}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Add compliance requirement and press Enter"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addComplianceNote}
                      leftIcon={<Plus size={16} />}
                    >
                      Add
                    </Button>
                  </div>
                  
                  {editorForm.compliance_notes.length > 0 && (
                    <div className="space-y-2">
                      {editorForm.compliance_notes.map((note, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-yellow-50 rounded border border-yellow-200">
                          <span className="flex-1 text-sm">{note}</span>
                          <button
                            onClick={() => removeComplianceNote(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Disclaimers */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Disclaimers
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={editorForm.newDisclaimer}
                      onChange={(e) => setEditorForm(prev => ({ ...prev, newDisclaimer: e.target.value }))}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addDisclaimer())}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Add a disclaimer and press Enter"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addDisclaimer}
                      leftIcon={<Plus size={16} />}
                    >
                      Add
                    </Button>
                  </div>
                  
                  {editorForm.disclaimers.length > 0 && (
                    <div className="space-y-2">
                      {editorForm.disclaimers.map((disclaimer, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                          <span className="flex-1 text-sm">{disclaimer}</span>
                          <button
                            onClick={() => removeDisclaimer(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Instructions */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Instructions
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={editorForm.newInstruction}
                      onChange={(e) => setEditorForm(prev => ({ ...prev, newInstruction: e.target.value }))}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addInstruction())}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Add an instruction and press Enter"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addInstruction}
                      leftIcon={<Plus size={16} />}
                    >
                      Add
                    </Button>
                  </div>
                  
                  {editorForm.instructions.length > 0 && (
                    <div className="space-y-2">
                      {editorForm.instructions.map((instruction, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                          <span className="flex-1 text-sm">{instruction}</span>
                          <button
                            onClick={() => removeInstruction(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* System Message Content */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    System Message Content *
                  </label>
                  <textarea
                    value={editorForm.content}
                    onChange={(e) => setEditorForm(prev => ({ ...prev, content: e.target.value }))}
                    rows={12}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                    placeholder="Enter the complete system message that will guide the AI's behavior..."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This is the core prompt that defines how the AI will behave and respond to users in this mode.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50 flex-shrink-0">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowEditor(false);
                  setSelectedMessage(null);
                  setError(null);
                }}
                disabled={saving}
              >
                Cancel
              </Button>
              
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={!editorForm.name.trim() || !editorForm.content.trim() || saving}
                leftIcon={saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
              >
                {saving ? 'Saving...' : (selectedMessage ? 'Update Message' : 'Create Message')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && selectedMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Preview: {selectedMessage.name}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {getModeInfo(selectedMessage.mode).label} • {selectedMessage.is_active ? 'Active' : 'Inactive'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(selectedMessage.content)}
                  leftIcon={<Copy size={16} />}
                >
                  Copy
                </Button>
                <button
                  onClick={() => {
                    setShowPreview(false);
                    setSelectedMessage(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {/* Mode Information */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h4 className="font-medium text-blue-900 mb-2">Chat Mode Configuration</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-blue-800">Tone:</span>
                    <p className="text-blue-700">{getModeInfo(selectedMessage.mode).tone}</p>
                  </div>
                  <div>
                    <span className="font-medium text-blue-800">Behavior:</span>
                    <p className="text-blue-700">{getModeInfo(selectedMessage.mode).behavior}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="font-medium text-blue-800">Compliance:</span>
                    <p className="text-blue-700">{getModeInfo(selectedMessage.mode).compliance}</p>
                  </div>
                </div>
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Configuration</h4>
                  <dl className="space-y-2 text-sm">
                    <div>
                      <dt className="text-gray-500">Tone:</dt>
                      <dd className="text-gray-900">{selectedMessage.metadata.tone || 'Not specified'}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Style:</dt>
                      <dd className="text-gray-900">{selectedMessage.metadata.style || 'Not specified'}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Created:</dt>
                      <dd className="text-gray-900">{formatDate(selectedMessage.created_at)}</dd>
                    </div>
                  </dl>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Requirements & Guidelines</h4>
                  <div className="space-y-3">
                    {selectedMessage.metadata.compliance_notes && selectedMessage.metadata.compliance_notes.length > 0 && (
                      <div>
                        <h5 className="text-xs font-medium text-gray-700 uppercase tracking-wider">Compliance</h5>
                        <ul className="mt-1 space-y-1">
                          {selectedMessage.metadata.compliance_notes.map((note, index) => (
                            <li key={index} className="text-sm text-yellow-700 bg-yellow-50 px-2 py-1 rounded">⚠️ {note}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {selectedMessage.metadata.disclaimers && selectedMessage.metadata.disclaimers.length > 0 && (
                      <div>
                        <h5 className="text-xs font-medium text-gray-700 uppercase tracking-wider">Disclaimers</h5>
                        <ul className="mt-1 space-y-1">
                          {selectedMessage.metadata.disclaimers.map((disclaimer, index) => (
                            <li key={index} className="text-sm text-gray-600">• {disclaimer}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {selectedMessage.metadata.instructions && selectedMessage.metadata.instructions.length > 0 && (
                      <div>
                        <h5 className="text-xs font-medium text-gray-700 uppercase tracking-wider">Instructions</h5>
                        <ul className="mt-1 space-y-1">
                          {selectedMessage.metadata.instructions.map((instruction, index) => (
                            <li key={index} className="text-sm text-gray-600">• {instruction}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Content */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">System Message Content</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono leading-relaxed">
                    {selectedMessage.content}
                  </pre>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50 flex-shrink-0">
              <Button
                variant="outline"
                onClick={() => handleEdit(selectedMessage)}
                leftIcon={<Edit3 size={16} />}
              >
                Edit Message
              </Button>
              
              <Button
                variant="ghost"
                onClick={() => {
                  setShowPreview(false);
                  setSelectedMessage(null);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIBehaviorEditor;