import React, { useState, useRef, useEffect } from 'react';
import { SendIcon, Paperclip } from 'lucide-react';
import Button from '../ui/Button';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import * as pdfjsLib from 'pdfjs-dist';

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  placeholder?: string;
}

const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isLoading = false,
  placeholder = 'Type your message...',
}) => {
  const [message, setMessage] = useState('');
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'error'>('idle');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuthStore();
  
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  }, [message]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;
    
    onSendMessage(message);
    setMessage('');
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

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
      setUploadError('User not authenticated');
      return;
    }

    let docData = null;
    let uploadedFilePath = null;
    setUploadStatus('uploading');
    setUploadError(null);

    try {
      // Validate file
      await validateFile(file);

      // Prepare file path with user ID as first segment
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

      setUploadStatus('processing');

      // Extract text content
      const textContent = await extractTextContent(file, publicUrl);

      // AUTOMATICALLY GENERATE COMPREHENSIVE ANALYSIS
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

      // Update document status with analysis
      await supabase
        .from('user_documents')
        .update({ 
          status: 'completed',
          analysis: analysisData.summary 
        })
        .eq('id', docData.id);

      // Trigger chat with document content
      window.dispatchEvent(new CustomEvent('startChatWithDocumentContent', { 
        detail: { 
          content: textContent,
          documentType,
          documentId: docData.id,
          analysis: analysisData.summary
        }
      }));

      setUploadStatus('idle');
    } catch (error: any) {
      console.error('Error processing document:', error);
      const errorMessage = error.message || 'An error occurred while processing the document';
      setUploadError(errorMessage);
      setUploadStatus('error');

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
  
  return (
    <div className="p-4">
      <div className="relative flex items-end gap-2 rounded-2xl border border-gray-300 bg-white p-3 shadow-sm focus-within:border-[#0A2463] focus-within:ring-1 focus-within:ring-[#0A2463]">
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
          disabled={uploadStatus === 'uploading' || uploadStatus === 'processing'}
        />
        
        <button 
          type="button" 
          onClick={() => fileInputRef.current?.click()}
          className={`
            text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200
            ${(uploadStatus === 'uploading' || uploadStatus === 'processing') ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          disabled={uploadStatus === 'uploading' || uploadStatus === 'processing'}
          aria-label="Attach file"
        >
          <Paperclip size={20} />
        </button>
        
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            uploadStatus === 'uploading' ? 'Uploading document...' :
            uploadStatus === 'processing' ? 'Processing document...' :
            placeholder
          }
          rows={1}
          className="flex-1 resize-none border-0 bg-transparent p-1 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-0 max-h-[200px]"
          disabled={isLoading || uploadStatus === 'uploading' || uploadStatus === 'processing'}
        />
        
        <Button
          type="submit"
          variant="primary"
          size="sm"
          isLoading={isLoading}
          disabled={!message.trim() || isLoading || uploadStatus === 'uploading' || uploadStatus === 'processing'}
          className="rounded-xl px-3 py-2 min-w-[44px] h-[44px] flex items-center justify-center"
          aria-label="Send message"
          onClick={handleSubmit}
        >
          <SendIcon size={18} />
        </Button>
      </div>
      
      {(uploadError || uploadStatus === 'uploading' || uploadStatus === 'processing') && (
        <div className="mt-2 px-3">
          {uploadError ? (
            <span className="text-sm text-red-600">{uploadError}</span>
          ) : uploadStatus === 'uploading' ? (
            <span className="text-sm text-blue-600">Uploading document...</span>
          ) : uploadStatus === 'processing' ? (
            <span className="text-sm text-blue-600">Analyzing document with ForwardOps AI...</span>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default ChatInput;