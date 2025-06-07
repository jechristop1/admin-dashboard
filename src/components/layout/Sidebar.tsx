import React from 'react';
import { 
  FileText, 
  MessageSquare,
  Download,
  X,
  Menu,
  Trash2,
  Settings,
  BookOpen,
  Tag,
  Database,
  CheckCircle,
  Clock,
  AlertCircle,
  User
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Button from '../ui/Button';
import { useAuthStore } from '../../store/authStore';
import ChatHistory from '../chat/ChatHistory';
import { supabase } from '../../lib/supabase';
import { useState, useEffect } from 'react';

interface UserDocument {
  id: string;
  file_name: string;
  file_path: string;
  url: string;
}

interface KnowledgeBaseStats {
  totalDocuments: number;
  uniqueTags: number;
  totalWords: number;
}

interface DocumentStats {
  totalDocuments: number;
  analyzed: number;
  pending: number;
  errors: number;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, onToggle }) => {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = user?.email?.endsWith('@forwardassisthq.com');
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [knowledgeBaseStats, setKnowledgeBaseStats] = useState<KnowledgeBaseStats>({
    totalDocuments: 0,
    uniqueTags: 0,
    totalWords: 0
  });
  const [documentStats, setDocumentStats] = useState<DocumentStats>({
    totalDocuments: 0,
    analyzed: 0,
    pending: 0,
    errors: 0
  });
  
  useEffect(() => {
    if (user?.id && location.pathname === '/documents') {
      loadDocuments();
    }
  }, [user?.id, location.pathname]);

  useEffect(() => {
    if (isAdmin && location.pathname === '/admin') {
      loadKnowledgeBaseStats();
      loadDocumentStats();
    }
  }, [isAdmin, location.pathname]);

  // Listen for document upload events
  useEffect(() => {
    const handleDocumentUploaded = () => {
      if (location.pathname === '/documents') {
        loadDocuments();
      }
      if (isAdmin && location.pathname === '/admin') {
        loadKnowledgeBaseStats();
        loadDocumentStats();
      }
    };

    window.addEventListener('documentUploaded', handleDocumentUploaded);
    return () => {
      window.removeEventListener('documentUploaded', handleDocumentUploaded);
    };
  }, [location.pathname, isAdmin]);

  const loadDocuments = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('user_documents')
        .select('*')
        .eq('user_id', user.id)
        .order('upload_date', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const loadKnowledgeBaseStats = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('metadata')
        .is('user_id', null); // Only global knowledge base documents

      if (error) throw error;

      const docs = data || [];
      const allTags = new Set<string>();
      let totalWords = 0;

      docs.forEach(doc => {
        doc.metadata?.tags?.forEach((tag: string) => allTags.add(tag));
        totalWords += doc.metadata?.word_count || 0;
      });

      setKnowledgeBaseStats({
        totalDocuments: docs.length,
        uniqueTags: allTags.size,
        totalWords
      });
    } catch (error) {
      console.error('Error loading knowledge base stats:', error);
    }
  };

  const loadDocumentStats = async () => {
    try {
      const { data: docsData, error: docsError } = await supabase
        .rpc('get_all_user_documents');

      if (docsError) throw docsError;

      const docs = docsData || [];
      const stats = {
        totalDocuments: docs.length,
        analyzed: docs.filter((doc: any) => doc.status === 'completed').length,
        pending: docs.filter((doc: any) => doc.status === 'pending').length,
        errors: docs.filter((doc: any) => doc.status === 'error').length
      };

      setDocumentStats(stats);
    } catch (error) {
      console.error('Error loading document stats:', error);
    }
  };

  const handleDownloadDocument = (doc: UserDocument, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Create a temporary link element and trigger download
    const link = document.createElement('a');
    link.href = doc.url;
    link.download = doc.file_name;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = async (id: string, filePath: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      return;
    }
    
    try {
      // Delete from storage
      await supabase.storage.from('uploads').remove([filePath]);
      
      // Delete from database (this will cascade to related tables)
      await supabase.from('user_documents').delete().eq('id', id);
      
      // Reload documents list
      loadDocuments();
      
      // If this document is currently selected, clear the selection
      window.dispatchEvent(new CustomEvent('documentDeleted', { detail: { id } }));
      
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Failed to delete document. Please try again.');
    }
  };

  const handleSelectDocument = (id: string) => {
    // Navigate to Documents page and trigger document selection
    navigate('/documents');
    
    // Dispatch event to select and display the document
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('selectDocumentForAnalysis', { 
        detail: { id } 
      }));
    }, 100);
  };

  const handleDocumentCentralClick = (e: React.MouseEvent) => {
    // If already on documents page, reload it
    if (location.pathname === '/documents') {
      e.preventDefault();
      window.location.reload();
    }
    // Otherwise, let the Link component handle navigation normally
  };
  
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden" 
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      
      {/* Sidebar */}
      <aside 
        className={`
          fixed top-0 left-0 z-50 h-full w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:z-auto
        `}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar header */}
          <div className="p-4 border-b flex items-center justify-between">
            <button
              onClick={onToggle}
              className="p-2 rounded-full hover:bg-gray-200 transition-colors"
              aria-label="Toggle sidebar"
            >
              <Menu size={20} className="text-[#0A2463]" />
            </button>
            
            <button 
              onClick={onClose}
              className="p-1 rounded-full hover:bg-gray-200 lg:hidden"
              aria-label="Close sidebar"
            >
              <X size={20} />
            </button>
          </div>
          
          {/* Main Navigation */}
          <nav className="p-4 border-b">
            <div className="space-y-1">
              <Link
                to="/"
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-md
                  ${location.pathname === '/' 
                    ? 'bg-[#0A2463] text-white' 
                    : 'text-gray-700 hover:bg-gray-100'}
                  transition-colors duration-200
                `}
              >
                <MessageSquare size={16} />
                <span>AI Assistant</span>
              </Link>
              
              <Link
                to="/documents"
                onClick={handleDocumentCentralClick}
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-md
                  ${location.pathname === '/documents' 
                    ? 'bg-[#0A2463] text-white' 
                    : 'text-gray-700 hover:bg-gray-100'}
                  transition-colors duration-200
                `}
              >
                <FileText size={16} />
                <span>Document Central</span>
              </Link>

              {location.pathname === '/documents' && documents.length > 0 && (
                <div className="space-y-1 ml-4">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100 group transition-colors"
                    >
                      <button
                        onClick={() => handleSelectDocument(doc.id)}
                        className="flex-1 min-w-0 text-left"
                      >
                        <div className="truncate text-sm">{doc.file_name}</div>
                      </button>
                      
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => handleDownloadDocument(doc, e)}
                          className="p-1 rounded-full hover:bg-gray-200 text-gray-600"
                          title="Download original document"
                          aria-label={`Download ${doc.file_name}`}
                        >
                          <Download size={14} />
                        </button>
                        
                        <button
                          onClick={(e) => handleDelete(doc.id, doc.file_path, e)}
                          className="p-1 rounded-full hover:bg-red-100 text-red-600"
                          title="Delete document"
                          aria-label={`Delete ${doc.file_name}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {isAdmin && (
                <Link
                  to="/admin"
                  className={`
                    flex items-center gap-2 px-3 py-2 rounded-md
                    ${location.pathname === '/admin' 
                      ? 'bg-[#0A2463] text-white' 
                      : 'text-gray-700 hover:bg-gray-100'}
                    transition-colors duration-200
                  `}
                >
                  <Settings size={16} />
                  <span>Admin Dashboard</span>
                </Link>
              )}
            </div>
          </nav>

          {/* Document Management Stats - Show only on admin page */}
          {isAdmin && location.pathname === '/admin' && (
            <div className="p-4 border-b">
              <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                <FileText size={16} />
                Document Management
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText size={14} className="text-blue-600" />
                    <span className="text-sm text-gray-600">Total Documents</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {documentStats.totalDocuments}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-green-600" />
                    <span className="text-sm text-gray-600">Analyzed</span>
                  </div>
                  <span className="text-sm font-medium text-green-600">
                    {documentStats.analyzed}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-yellow-600" />
                    <span className="text-sm text-gray-600">Pending</span>
                  </div>
                  <span className="text-sm font-medium text-yellow-600">
                    {documentStats.pending}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={14} className="text-red-600" />
                    <span className="text-sm text-gray-600">Errors</span>
                  </div>
                  <span className="text-sm font-medium text-red-600">
                    {documentStats.errors}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Knowledge Base Stats - Show only on admin page */}
          {isAdmin && location.pathname === '/admin' && (
            <div className="p-4 border-b">
              <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                <Database size={16} />
                Knowledge Base Stats
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen size={14} className="text-blue-600" />
                    <span className="text-sm text-gray-600">Documents</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {knowledgeBaseStats.totalDocuments}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tag size={14} className="text-green-600" />
                    <span className="text-sm text-gray-600">Tags</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {knowledgeBaseStats.uniqueTags}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText size={14} className="text-purple-600" />
                    <span className="text-sm text-gray-600">Words</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {knowledgeBaseStats.totalWords.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}
          
          {/* Chat History */}
          {location.pathname === '/' && (
            <div className="flex-1 overflow-hidden">
              <ChatHistory />
            </div>
          )}
          
          {/* Sidebar footer */}
          <div className="p-4 border-t">
            {!isAuthenticated ? (
              <Button 
                variant="primary" 
                fullWidth
                leftIcon={<FileText size={16} />}
              >
                Sign In
              </Button>
            ) : (
              <Button 
                variant="outline" 
                fullWidth
                leftIcon={<FileText size={16} />}
              >
                Start New Claim
              </Button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;