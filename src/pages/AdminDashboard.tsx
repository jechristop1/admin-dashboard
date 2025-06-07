import React, { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import Button from '../components/ui/Button';
import ChatLogViewer from '../components/admin/ChatLogViewer';
import { 
  FileText, 
  User, 
  Calendar, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  RefreshCw,
  Eye,
  Download,
  Search,
  Filter,
  MessageSquare,
  BarChart3
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

interface AdminDocument {
  id: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  document_type: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  analysis: string | null;
  error_message: string | null;
  upload_date: string;
  url: string;
  user_id: string;
  user_email: string;
}

const AdminDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'documents' | 'chats'>('documents');
  const [documents, setDocuments] = useState<AdminDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<AdminDocument | null>(null);
  const [processingDocs, setProcessingDocs] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Check if user is admin
  const isAdmin = user?.email?.endsWith('@forwardassisthq.com');

  useEffect(() => {
    if (isAdmin && activeTab === 'documents') {
      loadDocuments();
    }
  }, [isAdmin, activeTab]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Loading documents for admin dashboard...');

      // Use the admin function to get all user documents
      const { data: docsData, error: docsError } = await supabase
        .rpc('get_all_user_documents');

      if (docsError) {
        console.error('Error from get_all_user_documents:', docsError);
        throw docsError;
      }

      console.log('Documents loaded:', docsData?.length || 0);
      setDocuments(docsData || []);
    } catch (error: any) {
      console.error('Error loading documents:', error);
      setError(`Failed to load documents: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const triggerAnalysis = async (documentId: string) => {
    try {
      setProcessingDocs(prev => new Set(prev).add(documentId));
      setError(null);

      const document = documents.find(doc => doc.id === documentId);
      if (!document) {
        throw new Error('Document not found');
      }

      // Update document status to processing
      await supabase
        .from('user_documents')
        .update({ status: 'processing', error_message: null })
        .eq('id', documentId);

      // Get document content from URL
      const response = await fetch(document.url);
      if (!response.ok) {
        throw new Error(`Failed to fetch document: ${response.statusText}`);
      }

      let content: string;
      if (document.mime_type === 'application/pdf') {
        // For PDF files, we'll need to extract text
        const arrayBuffer = await response.arrayBuffer();
        // Note: In a real implementation, you'd use PDF.js here
        // For now, we'll simulate text extraction
        content = `[PDF Content from ${document.file_name}]\n\nThis is simulated PDF text content for analysis purposes.`;
      } else {
        content = await response.text();
      }

      // Call the analyze-document function
      const analysisResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-document`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          documentType: document.document_type || 'other',
          userId: document.user_id,
          documentId: document.id
        }),
      });

      if (!analysisResponse.ok) {
        const errorData = await analysisResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `Analysis failed: ${analysisResponse.statusText}`);
      }

      const analysisData = await analysisResponse.json();

      // Update document with analysis results
      await supabase
        .from('user_documents')
        .update({ 
          status: 'completed',
          analysis: analysisData.summary 
        })
        .eq('id', documentId);

      // Reload documents to show updated status
      await loadDocuments();

    } catch (error: any) {
      console.error('Error triggering analysis:', error);
      setError(`Analysis failed: ${error.message}`);

      // Update document status to error
      await supabase
        .from('user_documents')
        .update({ 
          status: 'error',
          error_message: error.message
        })
        .eq('id', documentId);

      await loadDocuments();
    } finally {
      setProcessingDocs(prev => {
        const newSet = new Set(prev);
        newSet.delete(documentId);
        return newSet;
      });
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={16} className="text-green-600" />;
      case 'processing':
        return <Clock size={16} className="text-blue-600 animate-pulse" />;
      case 'error':
        return <AlertCircle size={16} className="text-red-600" />;
      default:
        return <Clock size={16} className="text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    switch (type) {
      case 'c&p_exam':
        return 'C&P Exam';
      case 'rating_decision':
        return 'Rating Decision';
      case 'dbq':
        return 'DBQ';
      default:
        return 'Other';
    }
  };

  // Filter documents based on search and filters
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.user_email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    const matchesType = typeFilter === 'all' || doc.document_type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  if (!isAdmin) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <AlertCircle size={48} className="text-red-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-red-800 mb-2">Access Denied</h2>
            <p className="text-red-700">
              You don't have permission to access the admin dashboard. 
              Admin access is restricted to @forwardassisthq.com email addresses.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">
            Manage and monitor system activity across all users
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('documents')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'documents'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText size={16} />
                  Document Management
                </div>
              </button>
              
              <button
                onClick={() => setActiveTab('chats')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'chats'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <MessageSquare size={16} />
                  Chat Log Viewer
                </div>
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'documents' ? (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Documents</p>
                    <p className="text-2xl font-bold text-gray-900">{documents.length}</p>
                  </div>
                  <FileText size={24} className="text-blue-600" />
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Analyzed</p>
                    <p className="text-2xl font-bold text-green-600">
                      {documents.filter(doc => doc.status === 'completed').length}
                    </p>
                  </div>
                  <CheckCircle size={24} className="text-green-600" />
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pending</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {documents.filter(doc => doc.status === 'pending').length}
                    </p>
                  </div>
                  <Clock size={24} className="text-yellow-600" />
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Errors</p>
                    <p className="text-2xl font-bold text-red-600">
                      {documents.filter(doc => doc.status === 'error').length}
                    </p>
                  </div>
                  <AlertCircle size={24} className="text-red-600" />
                </div>
              </div>
            </div>

            {/* Filters and Search */}
            <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by filename or user email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="completed">Completed</option>
                    <option value="error">Error</option>
                  </select>
                  
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Types</option>
                    <option value="c&p_exam">C&P Exam</option>
                    <option value="rating_decision">Rating Decision</option>
                    <option value="dbq">DBQ</option>
                    <option value="other">Other</option>
                  </select>
                  
                  <Button
                    variant="outline"
                    onClick={loadDocuments}
                    leftIcon={<RefreshCw size={16} />}
                    disabled={loading}
                  >
                    Refresh
                  </Button>
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
                <AlertCircle size={20} />
                <span>{error}</span>
              </div>
            )}

            {/* Documents Table */}
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Document
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Upload Date
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                          <div className="flex items-center justify-center gap-2">
                            <RefreshCw size={20} className="animate-spin" />
                            Loading documents...
                          </div>
                        </td>
                      </tr>
                    ) : filteredDocuments.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                          <FileText size={24} className="mx-auto mb-2 text-gray-400" />
                          <p>No documents found</p>
                          {(searchTerm || statusFilter !== 'all' || typeFilter !== 'all') && (
                            <p className="text-sm mt-1">Try adjusting your search or filters</p>
                          )}
                        </td>
                      </tr>
                    ) : (
                      filteredDocuments.map((doc) => (
                        <tr key={doc.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <FileText size={20} className="text-gray-400 mr-3" />
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {doc.file_name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {formatFileSize(doc.file_size)}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <User size={16} className="text-gray-400 mr-2" />
                              <div className="text-sm text-gray-900">
                                {doc.user_email}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {getDocumentTypeLabel(doc.document_type)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(doc.status)}
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(doc.status)}`}>
                                {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center text-sm text-gray-900">
                              <Calendar size={16} className="text-gray-400 mr-2" />
                              {formatDate(doc.upload_date)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedDocument(doc)}
                                leftIcon={<Eye size={16} />}
                              >
                                View
                              </Button>
                              
                              {doc.status !== 'processing' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => triggerAnalysis(doc.id)}
                                  disabled={processingDocs.has(doc.id)}
                                  leftIcon={
                                    processingDocs.has(doc.id) ? 
                                    <RefreshCw size={16} className="animate-spin" /> : 
                                    <RefreshCw size={16} />
                                  }
                                >
                                  {doc.status === 'completed' ? 'Re-analyze' : 'Analyze'}
                                </Button>
                              )}
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(doc.url, '_blank')}
                                leftIcon={<Download size={16} />}
                              >
                                Download
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

            {/* Document Detail Modal */}
            {selectedDocument && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                  <div className="flex items-center justify-between p-6 border-b">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Document Details: {selectedDocument.file_name}
                    </h3>
                    <button
                      onClick={() => setSelectedDocument(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                    <div className="grid grid-cols-2 gap-6 mb-6">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Document Information</h4>
                        <dl className="space-y-2 text-sm">
                          <div>
                            <dt className="text-gray-500">User:</dt>
                            <dd className="text-gray-900">{selectedDocument.user_email}</dd>
                          </div>
                          <div>
                            <dt className="text-gray-500">Type:</dt>
                            <dd className="text-gray-900">{getDocumentTypeLabel(selectedDocument.document_type)}</dd>
                          </div>
                          <div>
                            <dt className="text-gray-500">Size:</dt>
                            <dd className="text-gray-900">{formatFileSize(selectedDocument.file_size)}</dd>
                          </div>
                          <div>
                            <dt className="text-gray-500">Upload Date:</dt>
                            <dd className="text-gray-900">{formatDate(selectedDocument.upload_date)}</dd>
                          </div>
                        </dl>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Analysis Status</h4>
                        <div className="flex items-center gap-2 mb-4">
                          {getStatusIcon(selectedDocument.status)}
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedDocument.status)}`}>
                            {selectedDocument.status.charAt(0).toUpperCase() + selectedDocument.status.slice(1)}
                          </span>
                        </div>
                        
                        {selectedDocument.error_message && (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <p className="text-sm text-red-700">
                              <strong>Error:</strong> {selectedDocument.error_message}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {selectedDocument.analysis && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3">Analysis Results</h4>
                        <div className="bg-gray-50 rounded-lg p-4 prose prose-sm max-w-none">
                          <div className="whitespace-pre-wrap text-gray-800">
                            {selectedDocument.analysis}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {!selectedDocument.analysis && selectedDocument.status === 'completed' && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <p className="text-sm text-yellow-700">
                          Document is marked as completed but no analysis is available.
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
                    <Button
                      variant="outline"
                      onClick={() => window.open(selectedDocument.url, '_blank')}
                      leftIcon={<Download size={16} />}
                    >
                      Download Original
                    </Button>
                    
                    {selectedDocument.status !== 'processing' && (
                      <Button
                        variant="primary"
                        onClick={() => {
                          triggerAnalysis(selectedDocument.id);
                          setSelectedDocument(null);
                        }}
                        disabled={processingDocs.has(selectedDocument.id)}
                        leftIcon={
                          processingDocs.has(selectedDocument.id) ? 
                          <RefreshCw size={16} className="animate-spin" /> : 
                          <RefreshCw size={16} />
                        }
                      >
                        {selectedDocument.status === 'completed' ? 'Re-analyze Document' : 'Analyze Document'}
                      </Button>
                    )}
                    
                    <Button
                      variant="ghost"
                      onClick={() => setSelectedDocument(null)}
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <ChatLogViewer />
        )}
      </div>
    </Layout>
  );
};

export default AdminDashboard;