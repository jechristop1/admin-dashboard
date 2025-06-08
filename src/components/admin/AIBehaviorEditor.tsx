import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  MessageSquare, 
  Plus, 
  Edit3, 
  Trash2, 
  Eye, 
  EyeOff,
  Save, 
  X, 
  AlertCircle, 
  CheckCircle, 
  RefreshCw,
  Settings,
  FileText,
  Shield,
  Users,
  Briefcase,
  GraduationCap,
  DollarSign,
  Home,
  Heart,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Info,
  Tag,
  Clock,
  User
} from 'lucide-react';
import Button from '../ui/Button';
import { supabase } from '../../lib/supabase';

interface SystemMessage {
  id: string;
  name: string;
  description: string | null;
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
    [key: string]: any;
  };
  compliance_notes: string[] | null;
  created_at: string;
  updated_at: string;
}

interface ChatMode {
  value: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  tone: string;
  behavior: string;
  compliance: string;
  triggerKeywords: string[];
  exampleQueries: string[];
}

const AIBehaviorEditor: React.FC = () => {
  const [systemMessages, setSystemMessages] = useState<SystemMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<SystemMessage | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  // Form state for create/edit
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    content: '',
    mode: 'general',
    is_active: false,
    is_default: false,
    compliance_notes: [] as string[],
    newComplianceNote: ''
  });

  // VSO-aligned chat modes with comprehensive details
  const chatModes: ChatMode[] = [
    {
      value: 'claims_mode',
      label: 'VA Claims Support',
      description: 'Step-by-step guidance through VA disability claims',
      icon: <FileText size={20} />,
      color: 'blue',
      tone: 'Tactical, veteran-to-veteran, direct',
      behavior: 'Guides users through filing, evidence gathering, effective dates, C&P exams, and service connection.',
      compliance: 'Must follow 38 CFR and M21-1 guidance. No legal advice—only procedural explanation.',
      triggerKeywords: ['claim', 'disability', 'rating', 'service connection', 'evidence', 'appeal', 'file claim'],
      exampleQueries: [
        'How do I file a disability claim?',
        'What evidence do I need for my PTSD claim?',
        'How are disability ratings calculated?'
      ]
    },
    {
      value: 'transition_mode',
      label: 'Transition & TAP Guidance',
      description: 'Supports veterans during the military-to-civilian transition',
      icon: <Users size={20} />,
      color: 'green',
      tone: 'Mission-focused, motivational',
      behavior: 'Covers the 12-month separation timeline, TAP prep, mindset shift, job and school planning.',
      compliance: 'Use verified VA, DoD, and TAP-aligned resources. No financial or legal advice.',
      triggerKeywords: ['transition', 'tap', 'separation', 'civilian', 'job search', 'resume', 'leaving military'],
      exampleQueries: [
        'How do I prepare for civilian transition?',
        'What is the TAP program?',
        'Help me with my transition timeline'
      ]
    },
    {
      value: 'document_mode',
      label: 'Document Analysis',
      description: 'Summarizes and interprets uploaded VA documents',
      icon: <Eye size={20} />,
      color: 'purple',
      tone: 'Clear, professional',
      behavior: 'Returns a two-part output: (1) plain-English summary, and (2) structured VSO-style report with document type, issues, action steps, and references if needed.',
      compliance: 'No reinterpretation of VA decisions. Use M21-1 for procedural clarity.',
      triggerKeywords: ['analyze', 'document', 'rating decision', 'c&p exam', 'dbq', 'what does this mean', 'explain this'],
      exampleQueries: [
        'What does this rating decision mean?',
        'Analyze my C&P exam results',
        'Help me understand this DBQ'
      ]
    },
    {
      value: 'mental_health_mode',
      label: 'Mental Health Support',
      description: 'Offers trauma-informed peer support and mental health claims guidance',
      icon: <Heart size={20} />,
      color: 'pink',
      tone: 'Empathetic, trauma-informed',
      behavior: 'Offers peer-level support and VA claim guidance related to PTSD, MST, anxiety, depression.',
      compliance: 'Never diagnose. Refer to VA, Vet Centers, or MST coordinators. Use M21-1 Part III, Subpart iv as guidance for claims.',
      triggerKeywords: ['ptsd', 'mental health', 'depression', 'anxiety', 'mst', 'trauma', 'counseling', 'therapy'],
      exampleQueries: [
        'I need help with PTSD',
        'How do I file a mental health claim?',
        'Where can I get counseling?'
      ]
    },
    {
      value: 'education_mode',
      label: 'Education & GI Bill Support',
      description: 'Explains how to access and use VA education benefits',
      icon: <GraduationCap size={20} />,
      color: 'indigo',
      tone: 'Helpful, informative',
      behavior: 'Explains how to apply for GI Bill, VR&E, use the COE, and compare schools.',
      compliance: 'Use official VA education policies. No personal education advising.',
      triggerKeywords: ['gi bill', 'education', 'school', 'college', 'vr&e', 'chapter 31', 'chapter 33', 'degree'],
      exampleQueries: [
        'How do I use the GI Bill?',
        'What is VR&E?',
        'Help me choose a school'
      ]
    },
    {
      value: 'career_mode',
      label: 'Career & Job Readiness',
      description: 'Helps veterans prepare for employment',
      icon: <Briefcase size={20} />,
      color: 'orange',
      tone: 'Civilian-friendly, practical',
      behavior: 'Helps translate military experience, build resumes, optimize LinkedIn, and explore careers.',
      compliance: 'Avoid specific job placement advice. Recommend VA and DoL tools (e.g., O*NET, Hiring Our Heroes).',
      triggerKeywords: ['job', 'career', 'resume', 'interview', 'linkedin', 'employment', 'work', 'hiring', 'skills'],
      exampleQueries: [
        'Help me translate my military experience',
        'How do I write a civilian resume?',
        'What careers match my skills?'
      ]
    },
    {
      value: 'finance_mode',
      label: 'Financial Planning & VA Pay',
      description: 'Helps veterans understand disability compensation and budgeting',
      icon: <DollarSign size={20} />,
      color: 'emerald',
      tone: 'Grounded, calm',
      behavior: 'Educates users on disability pay, budgeting after transition, and understanding back pay or offsets.',
      compliance: 'No financial planning advice. Stick to VA benefits education only.',
      triggerKeywords: ['pay', 'compensation', 'money', 'budget', 'back pay', 'offset', 'financial', 'payment'],
      exampleQueries: [
        'When will I get my disability pay?',
        'How is back pay calculated?',
        'What are VA payment offsets?'
      ]
    },
    {
      value: 'housing_mode',
      label: 'Housing & VA Home Loans',
      description: 'Explains VA loan process and housing considerations',
      icon: <Home size={20} />,
      color: 'cyan',
      tone: 'Straightforward, protective',
      behavior: 'Walks through VA loan eligibility, COE, renting vs buying, and moving checklists.',
      compliance: 'No mortgage or legal advice. Only explain VA benefits and procedures.',
      triggerKeywords: ['home loan', 'housing', 'mortgage', 'coe', 'buy house', 'va loan', 'real estate'],
      exampleQueries: [
        'How do I get a VA home loan?',
        'What is a Certificate of Eligibility?',
        'Can I use my VA loan benefit?'
      ]
    },
    {
      value: 'survivor_mode',
      label: 'Survivor & Dependent Benefits',
      description: 'Supports dependents and survivors with DIC and related benefits',
      icon: <Shield size={20} />,
      color: 'rose',
      tone: 'Compassionate, respectful',
      behavior: 'Explains DIC, CHAMPVA, dependents\' claims, and accrued benefits.',
      compliance: 'Follow 38 CFR Part 3 and M21-1 Part IV. Avoid legal conclusions—focus on eligibility and forms.',
      triggerKeywords: ['dic', 'survivor', 'dependent', 'champva', 'widow', 'spouse', 'children', 'death benefits'],
      exampleQueries: [
        'What is DIC?',
        'How do I apply for survivor benefits?',
        'What is CHAMPVA?'
      ]
    },
    {
      value: 'training_mode',
      label: 'VSO Training Assistant',
      description: 'Educates both veterans and staff on VA claims, benefits, and self-advocacy',
      icon: <BookOpen size={20} />,
      color: 'amber',
      tone: 'Instructional, formal',
      behavior: 'Provides answers for staff or trainee VSOs using VSO-style explanations, guided by CalVet, NACVSO, and M21-1 procedures.',
      compliance: 'Used only for internal training purposes. Teach procedures, not legal advice. Designed to simulate real-world VSO education environments.',
      triggerKeywords: ['train', 'teach', 'learn', 'how does', 'explain', 'vso', 'course', 'training', 'help other veterans'],
      exampleQueries: [
        'Train me on VA claims process',
        'How does the appeals process work?',
        'Teach me about service connection'
      ]
    },
    {
      value: 'general',
      label: 'General Support',
      description: 'Default mode for general veteran support and guidance',
      icon: <MessageSquare size={20} />,
      color: 'gray',
      tone: 'Supportive, informative',
      behavior: 'Provides general veteran support and guidance across all areas.',
      compliance: 'Follow all VA policies and procedures. Provide general guidance and refer to specialists when needed.',
      triggerKeywords: ['help', 'support', 'question', 'general', 'where do i start', 'what services'],
      exampleQueries: [
        'How can you help me?',
        'What services are available?',
        'I need general support'
      ]
    }
  ];

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
        console.error('Error loading system messages:', fetchError);
        throw fetchError;
      }

      setSystemMessages(data || []);
    } catch (error: any) {
      console.error('Error loading system messages:', error);
      setError(`Failed to load system messages: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getModeDetails = (mode: string): ChatMode => {
    return chatModes.find(m => m.value === mode) || chatModes[chatModes.length - 1]; // Default to general
  };

  const getColorClasses = (color: string, variant: 'bg' | 'text' | 'border' = 'bg') => {
    const colorMap = {
      blue: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
      green: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
      purple: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200' },
      pink: { bg: 'bg-pink-100', text: 'text-pink-800', border: 'border-pink-200' },
      indigo: { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-200' },
      orange: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200' },
      emerald: { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-200' },
      cyan: { bg: 'bg-cyan-100', text: 'text-cyan-800', border: 'border-cyan-200' },
      rose: { bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-200' },
      amber: { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200' },
      gray: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200' }
    };
    return colorMap[color as keyof typeof colorMap]?.[variant] || colorMap.gray[variant];
  };

  const toggleCardExpansion = (messageId: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const handleCreateMessage = () => {
    setFormData({
      name: '',
      description: '',
      content: '',
      mode: 'general',
      is_active: false,
      is_default: false,
      compliance_notes: [],
      newComplianceNote: ''
    });
    setShowCreateModal(true);
  };

  const handleEditMessage = (message: SystemMessage) => {
    setSelectedMessage(message);
    setFormData({
      name: message.name,
      description: message.description || '',
      content: message.content,
      mode: message.mode,
      is_active: message.is_active,
      is_default: message.is_default,
      compliance_notes: message.compliance_notes || [],
      newComplianceNote: ''
    });
    setShowEditModal(true);
  };

  const handleViewMessage = (message: SystemMessage) => {
    setSelectedMessage(message);
    setShowViewModal(true);
  };

  const addComplianceNote = () => {
    if (formData.newComplianceNote.trim()) {
      setFormData(prev => ({
        ...prev,
        compliance_notes: [...prev.compliance_notes, prev.newComplianceNote.trim()],
        newComplianceNote: ''
      }));
    }
  };

  const removeComplianceNote = (index: number) => {
    setFormData(prev => ({
      ...prev,
      compliance_notes: prev.compliance_notes.filter((_, i) => i !== index)
    }));
  };

  const loadDefaultContent = (mode: string) => {
    const modeDetails = getModeDetails(mode);
    const defaultContent = `You are ForwardOps AI operating in ${modeDetails.label}.

**TONE:** ${modeDetails.tone}

**BEHAVIOR:**
${modeDetails.behavior}

**COMPLIANCE REQUIREMENTS:**
${modeDetails.compliance}

**KEY FOCUS AREAS:**
- Provide specific guidance for ${modeDetails.label.toLowerCase()}
- Use trauma-informed, veteran-to-veteran communication
- Reference relevant VA policies and procedures
- Always recommend official VA verification

**DISCLAIMERS:**
- Not a substitute for professional advice
- Always verify information with official VA sources
- Recommend consulting with accredited representatives for complex cases`;

    setFormData(prev => ({
      ...prev,
      content: defaultContent,
      description: modeDetails.description,
      compliance_notes: [modeDetails.compliance]
    }));
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.content.trim()) {
      setError('Name and content are required');
      return;
    }

    try {
      setError(null);
      const messageData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        content: formData.content.trim(),
        mode: formData.mode,
        is_active: formData.is_active,
        is_default: formData.is_default,
        compliance_notes: formData.compliance_notes.length > 0 ? formData.compliance_notes : null,
        metadata: {
          tone: getModeDetails(formData.mode).tone,
          style: 'VSO-aligned professional communication',
          compliance_notes: formData.compliance_notes,
          created_by: 'Admin',
          version: '1.0'
        }
      };

      if (selectedMessage) {
        // Update existing message
        const { error: updateError } = await supabase
          .from('system_messages')
          .update(messageData)
          .eq('id', selectedMessage.id);

        if (updateError) throw updateError;
      } else {
        // Create new message
        const { error: insertError } = await supabase
          .from('system_messages')
          .insert(messageData);

        if (insertError) throw insertError;
      }

      // Reload messages
      await loadSystemMessages();

      // Close modals
      setShowCreateModal(false);
      setShowEditModal(false);
      setSelectedMessage(null);

    } catch (error: any) {
      console.error('Error saving system message:', error);
      setError(`Failed to save system message: ${error.message}`);
    }
  };

  const handleDelete = async (messageId: string) => {
    if (!confirm('Are you sure you want to delete this system message? This action cannot be undone.')) {
      return;
    }

    try {
      setDeletingIds(prev => new Set(prev).add(messageId));
      setError(null);

      const { error: deleteError } = await supabase
        .from('system_messages')
        .delete()
        .eq('id', messageId);

      if (deleteError) throw deleteError;

      // Reload messages
      await loadSystemMessages();

    } catch (error: any) {
      console.error('Error deleting system message:', error);
      setError(`Failed to delete system message: ${error.message}`);
    } finally {
      setDeletingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(messageId);
        return newSet;
      });
    }
  };

  const handleToggleActive = async (messageId: string, currentActive: boolean) => {
    try {
      setSavingIds(prev => new Set(prev).add(messageId));
      setError(null);

      const { error: updateError } = await supabase
        .from('system_messages')
        .update({ is_active: !currentActive })
        .eq('id', messageId);

      if (updateError) throw updateError;

      // Reload messages
      await loadSystemMessages();

    } catch (error: any) {
      console.error('Error toggling active status:', error);
      setError(`Failed to update active status: ${error.message}`);
    } finally {
      setSavingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(messageId);
        return newSet;
      });
    }
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
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="mb-8 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Brain size={28} className="text-blue-600" />
              AI Behavior Editor
            </h2>
            <p className="text-gray-600 mt-1">
              Configure AI system messages and behavior for different chat modes
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
              onClick={handleCreateMessage}
              leftIcon={<Plus size={16} />}
            >
              Add Message
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

      {/* System Messages */}
      <div className="bg-white rounded-lg shadow-sm border flex-1 min-h-0 flex flex-col">
        <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          <div className="divide-y divide-gray-200">
            {loading ? (
              <div className="p-6">
                <div className="flex items-center justify-center gap-2">
                  <RefreshCw size={20} className="animate-spin" />
                  Loading system messages...
                </div>
              </div>
            ) : systemMessages.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <Brain size={24} className="mx-auto mb-2 text-gray-400" />
                <p>No system messages found</p>
                <p className="text-sm mt-1">Create your first system message to get started</p>
              </div>
            ) : (
              systemMessages.map((message) => {
                const modeDetails = getModeDetails(message.mode);
                const isExpanded = expandedCards.has(message.id);
                
                return (
                  <div key={message.id} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        {/* Mode Icon */}
                        <div className={`p-3 rounded-lg ${getColorClasses(modeDetails.color, 'bg')}`}>
                          <div className={getColorClasses(modeDetails.color, 'text')}>
                            {modeDetails.icon}
                          </div>
                        </div>
                        
                        {/* Message Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900 truncate">
                              {message.name}
                            </h3>
                            
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getColorClasses(modeDetails.color, 'bg')} ${getColorClasses(modeDetails.color, 'text')}`}>
                              {modeDetails.label}
                            </span>
                            
                            {message.is_active && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <CheckCircle size={12} className="mr-1" />
                                Active
                              </span>
                            )}
                            
                            {message.is_default && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                Default
                              </span>
                            )}
                          </div>
                          
                          {/* Description */}
                          {message.description && (
                            <p className="text-gray-600 mb-3">
                              {message.description}
                            </p>
                          )}
                          
                          {/* Mode Details */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 mb-1">Tone</h4>
                              <p className="text-sm text-gray-600">{modeDetails.tone}</p>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 mb-1">Behavior</h4>
                              <p className="text-sm text-gray-600 line-clamp-2">{modeDetails.behavior}</p>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 mb-1">Compliance</h4>
                              <p className="text-sm text-gray-600 line-clamp-2">{modeDetails.compliance}</p>
                            </div>
                          </div>
                          
                          {/* Compliance Notes */}
                          {(message.compliance_notes && message.compliance_notes.length > 0) && (
                            <div className="mb-4">
                              <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                                <Shield size={14} />
                                Compliance Notes
                              </h4>
                              <div className="space-y-1">
                                {message.compliance_notes.map((note, index) => (
                                  <div key={index} className="text-sm text-gray-600 bg-yellow-50 border border-yellow-200 rounded px-3 py-2">
                                    {note}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Expandable Content */}
                          <button
                            onClick={() => toggleCardExpansion(message.id)}
                            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 mb-3"
                          >
                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            {isExpanded ? 'Hide Details' : 'Show System Message Content'}
                          </button>
                          
                          {isExpanded && (
                            <div className="space-y-4 border-t border-gray-200 pt-4">
                              {/* System Message Content */}
                              <div>
                                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                                  <MessageSquare size={14} />
                                  System Message Content
                                </h4>
                                <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                                  <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono">
                                    {message.content}
                                  </pre>
                                </div>
                              </div>
                              
                              {/* Trigger Keywords */}
                              <div>
                                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                                  <Tag size={14} />
                                  Trigger Keywords
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                  {modeDetails.triggerKeywords.map(keyword => (
                                    <span
                                      key={keyword}
                                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
                                    >
                                      {keyword}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              
                              {/* Example Queries */}
                              <div>
                                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                                  <Info size={14} />
                                  Example User Queries
                                </h4>
                                <div className="space-y-2">
                                  {modeDetails.exampleQueries.map((query, index) => (
                                    <div key={index} className="text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded px-3 py-2">
                                      "{query}"
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* Metadata */}
                          <div className="flex items-center gap-4 text-xs text-gray-500 mt-4">
                            <div className="flex items-center gap-1">
                              <Clock size={12} />
                              Created: {formatDate(message.created_at)}
                            </div>
                            <div className="flex items-center gap-1">
                              <User size={12} />
                              Updated: {formatDate(message.updated_at)}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewMessage(message)}
                          leftIcon={<Eye size={16} />}
                        >
                          View
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditMessage(message)}
                          leftIcon={<Edit3 size={16} />}
                        >
                          Edit
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(message.id, message.is_active)}
                          disabled={savingIds.has(message.id)}
                          leftIcon={
                            savingIds.has(message.id) ? 
                            <RefreshCw size={16} className="animate-spin" /> : 
                            message.is_active ? <EyeOff size={16} /> : <Eye size={16} />
                          }
                          className={message.is_active ? 'text-orange-600 hover:text-orange-800' : 'text-green-600 hover:text-green-800'}
                        >
                          {message.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(message.id)}
                          disabled={deletingIds.has(message.id)}
                          leftIcon={
                            deletingIds.has(message.id) ? 
                            <RefreshCw size={16} className="animate-spin" /> : 
                            <Trash2 size={16} />
                          }
                          className="text-red-600 hover:text-red-800"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
              <h3 className="text-lg font-semibold text-gray-900">
                {showCreateModal ? 'Create System Message' : 'Edit System Message'}
              </h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setShowEditModal(false);
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
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Message Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Claims Mode Default"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Chat Mode *
                    </label>
                    <select
                      value={formData.mode}
                      onChange={(e) => setFormData(prev => ({ ...prev, mode: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {chatModes.map(mode => (
                        <option key={mode.value} value={mode.value}>
                          {mode.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

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
                    placeholder="Brief description of this system message's purpose"
                  />
                </div>

                {/* Load Default Content Button */}
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    onClick={() => loadDefaultContent(formData.mode)}
                    leftIcon={<Settings size={16} />}
                  >
                    Load Default Content for {getModeDetails(formData.mode).label}
                  </Button>
                  
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Active</span>
                    </label>
                    
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.is_default}
                        onChange={(e) => setFormData(prev => ({ ...prev, is_default: e.target.checked }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Default</span>
                    </label>
                  </div>
                </div>

                {/* System Message Content */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    System Message Content *
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                    rows={12}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                    placeholder="Enter the system message content that will guide the AI's behavior..."
                  />
                </div>

                {/* Compliance Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Compliance Notes
                  </label>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formData.newComplianceNote}
                        onChange={(e) => setFormData(prev => ({ ...prev, newComplianceNote: e.target.value }))}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addComplianceNote())}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Add compliance note and press Enter"
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
                    
                    {formData.compliance_notes.length > 0 && (
                      <div className="space-y-2">
                        {formData.compliance_notes.map((note, index) => (
                          <div key={index} className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <Shield size={16} className="text-yellow-600 flex-shrink-0" />
                            <span className="flex-1 text-sm text-gray-800">{note}</span>
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
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50 flex-shrink-0">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowCreateModal(false);
                  setShowEditModal(false);
                  setSelectedMessage(null);
                  setError(null);
                }}
              >
                Cancel
              </Button>
              
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={!formData.name.trim() || !formData.content.trim()}
                leftIcon={<Save size={16} />}
              >
                {showCreateModal ? 'Create Message' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && selectedMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedMessage.name}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {getModeDetails(selectedMessage.mode).label} • {formatDate(selectedMessage.created_at)}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedMessage(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* Description */}
                {selectedMessage.description && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                    <p className="text-gray-700">{selectedMessage.description}</p>
                  </div>
                )}
                
                {/* Mode Details */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Mode Configuration</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-1">Tone</h5>
                      <p className="text-sm text-gray-600">{getModeDetails(selectedMessage.mode).tone}</p>
                    </div>
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-1">Behavior</h5>
                      <p className="text-sm text-gray-600">{getModeDetails(selectedMessage.mode).behavior}</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <h5 className="text-sm font-medium text-gray-700 mb-1">Compliance Requirements</h5>
                    <p className="text-sm text-gray-600">{getModeDetails(selectedMessage.mode).compliance}</p>
                  </div>
                </div>
                
                {/* Compliance Notes */}
                {selectedMessage.compliance_notes && selectedMessage.compliance_notes.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <Shield size={16} />
                      Compliance Notes
                    </h4>
                    <div className="space-y-2">
                      {selectedMessage.compliance_notes.map((note, index) => (
                        <div key={index} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-sm text-gray-800">{note}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* System Message Content */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">System Message Content</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono">
                      {selectedMessage.content}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50 flex-shrink-0">
              <Button
                variant="outline"
                onClick={() => handleEditMessage(selectedMessage)}
                leftIcon={<Edit3 size={16} />}
              >
                Edit Message
              </Button>
              
              <Button
                variant="ghost"
                onClick={() => {
                  setShowViewModal(false);
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