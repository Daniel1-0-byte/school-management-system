'use client';

import React, { useState, useEffect } from 'react';
import { Send, MessageSquare, Search, Filter, Archive, Trash2, AlertCircle } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

interface Message {
  id: string;
  senderName: string;
  senderRole: string;
  subject: string;
  preview: string;
  timestamp: string;
  isRead: boolean;
  hasAttachment: boolean;
}

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      senderName: 'Priya Sharma',
      senderRole: 'Parent',
      subject: 'Regarding Aarjav\'s Performance',
      preview: 'Hi, I wanted to discuss Aarjav\'s recent math scores...',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      isRead: false,
      hasAttachment: false,
    },
    {
      id: '2',
      senderName: 'Mr. Desai',
      senderRole: 'Teacher',
      subject: 'Class Announcement',
      preview: 'Please find the assignment for next week attached...',
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      isRead: true,
      hasAttachment: true,
    },
  ]);

  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [reply, setReply] = useState('');
  const [search, setSearch] = useState('');

  const filteredMessages = messages.filter(
    (m) =>
      m.senderName.toLowerCase().includes(search.toLowerCase()) ||
      m.subject.toLowerCase().includes(search.toLowerCase())
  );

  const handleSendReply = () => {
    if (reply.trim() && selectedMessage) {
      // Handle sending reply
      setReply('');
    }
  };

  const handleArchive = (id: string) => {
    setMessages(messages.filter(m => m.id !== id));
  };

  const handleDelete = (id: string) => {
    setMessages(messages.filter(m => m.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Messages</h1>
          <p className="text-muted-foreground mt-1">Communication hub for parents, teachers, and staff</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Messages List */}
        <div className="lg:col-span-1 space-y-4">
          {/* Search and Filter */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search messages..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
              />
            </div>
            <button className="w-full flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors">
              <Filter className="w-4 h-4" />
              <span className="text-sm">Filters</span>
            </button>
          </div>

          {/* Messages Tabs */}
          <div className="flex gap-2 bg-muted p-1 rounded-lg">
            <button className="flex-1 px-3 py-2 bg-background text-foreground rounded-lg text-sm font-medium transition-colors">
              Inbox
            </button>
            <button className="flex-1 px-3 py-2 text-muted-foreground rounded-lg text-sm hover:text-foreground transition-colors">
              Sent
            </button>
          </div>

          {/* Message Items */}
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {filteredMessages.map((message) => (
              <button
                key={message.id}
                onClick={() => setSelectedMessage(message)}
                className={`w-full p-4 rounded-lg border transition-all text-left ${
                  selectedMessage?.id === message.id
                    ? 'bg-primary/10 border-primary'
                    : 'bg-card border-border hover:border-border'
                } ${message.isRead ? '' : 'border-l-4 border-l-primary'}`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="font-semibold text-sm text-foreground">{message.senderName}</div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(message.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{message.senderRole}</p>
                <p className="text-sm font-medium text-foreground truncate">{message.subject}</p>
                <p className="text-xs text-muted-foreground truncate mt-1">{message.preview}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Message Detail */}
        <div className="lg:col-span-2 bg-card border border-border rounded-lg overflow-hidden flex flex-col">
          {selectedMessage ? (
            <>
              {/* Header */}
              <div className="bg-muted/50 border-b border-border p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-foreground">{selectedMessage.subject}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      From <span className="font-semibold">{selectedMessage.senderName}</span> ({selectedMessage.senderRole})
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDateTime(selectedMessage.timestamp)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleArchive(selectedMessage.id)}
                      className="p-2 hover:bg-muted rounded-lg transition-colors"
                      title="Archive"
                    >
                      <Archive className="w-5 h-5 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => handleDelete(selectedMessage.id)}
                      className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-5 h-5 text-red-600" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 p-6 overflow-y-auto">
                <div className="prose prose-invert max-w-none">
                  <p className="text-foreground">
                    This is a placeholder for the message content. The full message body would be displayed here with proper formatting.
                  </p>
                </div>

                {selectedMessage.hasAttachment && (
                  <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-border">
                    <p className="text-xs font-semibold text-muted-foreground mb-3">ATTACHMENTS</p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 p-3 bg-background rounded-lg hover:bg-muted transition-colors cursor-pointer">
                        <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                          📄
                        </div>
                        <span className="text-sm font-medium text-foreground">assignment.pdf</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Reply Box */}
              <div className="border-t border-border p-6 space-y-3">
                <label className="text-sm font-medium text-foreground">Reply</label>
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Type your reply here..."
                  rows={4}
                  className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:border-primary text-foreground"
                />
                <div className="flex justify-end">
                  <button
                    onClick={handleSendReply}
                    disabled={!reply.trim()}
                    className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    <Send className="w-4 h-4" />
                    <span>Send Reply</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-6">
              <MessageSquare className="w-12 h-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">Select a message to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
