import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/layout/Layout';
import { FileText, AlertCircle, MessageSquare, Loader2, Send, ChevronDown, User, Bot, Download, Upload, Paperclip } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import * as pdfjsLib from 'pdfjs-dist';
import ReactMarkdown from 'react-markdown';
import Button from '../components/ui/Button';
import { cleanMarkdown, formatMessages, generateTranscriptTitle, generateFooter, formatForPDF } from '../utils/exportUtils';

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

interface UserDocument {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  upload_date: string;
  url: string;
  analysis: string | null;
  document_type: string | null;
  status: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const Documents: React.FC = () => {
  const { user } = useAuthStore();
  const [selectedDocument, setSelectedDocument] = useState<UserDocument | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [documentChatSessionId, setDocumentChatSessionId] = useState<string | null>(null);
  const [showChatExportMenu, setShowChatExportMenu] = useState(false);
  const [showAnalysisExportMenu, setShowAnalysisExportMenu] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const chatExportMenuRef = useRef<HTMLDivElement>(null);
  const analysisExportMenuRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (chatExportMenuRef.current && !chatExportMenuRef.current.contains(event.target as Node)) {
        setShowChatExportMenu(false);
      }
      if (analysisExportMenuRef.current && !analysisExportMenuRef.current.contains(event.target as Node)) {
        setShowAnalysisExportMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleSelectDocument = async (event: CustomEvent) => {
      if (!event.detail?.id) {
        console.error('❌ No document ID provided');
        return;
      }
      
      console.log('🔍 DOCUMENT SELECTION TRIGGERED - ID:', event.detail.id);
      
      try {
        // Reset all states first
        setError(null);
        setIsAnalyzing(false);
        setAnalysisProgress('');
        setShowChat(false);
        setChatMessages([]);
        setDocumentChatSessionId(null);

        console.log('🔄 Loading document from database...');
        
        // Load the document from database with FRESH query
        const { data: doc, error: loadError } = await supabase
          .from('user_documents')
          .select('*')
          .eq('id', event.detail.id)
          .single();

        if (loadError) {
          console.error('💥 Database error loading document:', loadError);
          setError('Failed to load document from database');
          return;
        }

        if (!doc) {
          console.error('❌ No document found with ID:', event.detail.id);
          setError('Document not found');
          return;
        }

        console.log('📄 FRESH DOCUMENT DATA LOADED:', {
          id: doc.id,
          name: doc.file_name,
          status: doc.status,
          hasAnalysis: !!doc.analysis,
          analysisLength: doc.analysis?.length || 0,
          analysisPreview: doc.analysis ? doc.analysis.substring(0, 150) + '...' : 'NULL/EMPTY'
        });

        // CRITICAL: Set the document state IMMEDIATELY
        setSelectedDocument(doc as UserDocument);

        // Log what should be displayed
        if (doc.analysis && doc.analysis.trim()) {
          console.log('✅ ANALYSIS EXISTS AND SHOULD DISPLAY IMMEDIATELY');
          console.log('📊 Analysis stats:', {
            length: doc.analysis.length,
            startsWithSummary: doc.analysis.startsWith('**Summary:**'),
            hasMarkdown: doc.analysis.includes('#'),
            firstLine: doc.analysis.split('\n')[0]
          });
        } else {
          console.log('❌ NO ANALYSIS FOUND - Will show placeholder');
          console.log('🔍 Analysis value details:', {
            value: doc.analysis,
            type: typeof doc.analysis,
            isNull: doc.analysis === null,
            isEmpty: doc.analysis === '',
            trimmed: doc.analysis?.trim()
          });
        }

      } catch (error) {
        console.error('💥 Error in handleSelectDocument:', error);
        setError('Failed to load document');
      }
    };

    const handleDocumentDeleted = (event: CustomEvent) => {
      if (selectedDocument && selectedDocument.id === event.detail?.id) {
        // Clear the selected document if it was deleted
        setSelectedDocument(null);
        setShowChat(false);
        setChatMessages([]);
        setDocumentChatSessionId(null);
        setError(null);
      }
    };

    window.addEventListener('selectDocumentForAnalysis', handleSelectDocument as EventListener);
    window.addEventListener('documentDeleted', handleDocumentDeleted as EventListener);

    return () => {
      window.removeEventListener('selectDocumentForAnalysis', handleSelectDocument as EventListener);
      window.removeEventListener('documentDeleted', handleDocumentDeleted as EventListener);
    };
  }, [user?.id, selectedDocument]);

  const validateFile = async (file: File): Promise<void> => {
    try {
      // Check file size (10MB limit)
      const MAX_SIZE = 10 * 1024 * 1024; // 10MB in bytes
      if (file.size > MAX_SIZE) {
        throw new Error('File size exceeds 10MB limit');
      }

      // Check MIME type
      const allowedTypes = ['application/pdf', 'text/plain', 'application/json'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Unsupported file type. Please upload PDF, TXT, or JSON files only.');
      }

      // Additional PDF validation
      if (file.type === 'application/pdf') {
        const arrayBuffer = await file.arrayBuffer();
        
        // Check PDF magic number
        const header = new Uint8Array(arrayBuffer.slice(0, 4));
        const pdfHeader = String.fromCharCode(...header);
        if (!pdfHeader.startsWith('%PDF')) {
          throw new Error('Invalid PDF file format');
        }

        // Validate PDF structure
        try {
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          const numPages = pdf.numPages;
          
          if (numPages < 1) {
            throw new Error('Invalid PDF: No pages found');
          }

          // Try to access first page to verify readability
          await pdf.getPage(1);
        } catch (error: any) {
          if (error.message.includes('encrypted')) {
            throw new Error('Cannot process encrypted or password-protected PDF files');
          }
          throw new Error('Invalid or corrupted PDF file');
        }
      }
    } catch (error: any) {
      console.error('File validation error:', error);
      throw new Error(`File validation failed: ${error.message}`);
    }
  };

  const sanitizeFileName = (fileName: string): string => {
    return fileName
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_')
      .toLowerCase();
  };

  const extractTextContent = async (file: File, url: string): Promise<string> => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.statusText}`);
      }

      if (file.type === 'application/pdf') {
        const arrayBuffer = await response.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let textContent = '';

        for (let i = 1; i <= pdf.numPages; i++) {
          try {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const pageText = content.items
              .map((item: any) => item.str)
              .join(' ')
              .trim();
            
            if (pageText) {
              textContent += pageText + '\n\n';
            }
          } catch (error) {
            console.error(`Error extracting text from page ${i}:`, error);
            throw new Error(`Failed to extract text from page ${i}`);
          }
        }

        if (!textContent.trim()) {
          throw new Error('No readable text found in PDF. The file might be scanned or protected.');
        }

        return textContent;
      } else {
        const text = await response.text();
        if (!text.trim()) {
          throw new Error('File appears to be empty');
        }
        return text;
      }
    } catch (error: any) {
      console.error('Text extraction error:', error);
      throw new Error(`Failed to extract text: ${error.message}`);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!user?.id) {
      setError('User not authenticated');
      return;
    }

    let docData = null;
    let uploadedFilePath = null;
    setIsUploading(true);
    setUploadProgress('Validating file...');
    setError(null);

    try {
      // Validate file
      await validateFile(file);

      // Prepare file path with user ID as first segment
      setUploadProgress('Uploading to secure storage...');
      const timestamp = Date.now();
      const sanitizedName = sanitizeFileName(file.name);
      const filePath = `${user.id}/${timestamp}-${sanitizedName}`;
      uploadedFilePath = filePath;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(filePath, file, {
          contentType: file.type,
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get file URL
      const { data: { publicUrl } } = supabase.storage
        .from('uploads')
        .getPublicUrl(filePath);

      // Determine document type based on filename
      let documentType = 'other';
      const lowerFileName = file.name.toLowerCase();
      if (lowerFileName.includes('c&p') || lowerFileName.includes('cp exam')) {
        documentType = 'c&p_exam';
      } else if (lowerFileName.includes('rating') || lowerFileName.includes('decision')) {
        documentType = 'rating_decision';
      } else if (lowerFileName.includes('dbq')) {
        documentType = 'dbq';
      }

      setUploadProgress('Creating document record...');

      // Create document record
      const { data: insertedDoc, error: docError } = await supabase
        .from('user_documents')
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type,
          url: publicUrl,
          document_type: documentType,
          status: 'processing'
        })
        .select()
        .single();

      if (docError) throw docError;
      docData = insertedDoc;

      setUploadProgress('Extracting document content...');

      // Extract text content
      const textContent = await extractTextContent(file, publicUrl);

      setUploadProgress('Analyzing document with ForwardOps AI...');

      // Send to analyze-document function
      const analysisResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-document`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: textContent,
          documentType,
          userId: user.id,
          documentId: docData.id
        }),
      });

      if (!analysisResponse.ok) {
        const errorData = await analysisResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `Analysis failed: ${analysisResponse.statusText}`);
      }

      const analysisData = await analysisResponse.json();

      setUploadProgress('Finalizing...');

      // Update document status
      await supabase
        .from('user_documents')
        .update({ 
          status: 'completed',
          analysis: analysisData.summary 
        })
        .eq('id', docData.id);

      // Automatically select the newly uploaded document
      setSelectedDocument({
        ...docData,
        status: 'completed',
        analysis: analysisData.summary
      } as UserDocument);

      // Trigger sidebar refresh
      window.dispatchEvent(new CustomEvent('documentUploaded', { 
        detail: { id: docData.id } 
      }));

      setUploadProgress('Upload complete!');
      
      // Clear progress after a short delay
      setTimeout(() => {
        setUploadProgress('');
        setIsUploading(false);
      }, 1000);

    } catch (error: any) {
      console.error('Error processing document:', error);
      const errorMessage = error.message || 'An error occurred while processing the document';
      setError(errorMessage);
      setUploadProgress('');
      setIsUploading(false);

      // Clean up uploaded file if document processing failed
      if (uploadedFilePath) {
        try {
          await supabase.storage
            .from('uploads')
            .remove([uploadedFilePath]);
        } catch (cleanupError) {
          console.error('Failed to clean up uploaded file:', cleanupError);
        }
      }

      if (docData?.id) {
        try {
          await supabase
            .from('user_documents')
            .update({ 
              status: 'error',
              error_message: errorMessage
            })
            .eq('id', docData.id);
        } catch (updateError) {
          console.error('Failed to update document status:', updateError);
        }
      }
    }
  };

  const createDocumentChatSession = async () => {
    if (!user?.id || !selectedDocument) return null;

    try {
      const { data: session, error } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: user.id,
          title: `Document Q&A: ${selectedDocument.file_name}`
        })
        .select()
        .single();

      if (error) throw error;
      return session.id;
    } catch (error) {
      console.error('Error creating document chat session:', error);
      return null;
    }
  };

  const handleChatWithDocument = async () => {
    if (!selectedDocument?.analysis) return;
    
    // Create a new chat session for this document
    const sessionId = await createDocumentChatSession();
    if (!sessionId) {
      setError('Failed to create chat session');
      return;
    }

    setDocumentChatSessionId(sessionId);
    setShowChat(true);
    setChatMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: `I've reviewed your ${selectedDocument.file_name} analysis. What questions do you have about this document? I can help explain any part of the analysis, clarify next steps, or discuss how this relates to your VA claim.`,
        timestamp: new Date()
      }
    ]);
  };

  const formatTimestamp = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    }).format(date);
  };

  const handleSendChatMessage = async () => {
    if (!chatInput.trim() || !selectedDocument?.analysis || isChatLoading || !documentChatSessionId) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: chatInput,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      // Create the assistant message immediately
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: '',
        timestamp: new Date()
      };

      // Add the assistant message to the chat
      setChatMessages(prev => [...prev, assistantMessage]);
      setStreamingMessageId(assistantMessage.id);

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: chatInput,
          sessionId: documentChatSessionId,
          messages: [
            {
              role: 'system',
              content: `You are ForwardOps AI helping a veteran understand their document analysis. Here is the analysis of their document "${selectedDocument.file_name}":\n\n${selectedDocument.analysis}\n\nAnswer questions about this analysis in a helpful, veteran-to-veteran manner. Reference specific parts of the analysis when relevant.`
            },
            ...chatMessages.map(msg => ({
              role: msg.role,
              content: msg.content
            }))
          ],
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let accumulatedContent = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        const chunk = decoder.decode(value);
        accumulatedContent += chunk;

        setChatMessages(prev => 
          prev.map(msg => 
            msg.id === assistantMessage.id 
              ? { ...msg, content: accumulatedContent }
              : msg
          )
        );
      }

      setStreamingMessageId(null);

    } catch (error) {
      console.error('Error in chat:', error);
      
      // Remove the empty assistant message and add error message
      setChatMessages(prev => {
        const filtered = prev.filter(msg => msg.id !== streamingMessageId);
        return [...filtered, {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date()
        }];
      });
      
      setStreamingMessageId(null);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendChatMessage();
    }
  };

  const handleExportChat = async (format: 'pdf' | 'txt') => {
    if (chatMessages.length === 0) return;
    setShowChatExportMenu(false);

    // Convert ChatMessage[] to Message[] format expected by export utils
    const messagesForExport = chatMessages.map(msg => ({
      id: msg.id,
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
      timestamp: msg.timestamp
    }));

    if (format === 'txt') {
      const title = `Document Q&A Session - ${selectedDocument?.file_name || 'Document'}\nGenerated on ${new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })}`;
      const content = formatMessages(messagesForExport);
      const footer = generateFooter();
      const fullContent = `${title}\n\n${content}\n\n${footer}`;
      
      const blob = new Blob([fullContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `document-qa-${selectedDocument?.file_name?.replace(/\.[^/.]+$/, '') || 'session'}-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      // Enhanced PDF generation
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF();
      
      // Page setup
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const maxWidth = pageWidth - (margin * 2);
      let yPosition = margin;
      
      // Helper function to add text with proper spacing
      const addTextWithSpacing = (text: string, fontSize: number, fontStyle: 'normal' | 'bold' | 'italic' = 'normal', extraSpacing: number = 0) => {
        pdf.setFontSize(fontSize);
        pdf.setFont('helvetica', fontStyle);
        
        const lines = pdf.splitTextToSize(text, maxWidth);
        const lineHeight = fontSize * 0.4;
        
        lines.forEach((line: string) => {
          if (yPosition + lineHeight > pageHeight - margin) {
            pdf.addPage();
            yPosition = margin;
          }
          
          pdf.text(line, margin, yPosition);
          yPosition += lineHeight;
        });
        
        yPosition += extraSpacing;
      };
      
      // Get formatted content
      const title = `Document Q&A Session - ${selectedDocument?.file_name || 'Document'}\nGenerated on ${new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })}`;
      const { content, footer } = formatForPDF(messagesForExport);
      
      // Add title
      addTextWithSpacing(title, 16, 'bold', 15);
      
      // Add separator line
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 10;
      
      // Process content
      const contentLines = content.split('\n');
      
      contentLines.forEach((line, index) => {
        const trimmedLine = line.trim();
        
        if (!trimmedLine) {
          yPosition += 4;
          return;
        }
        
        // Check if this is a message header
        if (trimmedLine.includes(' - ') && (trimmedLine.startsWith('User') || trimmedLine.startsWith('ForwardOps AI'))) {
          if (index > 0) {
            yPosition += 8;
          }
          addTextWithSpacing(trimmedLine, 12, 'bold', 6);
        } else {
          addTextWithSpacing(trimmedLine, 11, 'normal', 4);
        }
      });
      
      // Add footer
      yPosition += 15;
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 10;
      
      addTextWithSpacing(footer, 10, 'italic', 0);
      
      // Save the PDF
      pdf.save(`document-qa-${selectedDocument?.file_name?.replace(/\.[^/.]+$/, '') || 'session'}-${new Date().toISOString().split('T')[0]}.pdf`);
    }
  };

  const handleExportAnalysis = async (format: 'pdf' | 'txt') => {
    if (!selectedDocument?.analysis) return;
    setShowAnalysisExportMenu(false);

    const documentName = selectedDocument.file_name?.replace(/\.[^/.]+$/, '') || 'Document';
    const analysisContent = selectedDocument.analysis;

    if (format === 'txt') {
      const title = `Document Analysis - ${documentName}\nGenerated on ${new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })}`;
      
      const cleanContent = cleanMarkdown(analysisContent);
      const footer = generateFooter();
      const fullContent = `${title}\n\n${cleanContent}\n\n${footer}`;
      
      const blob = new Blob([fullContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analysis-${documentName}-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      // PDF generation for analysis
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF();
      
      // Page setup
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const maxWidth = pageWidth - (margin * 2);
      let yPosition = margin;
      
      // Helper function to add text with proper spacing
      const addTextWithSpacing = (text: string, fontSize: number, fontStyle: 'normal' | 'bold' | 'italic' = 'normal', extraSpacing: number = 0) => {
        pdf.setFontSize(fontSize);
        pdf.setFont('helvetica', fontStyle);
        
        const lines = pdf.splitTextToSize(text, maxWidth);
        const lineHeight = fontSize * 0.4;
        
        lines.forEach((line: string) => {
          if (yPosition + lineHeight > pageHeight - margin) {
            pdf.addPage();
            yPosition = margin;
          }
          
          pdf.text(line, margin, yPosition);
          yPosition += lineHeight;
        });
        
        yPosition += extraSpacing;
      };
      
      // Add title
      const title = `Document Analysis - ${documentName}\nGenerated on ${new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })}`;
      
      addTextWithSpacing(title, 16, 'bold', 15);
      
      // Add separator line
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 10;
      
      // Process analysis content
      const cleanContent = cleanMarkdown(analysisContent);
      const contentLines = cleanContent.split('\n');
      
      contentLines.forEach((line, index) => {
        const trimmedLine = line.trim();
        
        if (!trimmedLine) {
          yPosition += 4;
          return;
        }
        
        // Check for headers (lines that end with : or are all caps)
        if (trimmedLine.endsWith(':') || (trimmedLine === trimmedLine.toUpperCase() && trimmedLine.length > 3)) {
          if (index > 0) {
            yPosition += 8;
          }
          addTextWithSpacing(trimmedLine, 12, 'bold', 6);
        } else {
          addTextWithSpacing(trimmedLine, 11, 'normal', 4);
        }
      });
      
      // Add footer
      yPosition += 15;
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 10;
      
      const footer = generateFooter();
      addTextWithSpacing(footer, 10, 'italic', 0);
      
      // Save the PDF
      pdf.save(`analysis-${documentName}-${new Date().toISOString().split('T')[0]}.pdf`);
    }
  };

  if (!user?.id) {
    return (
      <Layout>
        <div className="max-w-6xl mx-auto p-6">
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <p className="text-gray-600">Please log in to access Document Central.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="h-[calc(100vh-8rem)]">
        {selectedDocument ? (
          <div className="h-full flex flex-col">
            {/* Document Header */}
            <div className="bg-white border-b px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {selectedDocument.file_name}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Uploaded on {new Date(selectedDocument.upload_date).toLocaleDateString()}
                    {selectedDocument.document_type && (
                      <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        {selectedDocument.document_type.replace('_', ' ').toUpperCase()}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {selectedDocument.analysis && selectedDocument.analysis.trim() && !showChat && (
                    <Button
                      onClick={handleChatWithDocument}
                      variant="secondary"
                      size="sm"
                      className="gap-2"
                    >
                      <MessageSquare size={16} />
                      Ask Questions
                    </Button>
                  )}
                  
                  {/* Export Analysis Button - only show when analysis exists and not in chat mode */}
                  {selectedDocument.analysis && selectedDocument.analysis.trim() && !showChat && (
                    <div className="relative" ref={analysisExportMenuRef}>
                      <Button
                        onClick={() => setShowAnalysisExportMenu(!showAnalysisExportMenu)}
                        variant="ghost"
                        size="sm"
                        className="text-gray-600 hover:bg-gray-100 gap-2"
                      >
                        <Download size={16} />
                        Export Analysis
                        <ChevronDown size={16} className={`transition-transform ${showAnalysisExportMenu ? 'rotate-180' : ''}`} />
                      </Button>
                      
                      {showAnalysisExportMenu && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                          <div className="py-1">
                            <button
                              onClick={() => handleExportAnalysis('txt')}
                              className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <Download size={16} />
                              Download as TXT
                            </button>
                            <button
                              onClick={() => handleExportAnalysis('pdf')}
                              className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <Download size={16} />
                              Download as PDF
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Export Chat Button - only show when in chat mode and there are messages */}
                  {showChat && chatMessages.length > 1 && (
                    <div className="relative" ref={chatExportMenuRef}>
                      <Button
                        onClick={() => setShowChatExportMenu(!showChatExportMenu)}
                        variant="ghost"
                        size="sm"
                        className="text-gray-600 hover:bg-gray-100 gap-2"
                      >
                        <Download size={16} />
                        Export Chat
                        <ChevronDown size={16} className={`transition-transform ${showChatExportMenu ? 'rotate-180' : ''}`} />
                      </Button>
                      
                      {showChatExportMenu && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                          <div className="py-1">
                            <button
                              onClick={() => handleExportChat('txt')}
                              className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <Download size={16} />
                              Download as TXT
                            </button>
                            <button
                              onClick={() => handleExportChat('pdf')}
                              className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <Download size={16} />
                              Download as PDF
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Document Content */}
            <div className="flex-1 overflow-hidden">
              {showChat ? (
                // Chat Interface - Updated to match main chat interface design
                <div className="h-full flex flex-col bg-white">
                  {/* Chat Messages */}
                  <div className="flex-1 overflow-y-auto">
                    {chatMessages.map((message: ChatMessage) => (
                      <div key={message.id} className={`w-full ${message.role === 'user' ? 'bg-transparent' : 'bg-gray-50'}`}>
                        <div className="max-w-4xl mx-auto px-4 py-6">
                          <div className="flex gap-4">
                            {/* Avatar */}
                            <div className="flex-shrink-0">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                message.role === 'user' 
                                  ? 'bg-[#0A2463] text-white' 
                                  : 'bg-gradient-to-br from-[#0A2463] to-[#061A47] text-[#FFBA08]'
                              }`}>
                                {message.role === 'user' ? (
                                  <User size={18} />
                                ) : (
                                  <Bot size={18} />
                                )}
                              </div>
                            </div>
                            
                            {/* Message Content */}
                            <div className="flex-1 min-w-0">
                              {/* Header with name and timestamp */}
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-semibold text-gray-900">
                                  {message.role === 'user' ? 'You' : 'ForwardOps AI'}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {formatTimestamp(message.timestamp)}
                                </span>
                              </div>
                              
                              {/* Message text */}
                              <div className="prose prose-gray max-w-none">
                                <div className="text-gray-800 leading-relaxed">
                                  <ReactMarkdown
                                    components={{
                                      p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                                      ul: ({ children }) => <ul className="mb-3 pl-6 space-y-1">{children}</ul>,
                                      ol: ({ children }) => <ol className="mb-3 pl-6 space-y-1">{children}</ol>,
                                      li: ({ children }) => <li className="text-gray-800">{children}</li>,
                                      h1: ({ children }) => <h1 className="text-xl font-semibold mb-3 text-gray-900">{children}</h1>,
                                      h2: ({ children }) => <h2 className="text-lg font-semibold mb-2 text-gray-900">{children}</h2>,
                                      h3: ({ children }) => <h3 className="text-base font-semibold mb-2 text-gray-900">{children}</h3>,
                                      code: ({ children, className }) => {
                                        const isInline = !className;
                                        if (isInline) {
                                          return (
                                            <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">
                                              {children}
                                            </code>
                                          );
                                        }
                                        return (
                                          <code className="block bg-gray-100 text-gray-800 p-3 rounded-lg text-sm font-mono overflow-x-auto">
                                            {children}
                                          </code>
                                        );
                                      },
                                      pre: ({ children }) => (
                                        <pre className="bg-gray-100 p-3 rounded-lg overflow-x-auto mb-3">
                                          {children}
                                        </pre>
                                      ),
                                      blockquote: ({ children }) => (
                                        <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-700 mb-3">
                                          {children}
                                        </blockquote>
                                      ),
                                      strong: ({ children }) => (
                                        <strong className="font-semibold text-gray-900">{children}</strong>
                                      ),
                                      em: ({ children }) => (
                                        <em className="italic text-gray-800">{children}</em>
                                      ),
                                    }}
                                  >
                                    {message.content}
                                  </ReactMarkdown>
                                  {message.id === streamingMessageId && (
                                    <span className="inline-block w-2 h-5 bg-gray-400 animate-pulse ml-1" />
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Chat Input */}
                  <div className="flex-none border-t border-gray-200 bg-white">
                    <div className="max-w-4xl mx-auto">
                      <div className="p-4">
                        <div className="relative flex items-end gap-2 rounded-2xl border border-gray-300 bg-white p-3 shadow-sm focus-within:border-[#0A2463] focus-within:ring-1 focus-within:ring-[#0A2463]">
                          <textarea
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={handleKeyPress}
                            placeholder="Ask a question about your document analysis..."
                            rows={1}
                            className="flex-1 resize-none border-0 bg-transparent p-1 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-0 max-h-[200px]"
                            disabled={isChatLoading}
                          />
                          
                          <Button
                            onClick={handleSendChatMessage}
                            disabled={!chatInput.trim() || isChatLoading}
                            variant="primary"
                            size="sm"
                            className="rounded-xl px-3 py-2 min-w-[44px] h-[44px] flex items-center justify-center"
                            aria-label="Send message"
                          >
                            <Send size={18} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // Analysis Display - CRITICAL: This is the main content area that should show analysis
                <div className="flex-1 overflow-y-auto p-6">
                  {error && (
                    <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-md flex items-center gap-2">
                      <AlertCircle size={20} />
                      <span>{error}</span>
                    </div>
                  )}

                  {isAnalyzing ? (
                    // Show analyzing state
                    <div className="bg-white rounded-lg shadow-sm p-6">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-[#0A2463] to-[#061A47] rounded-full flex items-center justify-center">
                          <span className="text-[#FFBA08] text-xs font-bold animate-pulse">AI</span>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">ForwardOps AI is analyzing...</h3>
                          <p className="text-sm text-gray-600">
                            {analysisProgress || 'Processing your document...'}
                          </p>
                        </div>
                      </div>
                      
                      {/* Animated thinking dots */}
                      <div className="flex items-center gap-2 ml-14">
                        <div className="w-2 h-2 bg-[#0A2463] rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 bg-[#0A2463] rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-2 h-2 bg-[#0A2463] rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                      </div>
                      
                      {/* Progress bar */}
                      <div className="mt-6 ml-14">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-gradient-to-r from-[#0A2463] to-[#FFBA08] h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                        </div>
                      </div>
                    </div>
                  ) : selectedDocument.analysis && selectedDocument.analysis.trim() ? (
                    // CRITICAL: IMMEDIATELY DISPLAY EXISTING ANALYSIS - This is the key fix
                    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                      <div className="flex items-center gap-3 p-6 border-b bg-gray-50">
                        <div className="w-10 h-10 bg-gradient-to-br from-[#0A2463] to-[#061A47] rounded-full flex items-center justify-center">
                          <MessageSquare size={20} className="text-[#FFBA08]" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">Document Analysis</h3>
                          <p className="text-sm text-gray-600">ForwardOps AI's comprehensive analysis of your document</p>
                        </div>
                      </div>
                      
                      {/* Scrollable content area with visual indicators */}
                      <div className="h-[calc(100vh-20rem)] overflow-y-auto p-6 relative">
                        {/* Scroll indicator gradient at top */}
                        <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-white to-transparent pointer-events-none z-10"></div>
                        
                        <div className="prose prose-sm max-w-none">
                          <ReactMarkdown
                            components={{
                              h1: ({ children }) => <h1 className="text-xl font-semibold mb-4 text-gray-900 border-b pb-2">{children}</h1>,
                              h2: ({ children }) => <h2 className="text-lg font-semibold mb-3 text-gray-900 mt-6">{children}</h2>,
                              h3: ({ children }) => <h3 className="text-base font-semibold mb-2 text-gray-900 mt-4">{children}</h3>,
                              p: ({ children }) => <p className="mb-4 text-gray-800 leading-relaxed">{children}</p>,
                              ul: ({ children }) => <ul className="mb-4 pl-6 space-y-2">{children}</ul>,
                              ol: ({ children }) => <ol className="mb-4 pl-6 space-y-2">{children}</ol>,
                              li: ({ children }) => <li className="text-gray-800">{children}</li>,
                              strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                              em: ({ children }) => <em className="italic text-gray-800">{children}</em>,
                              code: ({ children }) => (
                                <code className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm font-mono">
                                  {children}
                                </code>
                              ),
                              blockquote: ({ children }) => (
                                <blockquote className="border-l-4 border-[#0A2463] pl-4 italic text-gray-700 mb-4 bg-gray-50 py-3 rounded-r">
                                  {children}
                                </blockquote>
                              ),
                              hr: ({ children }) => (
                                <hr className="my-8 border-gray-300" />
                              ),
                            }}
                          >
                            {selectedDocument.analysis}
                          </ReactMarkdown>
                        </div>
                        
                        {/* Scroll indicator gradient at bottom */}
                        <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-white to-transparent pointer-events-none z-10"></div>
                      </div>
                    </div>
                  ) : selectedDocument.status === 'error' ? (
                    // Show error state
                    <div className="bg-white rounded-lg shadow-sm p-6 text-center">
                      <AlertCircle size={32} className="mx-auto mb-4 text-red-400" />
                      <p className="text-gray-600 mb-2">
                        There was an error analyzing this document
                      </p>
                      <p className="text-sm text-gray-500 mb-4">
                        The document was uploaded but analysis failed. Please try uploading again.
                      </p>
                    </div>
                  ) : (
                    // Show placeholder when no analysis exists
                    <div className="bg-white rounded-lg shadow-sm p-6 text-center">
                      <FileText size={32} className="mx-auto mb-4 text-gray-400" />
                      <p className="text-gray-600 mb-2">
                        Document uploaded successfully
                      </p>
                      <p className="text-sm text-gray-500">
                        Analysis is automatically generated when documents are uploaded. If you don't see an analysis, the document may still be processing or there may have been an error.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col">
            {/* Upload Section */}
            <div className="bg-white border-b px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Document Central</h1>
                  <p className="text-gray-600 mt-1">Upload and analyze your VA documents</p>
                </div>
                
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleFileUpload(file);
                        e.target.value = '';
                      }
                    }}
                    accept=".txt,.json,.pdf"
                    disabled={isUploading}
                  />
                  
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="primary"
                    size="md"
                    disabled={isUploading}
                    className="gap-2"
                  >
                    <Upload size={20} />
                    Upload Document
                  </Button>
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex items-center justify-center text-gray-500 p-6">
              <div className="text-center max-w-2xl">
                {isUploading ? (
                  <div className="bg-white rounded-lg shadow-sm p-8">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#0A2463] to-[#061A47] rounded-full flex items-center justify-center">
                        <Paperclip size={24} className="text-[#FFBA08] animate-pulse" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-lg font-semibold text-gray-900">Processing Document</h3>
                        <p className="text-sm text-gray-600">
                          {uploadProgress || 'Preparing your document...'}
                        </p>
                      </div>
                    </div>
                    
                    {/* Animated progress dots */}
                    <div className="flex items-center justify-center gap-2 mb-6">
                      <div className="w-3 h-3 bg-[#0A2463] rounded-full animate-pulse"></div>
                      <div className="w-3 h-3 bg-[#0A2463] rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-3 h-3 bg-[#0A2463] rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                    
                    {/* Progress bar */}
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div className="bg-gradient-to-r from-[#0A2463] to-[#FFBA08] h-3 rounded-full animate-pulse" style={{ width: '70%' }}></div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="w-24 h-24 bg-gradient-to-br from-[#0A2463] to-[#061A47] rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-xl">
                      <FileText size={48} className="text-[#FFBA08]" />
                    </div>
                    
                    <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-[#0A2463] to-[#061A47] bg-clip-text text-transparent">
                      Welcome to Document Central
                    </h2>
                    
                    <p className="text-gray-600 mb-8 text-lg leading-relaxed">
                      Upload your VA documents for instant AI analysis. ForwardOps AI will review your C&P exams, rating decisions, DBQs, and other documents to provide actionable insights.
                    </p>

                    {error && (
                      <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-md flex items-center gap-2 max-w-md mx-auto">
                        <AlertCircle size={20} />
                        <span className="text-sm">{error}</span>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                      <div className="bg-white p-6 rounded-lg border border-gray-200 hover:border-[#0A2463] transition-colors">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                          <FileText size={24} className="text-blue-600" />
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-2">C&P Exams</h3>
                        <p className="text-sm text-gray-600">Get detailed analysis of your Compensation & Pension examination results</p>
                      </div>
                      
                      <div className="bg-white p-6 rounded-lg border border-gray-200 hover:border-[#0A2463] transition-colors">
                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                          <MessageSquare size={24} className="text-green-600" />
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-2">Rating Decisions</h3>
                        <p className="text-sm text-gray-600">Understand your VA rating decisions and identify appeal opportunities</p>
                      </div>
                      
                      <div className="bg-white p-6 rounded-lg border border-gray-200 hover:border-[#0A2463] transition-colors">
                        <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                          <Upload size={24} className="text-purple-600" />
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-2">DBQ Forms</h3>
                        <p className="text-sm text-gray-600">Review Disability Benefits Questionnaires for completeness and accuracy</p>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-6 max-w-md mx-auto">
                      <h4 className="font-semibold text-gray-900 mb-2">Supported File Types</h4>
                      <p className="text-sm text-gray-600 mb-3">PDF, TXT, and JSON files up to 10MB</p>
                      <Button
                        onClick={() => fileInputRef.current?.click()}
                        variant="outline"
                        size="lg"
                        className="w-full gap-2"
                      >
                        <Upload size={20} />
                        Choose File to Upload
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Documents;