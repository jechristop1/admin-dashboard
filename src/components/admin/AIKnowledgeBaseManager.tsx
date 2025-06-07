import React, { useState, useEffect } from 'react';
import { 
  Upload, 
  FileText, 
  Tag, 
  Calendar, 
  Search, 
  Filter,
  Eye,
  Trash2,
  Edit3,
  Plus,
  X,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Download,
  BookOpen,
  Database
} from 'lucide-react';
import Button from '../ui/Button';
import { supabase } from '../../lib/supabase';

interface KnowledgeDocument {
  id: string;
  title: string;
  content: string;
  metadata: {
    tags?: string[];
    source?: string;
    category?: string;
    type?: string;
    file_size?: number;
    word_count?: number;
    [key: string]: any;
  };
  created_at: string;
  user_id: string | null;
}

interface UploadProgress {
  isUploading: boolean;
  progress: number;
  status: string;
}

const AIKnowledgeBaseManager: React.FC = () => {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<KnowledgeDocument | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    isUploading: false,
    progress: 0,
    status: ''
  });

  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    file: null as File | null,
    title: '',
    tags: [] as string[],
    category: '',
    source: '',
    newTag: ''
  });

  // Available tags and categories
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [availableCategories] = useState([
    'PACT Act',
    'Mental Health',
    'CFR',
    'Disability Benefits',
    'Claims Process',
    'Medical Evidence',
    'Appeals',
    'Compensation',
    'Education Benefits',
    'Healthcare',
    'Housing',
    'Employment',
    'Other'
  ]);

  useEffect(() => {
    loadDocuments();
  }, []);

  useEffect(() => {
    // Extract unique tags from all documents
    const allTags = new Set<string>();
    documents.forEach(doc => {
      doc.metadata.tags?.forEach(tag => allTags.add(tag));
    });
    setAvailableTags(Array.from(allTags).sort());
  }, [documents]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('documents')
        .select('*')
        .is('user_id', null) // Only global knowledge base documents
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setDocuments(data || []);
    } catch (error: any) {
      console.error('Error loading knowledge base documents:', error);
      setError(`Failed to load documents: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'text/plain', 'application/json'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please upload PDF, TXT, or JSON files only.');
      return;
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('File size must be less than 10MB.');
      return;
    }

    setUploadForm(prev => ({
      ...prev,
      file,
      title: prev.title || file.name.replace(/\.[^/.]+$/, '')
    }));
    setError(null);
  };

  const addTag = () => {
    const newTag = uploadForm.newTag.trim();
    if (newTag && !uploadForm.tags.includes(newTag)) {
      setUploadForm(prev => ({
        ...prev,
        tags: [...prev.tags, newTag],
        newTag: ''
      }));
    }
  };

  const removeTag = (tagToRemove: string) => {
    setUploadForm(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleUpload = async () => {
    if (!uploadForm.file || !uploadForm.title.trim()) {
      setError('Please provide a file and title.');
      return;
    }

    setUploadProgress({
      isUploading: true,
      progress: 0,
      status: 'Reading file...'
    });

    try {
      // Read file content
      setUploadProgress(prev => ({ ...prev, progress: 25, status: 'Processing content...' }));
      
      let content: string;
      if (uploadForm.file.type === 'application/pdf') {
        // For PDF files, we'll need to extract text
        const arrayBuffer = await uploadForm.file.arrayBuffer();
        // Note: In a real implementation, you'd use PDF.js here
        content = `[PDF Content from ${uploadForm.file.name}]\n\nThis PDF has been uploaded to the knowledge base.`;
      } else {
        content = await uploadForm.file.text();
      }

      if (!content.trim()) {
        throw new Error('File appears to be empty or unreadable.');
      }

      // Prepare document metadata
      const metadata = {
        tags: uploadForm.tags,
        category: uploadForm.category,
        source: uploadForm.source,
        file_size: uploadForm.file.size,
        word_count: content.split(/\s+/).length,
        mime_type: uploadForm.file.type,
        uploaded_at: new Date().toISOString()
      };

      setUploadProgress(prev => ({ ...prev, progress: 50, status: 'Uploading to knowledge base...' }));

      // Upload to knowledge base using the train function
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/train`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documents: [{
            title: uploadForm.title,
            content,
            metadata,
            user_id: null // Global knowledge base
          }]
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Upload failed: ${response.statusText}`);
      }

      setUploadProgress(prev => ({ ...prev, progress: 100, status: 'Upload complete!' }));

      // Reset form and close modal
      setUploadForm({
        file: null,
        title: '',
        tags: [],
        category: '',
        source: '',
        newTag: ''
      });
      setShowUploadModal(false);
      
      // Reload documents
      await loadDocuments();

    } catch (error: any) {
      console.error('Upload error:', error);
      setError(`Upload failed: ${error.message}`);
    } finally {
      setUploadProgress({
        isUploading: false,
        progress: 0,
        status: ''
      });
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId);

      if (error) throw error;

      await loadDocuments();
    } catch (error: any) {
      console.error('Delete error:', error);
      setError(`Failed to delete document: ${error.message}`);
    }
  };

  const handleReplace = async (documentId: string) => {
    // Set up the upload form with the existing document's data
    const doc = documents.find(d => d.id === documentId);
    if (doc) {
      setUploadForm(prev => ({
        ...prev,
        title: doc.title,
        tags: doc.metadata.tags || [],
        category: doc.metadata.category || '',
        source: doc.metadata.source || ''
      }));
      
      // Delete the old document first
      await handleDelete(documentId);
      
      // Open upload modal for replacement
      setShowUploadModal(true);
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

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getContentPreview = (content: string, maxLength: number = 150): string => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  // Filter documents based on search and tags
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.metadata.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesTags = selectedTags.length === 0 || 
                       selectedTags.every(tag => doc.metadata.tags?.includes(tag));
    
    return matchesSearch && matchesTags;
  });

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="mb-8 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Database size={28} className="text-blue-600" />
              AI Knowledge Base Manager
            </h2>
            <p className="text-gray-600 mt-1">
              Upload, tag, and manage AI training content used as reference by the assistant
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={loadDocuments}
              leftIcon={<RefreshCw size={16} />}
              disabled={loading}
            >
              Refresh
            </Button>
            
            <Button
              variant="primary"
              onClick={() => setShowUploadModal(true)}
              leftIcon={<Plus size={16} />}
            >
              Upload Document
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 flex-shrink-0">
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Documents</p>
              <p className="text-2xl font-bold text-gray-900">{documents.length}</p>
            </div>
            <BookOpen size={24} className="text-blue-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Unique Tags</p>
              <p className="text-2xl font-bold text-green-600">{availableTags.length}</p>
            </div>
            <Tag size={24} className="text-green-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Words</p>
              <p className="text-2xl font-bold text-purple-600">
                {documents.reduce((sum, doc) => sum + (doc.metadata.word_count || 0), 0).toLocaleString()}
              </p>
            </div>
            <FileText size={24} className="text-purple-600" />
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6 flex-shrink-0">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search documents, content, or tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {availableTags.slice(0, 8).map(tag => (
              <button
                key={tag}
                onClick={() => {
                  setSelectedTags(prev => 
                    prev.includes(tag) 
                      ? prev.filter(t => t !== tag)
                      : [...prev, tag]
                  );
                }}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  selectedTags.includes(tag)
                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tag}
              </button>
            ))}
            
            {selectedTags.length > 0 && (
              <button
                onClick={() => setSelectedTags([])}
                className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 hover:bg-red-200"
              >
                Clear Filters
              </button>
            )}
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

      {/* Documents Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden flex-1">
        <div className="h-full overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Document
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tags
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Upload Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Content Preview
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw size={20} className="animate-spin" />
                      Loading knowledge base documents...
                    </div>
                  </td>
                </tr>
              ) : filteredDocuments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    <Database size={24} className="mx-auto mb-2 text-gray-400" />
                    <p>No documents found</p>
                    {(searchTerm || selectedTags.length > 0) ? (
                      <p className="text-sm mt-1">Try adjusting your search or filters</p>
                    ) : (
                      <p className="text-sm mt-1">Upload documents to get started</p>
                    )}
                  </td>
                </tr>
              ) : (
                filteredDocuments.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <FileText size={20} className="text-gray-400 mr-3 flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {doc.title}
                          </div>
                          <div className="text-sm text-gray-500">
                            {doc.metadata.word_count ? `${doc.metadata.word_count.toLocaleString()} words` : 'Unknown size'}
                            {doc.metadata.category && ` • ${doc.metadata.category}`}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {doc.metadata.tags?.slice(0, 3).map(tag => (
                          <span
                            key={tag}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            {tag}
                          </span>
                        ))}
                        {(doc.metadata.tags?.length || 0) > 3 && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            +{(doc.metadata.tags?.length || 0) - 3} more
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <Calendar size={16} className="text-gray-400 mr-2" />
                        {formatDate(doc.created_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600 max-w-xs">
                        {getContentPreview(doc.content)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedDocument(doc);
                            setShowViewModal(true);
                          }}
                          leftIcon={<Eye size={16} />}
                        >
                          View
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReplace(doc.id)}
                          leftIcon={<Edit3 size={16} />}
                        >
                          Replace
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(doc.id)}
                          leftIcon={<Trash2 size={16} />}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50"
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
              <h3 className="text-lg font-semibold text-gray-900">
                Upload Knowledge Base Document
              </h3>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadForm({
                    file: null,
                    title: '',
                    tags: [],
                    category: '',
                    source: '',
                    newTag: ''
                  });
                  setError(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* File Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Document File *
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                    <input
                      type="file"
                      accept=".pdf,.txt,.json"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="file-upload"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <Upload size={24} className="mx-auto mb-2 text-gray-400" />
                      <p className="text-sm text-gray-600">
                        {uploadForm.file ? uploadForm.file.name : 'Click to upload PDF, TXT, or JSON file'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Maximum file size: 10MB</p>
                    </label>
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Document Title *
                  </label>
                  <input
                    type="text"
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter a descriptive title for this document"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={uploadForm.category}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a category</option>
                    {availableCategories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                {/* Source */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Source
                  </label>
                  <input
                    type="text"
                    value={uploadForm.source}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, source: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., VA.gov, CFR Title 38, Internal Policy"
                  />
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tags
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={uploadForm.newTag}
                      onChange={(e) => setUploadForm(prev => ({ ...prev, newTag: e.target.value }))}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Add a tag and press Enter"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addTag}
                      leftIcon={<Plus size={16} />}
                    >
                      Add
                    </Button>
                  </div>
                  
                  {uploadForm.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {uploadForm.tags.map(tag => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                        >
                          {tag}
                          <button
                            onClick={() => removeTag(tag)}
                            className="ml-2 text-blue-600 hover:text-blue-800"
                          >
                            <X size={14} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Upload Progress */}
                {uploadProgress.isUploading && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <RefreshCw size={16} className="animate-spin text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">{uploadProgress.status}</span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress.progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50 flex-shrink-0">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadForm({
                    file: null,
                    title: '',
                    tags: [],
                    category: '',
                    source: '',
                    newTag: ''
                  });
                  setError(null);
                }}
                disabled={uploadProgress.isUploading}
              >
                Cancel
              </Button>
              
              <Button
                variant="primary"
                onClick={handleUpload}
                disabled={!uploadForm.file || !uploadForm.title.trim() || uploadProgress.isUploading}
                leftIcon={uploadProgress.isUploading ? <RefreshCw size={16} className="animate-spin" /> : <Upload size={16} />}
              >
                {uploadProgress.isUploading ? 'Uploading...' : 'Upload Document'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* View Document Modal */}
      {showViewModal && selectedDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedDocument.title}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {formatDate(selectedDocument.created_at)} • {selectedDocument.metadata.word_count?.toLocaleString() || 'Unknown'} words
                </p>
              </div>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedDocument(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {/* Metadata */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Document Information</h4>
                  <dl className="space-y-2 text-sm">
                    <div>
                      <dt className="text-gray-500">Category:</dt>
                      <dd className="text-gray-900">{selectedDocument.metadata.category || 'Not specified'}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Source:</dt>
                      <dd className="text-gray-900">{selectedDocument.metadata.source || 'Not specified'}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">File Size:</dt>
                      <dd className="text-gray-900">
                        {selectedDocument.metadata.file_size ? formatFileSize(selectedDocument.metadata.file_size) : 'Unknown'}
                      </dd>
                    </div>
                  </dl>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedDocument.metadata.tags?.map(tag => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {tag}
                      </span>
                    )) || <span className="text-sm text-gray-500">No tags assigned</span>}
                  </div>
                </div>
              </div>
              
              {/* Content */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Document Content</h4>
                <div className="bg-gray-50 rounded-lg p-4 prose prose-sm max-w-none">
                  <div className="whitespace-pre-wrap text-gray-800">
                    {selectedDocument.content}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50 flex-shrink-0">
              <Button
                variant="outline"
                onClick={() => handleReplace(selectedDocument.id)}
                leftIcon={<Edit3 size={16} />}
              >
                Replace Document
              </Button>
              
              <Button
                variant="outline"
                onClick={() => handleDelete(selectedDocument.id)}
                leftIcon={<Trash2 size={16} />}
                className="text-red-600 hover:text-red-800 border-red-200 hover:border-red-300 hover:bg-red-50"
              >
                Delete Document
              </Button>
              
              <Button
                variant="ghost"
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedDocument(null);
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

export default AIKnowledgeBaseManager;