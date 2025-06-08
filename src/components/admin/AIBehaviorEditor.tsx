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
  Zap
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
  description: string;
  icon: string;
  color: string;
}

const DEFAULT_CHAT_MODES: ChatMode[] = [
  {
    id: 'general',
    name: 'General Support',
    description: 'General VA assistance and guidance',
    icon: 'MessageSquare',
    color: 'blue'
  },
  {
    id: 'claims',
    name: 'Claims Assistance',
    description: 'Disability claims and compensation',
    icon: 'FileText',
    color: 'green'
  },
  {
    id: 'transition',
    name: 'Transition Support',
    description: 'Military to civilian transition',
    icon: 'Zap',
    color: 'purple'
  },
  {
    id: 'tap',
    name: 'TAP Program',
    description: 'Transition Assistance Program guidance',
    icon: 'Brain',
    color: 'orange'
  }
];

const DEFAULT_SYSTEM_MESSAGE = `You are ForwardOps AI, a trauma-informed virtual Veterans Service Officer. Follow these guidelines:

1. **Tone & Approach:**
   - Speak like a veteran helping another veteran
   - Be clear, direct, and practical
   - Use trauma-informed language
   - Maintain a supportive, respectful tone

2. **Response Format:**
   - Use markdown for better readability
   - Break down complex topics into digestible sections
   - Use bullet points for lists
   - Use headings for organization

3. **Core Responsibilities:**
   - Focus on actionable steps
   - Reference VA policies when relevant
   - Explain technical terms in plain language
   - Provide specific guidance based on user documents

4. **Important Disclaimers:**
   - You are not a substitute for official VA guidance
   - Always recommend verifying information with official VA sources
   - Encourage users to seek professional help when appropriate
   - Acknowledge limitations when unsure

5. **Document Integration:**
   - Reference uploaded documents directly
   - Quote relevant sections when helpful
   - Explain how general information applies to specific situations
   - Highlight important dates and deadlines`;

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
    mode: 'general',
    tone: '',
    style: '',
    disclaimers: [] as string[],
    instructions: [] as string[],
    newDisclaimer: '',
    newInstruction: ''
  });

  useEffect(() => {
    loadSystemMessages();
  }, []);

  const loadSystemMessages = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if system_messages table exists, if not create it
      const { data, error: fetchError } = await supabase
        .from('system_messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        // If table doesn't exist, we'll create a default message
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

  const createDefaultMessage = async () => {
    try {
      setSaving(true);
      
      const defaultMessage = {
        name: 'Default ForwardOps AI',
        description: 'Default system message for ForwardOps AI',
        content: DEFAULT_SYSTEM_MESSAGE,
        mode: 'general',
        is_active: true,
        is_default: true,
        metadata: {
          tone: 'Professional and supportive',
          style: 'Veteran-to-veteran communication',
          disclaimers: [
            'Not a substitute for official VA guidance',
            'Always verify information with official VA sources',
            'Seek professional help when appropriate'
          ],
          instructions: [
            'Use trauma-informed language',
            'Provide actionable steps',
            'Reference VA policies when relevant',
            'Explain technical terms clearly'
          ],
          created_by: 'System',
          version: '1.0'
        }
      };

      // Since table might not exist, we'll use a direct insert
      const { data, error } = await supabase
        .from('system_messages')
        .insert(defaultMessage)
        .select()
        .single();

      if (error) throw error;

      setSystemMessages([data]);
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
      newDisclaimer: '',
      newInstruction: ''
    });
    setShowEditor(true);
  };

  const handleNewMessage = () => {
    setSelectedMessage(null);
    setEditorForm({
      name: '',
      description: '',
      content: DEFAULT_SYSTEM_MESSAGE,
      mode: 'general',
      tone: 'Professional and supportive',
      style: 'Veteran-to-veteran communication',
      disclaimers: ['Not a substitute for official VA guidance'],
      instructions: ['Use trauma-informed language'],
      newDisclaimer: '',
      newInstruction: ''
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
      // First, deactivate all messages
      await supabase
        .from('system_messages')
        .update({ is_active: false })
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all

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
          is_active: msg.id === messageId
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
    return DEFAULT_CHAT_MODES.find(m => m.id === mode) || DEFAULT_CHAT_MODES[0];
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
              Control how the AI behaves and responds by managing system messages and chat modes
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
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Chat Modes</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {DEFAULT_CHAT_MODES.map(mode => (
            <div key={mode.id} className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 rounded-lg bg-${mode.color}-100 flex items-center justify-center`}>
                  <MessageSquare size={16} className={`text-${mode.color}-600`} />
                </div>
                <h4 className="font-medium text-gray-900">{mode.name}</h4>
              </div>
              <p className="text-sm text-gray-600">{mode.description}</p>
              <div className="mt-2">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-${mode.color}-100 text-${mode.color}-800`}>
                  {systemMessages.filter(msg => msg.mode === mode.id && msg.is_active).length > 0 ? 'Active' : 'No active message'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* System Messages Table */}
      <div className="bg-white rounded-lg shadow-sm border flex-1 min-h-0 flex flex-col">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">System Messages</h3>
          <p className="text-sm text-gray-600">Manage AI behavior and response patterns</p>
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
              <Button
                variant="primary"
                onClick={createDefaultMessage}
                leftIcon={<Plus size={16} />}
                isLoading={saving}
              >
                Create Default Message
              </Button>
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
                          <MessageSquare size={20} className="text-gray-400 mr-3 flex-shrink-0" />
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
                          {modeInfo.name}
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
                      Chat Mode
                    </label>
                    <select
                      value={editorForm.mode}
                      onChange={(e) => setEditorForm(prev => ({ ...prev, mode: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {DEFAULT_CHAT_MODES.map(mode => (
                        <option key={mode.id} value={mode.id}>{mode.name}</option>
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
                      placeholder="e.g., Veteran-to-veteran communication"
                    />
                  </div>
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
                    This is the core prompt that defines how the AI will behave and respond to users.
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
                  {getModeInfo(selectedMessage.mode).name} • {selectedMessage.is_active ? 'Active' : 'Inactive'}
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
                  <h4 className="font-medium text-gray-900 mb-2">Disclaimers & Instructions</h4>
                  <div className="space-y-3">
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