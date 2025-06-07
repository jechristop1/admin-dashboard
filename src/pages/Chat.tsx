import React from 'react';
import Layout from '../components/layout/Layout';
import ChatInterface from '../components/chat/ChatInterface';

const Chat: React.FC = () => {
  return (
    <Layout>
      <div className="h-full w-full mx-auto max-w-6xl">
        <ChatInterface />
      </div>
    </Layout>
  );
};

export default Chat;